from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.conf import settings

from .models import (
    Complaint, ComplaintImage, ComplaintVideo,
    ComplaintTimeline, ComplaintSupport, Feedback, AuditLog
)
from .serializers import (
    ComplaintListSerializer, ComplaintDetailSerializer, ComplaintCreateSerializer,
    ComplaintUpdateSerializer, FeedbackSerializer, AuditLogSerializer,
)
from .ml_predictions import get_complaint_prediction
from apps.accounts.permissions import IsCitizen, IsOfficerOrAbove, IsSuperAdmin, IsDepartmentHeadOrAbove


def _timeline(complaint, status_val, title, description, user):
    try:
        ComplaintTimeline(
            complaint=complaint, status=status_val,
            title=title, description=description, updated_by=user
        ).save()
    except Exception:
        pass


def _audit(complaint, action, old_val, new_val, user):
    try:
        AuditLog(
            complaint=complaint, action=action,
            old_value=str(old_val), new_value=str(new_val), performed_by=user
        ).save()
    except Exception:
        pass


def _paginate_mongo_qs(qs, request):
    """
    Manual pagination for MongoEngine querysets.
    DRF's default paginator calls Django ORM methods that don't exist on MongoEngine.
    Returns (results_list, count, page, page_size).
    """
    try:
        page = int(request.query_params.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = int(request.query_params.get('page_size', 10))
    except (ValueError, TypeError):
        page_size = 10
    page_size = min(page_size, 100)

    # Apply search filter manually for MongoEngine
    search = request.query_params.get('search', '').strip()
    if search:
        import re
        pattern = re.compile(search, re.IGNORECASE)
        qs = qs.filter(__raw__={
            '$or': [
                {'title': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'complaint_id': {'$regex': search, '$options': 'i'}},
                {'address': {'$regex': search, '$options': 'i'}},
                {'area': {'$regex': search, '$options': 'i'}},
                {'city': {'$regex': search, '$options': 'i'}},
            ]
        })

    # Apply field filters
    for field in ['status', 'priority']:
        val = request.query_params.get(field, '').strip()
        if val:
            qs = qs.filter(**{field: val})

    # Department filter — resolve id to object
    dept_id = request.query_params.get('department', '').strip()
    if dept_id:
        try:
            from apps.departments.models import Department
            dept = Department.objects(id=dept_id).first()
            if dept:
                qs = qs.filter(department=dept)
        except Exception:
            pass

    # Apply ordering
    ordering = request.query_params.get('ordering', '-submitted_at')
    if ordering:
        qs = qs.order_by(ordering)

    count = qs.count()
    offset = (page - 1) * page_size
    items = list(qs.skip(offset).limit(page_size))
    return items, count, page, page_size


def _auto_assign(complaint):
    """
    Auto-assign complaint to the least-busy available officer
    in the same department and city.
    """
    try:
        from apps.accounts.models import OfficerProfile
        from django.utils import timezone

        if not complaint.department:
            return

        city = (complaint.city or '').strip()

        # Try dept + city first
        if city:
            candidates = list(OfficerProfile.objects(
                department=complaint.department,
                is_available=True,
                city__iexact=city,
            ).limit(20))
        else:
            candidates = []

        # Fallback: same dept, any city (limit to 20 for performance)
        if not candidates:
            candidates = list(OfficerProfile.objects(
                department=complaint.department,
                is_available=True,
            ).limit(20))

        if not candidates:
            return

        # Pick least-busy officer — count only their pending complaints
        # Use a fast count query per candidate
        from apps.complaints.models import Complaint as C

        best = candidates[0]
        best_count = C.objects(
            assigned_officer=best.user,
            status__nin=['resolved', 'closed', 'rejected'],
        ).count()

        for op in candidates[1:]:
            count = C.objects(
                assigned_officer=op.user,
                status__nin=['resolved', 'closed', 'rejected'],
            ).count()
            if count < best_count:
                best = op
                best_count = count
                if best_count == 0:
                    break  # Can't do better than 0

        # Assign
        complaint.assigned_officer = best.user
        complaint.status = 'assigned'
        complaint.assigned_at = timezone.now()
        complaint.save()

        try:
            dept_name = best.department.name if best.department else ''
        except Exception:
            dept_name = ''

        _timeline(
            complaint, 'assigned',
            f'Auto-assigned to {best.user.full_name}',
            f'Automatically assigned to officer in {dept_name}'
            + (f', {best.city}' if best.city else ''),
            complaint.citizen,
        )
        _audit(complaint, 'AUTO_ASSIGN', 'submitted', best.user.full_name, complaint.citizen)

        try:
            from apps.notifications.tasks import send_complaint_notification
            send_complaint_notification.delay(str(complaint.id), 'assigned')
        except Exception:
            pass

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning('Auto-assign failed: %s', e)


class ComplaintViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            obj = Complaint.objects(id=pk).first()
        except Exception:
            obj = None
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Complaint not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        user = self.request.user
        if user.role == 'citizen':
            return Complaint.objects(citizen=user)
        elif user.role == 'officer':
            return Complaint.objects(assigned_officer=user)
        elif user.role == 'department_head':
            try:
                from apps.accounts.models import OfficerProfile
                profile = OfficerProfile.objects(user=user).first()
                if profile and profile.department:
                    return Complaint.objects(department=profile.department)
            except Exception:
                pass
            return Complaint.objects.none()
        return Complaint.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ComplaintCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ComplaintUpdateSerializer
        if self.action == 'retrieve':
            return ComplaintDetailSerializer
        return ComplaintListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsCitizen()]
        if self.action in ['update', 'partial_update']:
            return [IsOfficerOrAbove()]
        return [IsAuthenticated()]

    # Override list — DRF default pagination breaks on MongoEngine querysets
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        items, count, page, page_size = _paginate_mongo_qs(qs, request)
        serializer = ComplaintListSerializer(items, many=True, context={'request': request})
        return Response({
            'count': count,
            'page': page,
            'page_size': page_size,
            'total_pages': (count + page_size - 1) // page_size if page_size else 1,
            'results': serializer.data,
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()

        prediction = get_complaint_prediction(
            complaint.title,
            complaint.description,
            category=complaint.category,
            priority=complaint.priority,
            is_emergency=complaint.is_emergency,
        )
        _timeline(
            complaint, 'submitted', 'Complaint Submitted',
            f'Complaint "{complaint.title}" submitted. '
            f'{prediction["predicted_outcome_label"]}. '
            f'Estimated resolution: {prediction["estimated_resolution_hours"]} hours.',
            request.user,
        )

        # Auto-assign in background thread — never blocks the HTTP response
        import threading
        complaint_id_str = str(complaint.id)
        def _bg_assign():
            try:
                from apps.complaints.models import Complaint as C
                c = C.objects(id=complaint_id_str).first()
                if c:
                    _auto_assign(c)
            except Exception:
                pass
        threading.Thread(target=_bg_assign, daemon=True).start()

        # Save ML prediction fields to the complaint document
        try:
            complaint.ml_predicted_category = prediction.get('predicted_category', '')
            complaint.ml_confidence         = float(prediction.get('confidence', 0))
            complaint.ml_outcome            = prediction.get('outcome', '')
            complaint.ml_outcome_label      = prediction.get('outcome_label', '')
            complaint.ml_estimated_hours    = int(prediction.get('estimated_resolution_hours', 0))
            complaint.ml_approval_chance    = int(prediction.get('approval_chance_percent', 0))
            complaint.save()
        except Exception:
            pass

        # Small wait so background assign likely finishes before response
        import time
        time.sleep(0.5)

        # Reload from DB to get updated status/officer after auto-assign
        try:
            complaint = Complaint.objects(id=str(complaint.id)).first() or complaint
        except Exception:
            pass

        try:
            from apps.notifications.tasks import send_complaint_notification
            send_complaint_notification.delay(str(complaint.id), 'submitted')
        except Exception:
            pass

        data = ComplaintDetailSerializer(complaint, context={'request': request}).data
        data['prediction'] = prediction
        return Response(data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.view_count = (instance.view_count or 0) + 1
        instance.save()
        return Response(ComplaintDetailSerializer(instance, context={'request': request}).data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        old_priority = instance.priority

        serializer = ComplaintUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()

        if old_status != complaint.status:
            _audit(complaint, 'STATUS_CHANGE', old_status, complaint.status, request.user)
            _timeline(
                complaint, complaint.status,
                f'Status updated to {complaint.status.replace("_", " ").title()}',
                request.data.get('officer_remarks', ''),
                request.user,
            )
            if complaint.status == 'resolved':
                complaint.resolved_at = timezone.now()
            elif complaint.status == 'assigned':
                complaint.assigned_at = timezone.now()
            elif complaint.status == 'closed':
                complaint.closed_at = timezone.now()
            complaint.save()

            try:
                from apps.notifications.tasks import send_complaint_notification
                send_complaint_notification.delay(str(complaint.id), complaint.status)
            except Exception:
                pass

        if old_priority != complaint.priority:
            _audit(complaint, 'PRIORITY_CHANGE', old_priority, complaint.priority, request.user)

        return Response(ComplaintDetailSerializer(complaint, context={'request': request}).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsCitizen])
    def support(self, request, pk=None):
        complaint = self.get_object()
        if str(complaint.citizen.id) == str(request.user.id):
            return Response(
                {'error': 'You cannot support your own complaint.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = ComplaintSupport.objects(complaint=complaint, citizen=request.user).first()
        if existing:
            existing.delete()
            complaint.support_count = ComplaintSupport.objects(complaint=complaint).count()
            complaint.save()
            return Response({'message': 'Support removed', 'support_count': complaint.support_count, 'supported': False})

        ComplaintSupport(complaint=complaint, citizen=request.user).save()
        complaint.support_count = ComplaintSupport.objects(complaint=complaint).count()

        threshold = getattr(settings, 'SUPPORT_THRESHOLD', 10)
        if complaint.support_count >= threshold * 3 and complaint.priority != 'emergency':
            complaint.priority = 'emergency'
        elif complaint.support_count >= threshold * 2 and complaint.priority == 'low':
            complaint.priority = 'high'
        elif complaint.support_count >= threshold and complaint.priority == 'low':
            complaint.priority = 'medium'
        complaint.save()

        return Response({'message': 'Support added', 'support_count': complaint.support_count, 'supported': True})

    @action(detail=True, methods=['post'], permission_classes=[IsCitizen])
    def reopen(self, request, pk=None):
        complaint = self.get_object()
        if str(complaint.citizen.id) != str(request.user.id):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        if complaint.status not in ['resolved', 'closed']:
            return Response({'error': 'Only resolved or closed complaints can be reopened.'}, status=status.HTTP_400_BAD_REQUEST)
        old_status = complaint.status
        complaint.status = 'reopened'
        complaint.save()
        _timeline(complaint, 'reopened', 'Complaint Reopened', request.data.get('reason', ''), request.user)
        _audit(complaint, 'REOPEN', old_status, 'reopened', request.user)
        return Response({'message': 'Complaint reopened successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsOfficerOrAbove])
    def assign(self, request, pk=None):
        complaint = self.get_object()
        officer_id = request.data.get('officer_id')
        from apps.accounts.models import User
        officer = User.objects(id=officer_id, role__in=['officer', 'department_head']).first()
        if not officer:
            return Response({'error': 'Officer not found'}, status=status.HTTP_404_NOT_FOUND)

        old_officer = complaint.assigned_officer
        complaint.assigned_officer = officer
        complaint.status = 'assigned'
        complaint.assigned_at = timezone.now()
        complaint.save()

        _timeline(complaint, 'assigned', f'Assigned to {officer.full_name}', request.data.get('remarks', ''), request.user)
        _audit(complaint, 'ASSIGN', str(old_officer), str(officer), request.user)

        try:
            from apps.notifications.tasks import send_complaint_notification
            send_complaint_notification.delay(str(complaint.id), 'assigned')
        except Exception:
            pass
        return Response({'message': f'Complaint assigned to {officer.full_name}'})

    @action(detail=True, methods=['post'], permission_classes=[IsOfficerOrAbove])
    def upload_completion_photos(self, request, pk=None):
        complaint = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'error': 'No images provided'}, status=status.HTTP_400_BAD_REQUEST)
        for img in images:
            ComplaintImage(complaint=complaint, image_url=img.name, uploaded_by=request.user, is_completion_photo=True, caption=request.data.get('caption', 'Completion photo')).save()
        return Response({'message': f'{len(images)} photo(s) uploaded'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def public_feed(self, request):
        qs = Complaint.objects(is_anonymous=False, status__ne='rejected').order_by('-submitted_at').limit(50)
        return Response(ComplaintListSerializer(list(qs), many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def nearby(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response({'error': 'lat and lng are required'}, status=status.HTTP_400_BAD_REQUEST)
        lat, lng = float(lat), float(lng)
        radius = float(request.query_params.get('radius', 5))
        lat_range = radius / 111
        lng_range = radius / (111 * (abs(lat) or 1))

        qs = Complaint.objects(
            latitude__gte=lat - lat_range,
            latitude__lte=lat + lat_range,
            longitude__gte=lng - lng_range,
            longitude__lte=lng + lng_range,
            status__ne='rejected',
        ).order_by('-submitted_at').limit(100)
        return Response(ComplaintListSerializer(list(qs), many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_stats(self, request):
        user = request.user
        if user.role == 'citizen':
            qs = Complaint.objects(citizen=user)
            return Response({
                'total': qs.count(),
                'submitted': qs.filter(status='submitted').count(),
                'in_progress': qs.filter(status__in=['assigned', 'accepted', 'work_started', 'in_progress']).count(),
                'resolved': qs.filter(status='resolved').count(),
                'closed': qs.filter(status='closed').count(),
                'rejected': qs.filter(status='rejected').count(),
            })
        elif user.role == 'officer':
            qs = Complaint.objects(assigned_officer=user)
            resolved = list(Complaint.objects(assigned_officer=user, status__in=['resolved', 'closed'], resolved_at__ne=None).only('submitted_at', 'resolved_at'))
            avg_hours = None
            if resolved:
                total = sum((c.resolved_at - c.submitted_at).total_seconds() / 3600 for c in resolved if c.resolved_at and c.submitted_at)
                avg_hours = round(total / len(resolved), 1)
            return Response({
                'total_assigned': qs.count(),
                'pending': qs.filter(status__nin=['resolved', 'closed', 'rejected']).count(),
                'resolved': qs.filter(status__in=['resolved', 'closed']).count(),
                'avg_resolution_hours': avg_hours,
            })
        return Response({})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def find_duplicates(self, request):
        """
        Check if a complaint being typed is similar to existing ones.
        Body: { title, description, city (optional) }
        Returns: { duplicates: [...], has_duplicates: bool }
        """
        from .duplicate_detector import find_similar_complaints

        title       = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        city        = request.data.get('city', '').strip()

        if not title and not description:
            return Response({'duplicates': [], 'has_duplicates': False})

        similar = find_similar_complaints(
            title=title,
            description=description,
            city=city,
        )
        return Response({
            'duplicates':    similar,
            'has_duplicates': len(similar) > 0,
            'count':          len(similar),
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def ml_predict(self, request):
        """
        Predict category, SLA, and outcome for a complaint text.
        Body: { title, description, category (optional slug), priority, is_emergency }
        """
        title       = request.data.get('title', '')
        description = request.data.get('description', '')
        category    = request.data.get('category', None)
        priority    = request.data.get('priority', 'medium')
        is_emergency = bool(request.data.get('is_emergency', False))

        if not title and not description:
            return Response({'error': 'title or description required'}, status=400)

        result = get_complaint_prediction(
            title=title,
            description=description,
            category=category,
            priority=priority,
            is_emergency=is_emergency,
        )
        return Response(result)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ml_retrain(self, request):
        """Force re-train the ML model from current MongoDB complaints. Admin only."""
        from apps.accounts.permissions import IsSuperAdmin
        if not IsSuperAdmin().has_permission(request, self):
            return Response({'error': 'Admin only'}, status=403)
        from .ml_predictions import retrain_model
        result = retrain_model()
        return Response(result, status=200 if result['success'] else 500)


class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'citizen':
            return Feedback.objects(citizen=user)
        return Feedback.objects.all()

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response(FeedbackSerializer(list(qs), many=True, context={'request': request}).data)

    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = Feedback.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Feedback not found.')
        return obj

    def perform_create(self, serializer):
        complaint_id = self.request.data.get('complaint')
        complaint = Complaint.objects(id=complaint_id, citizen=self.request.user).first()
        if not complaint:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only rate your own complaints.')
        if complaint.status not in ['resolved', 'closed']:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('You can only rate resolved or closed complaints.')
        serializer.save(citizen=self.request.user, complaint=complaint)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    ordering_fields = ['created_at']

    def get_queryset(self):
        return AuditLog.objects.all()

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset().order_by('-created_at')
        return Response(AuditLogSerializer(list(qs[:200]), many=True, context={'request': request}).data)

    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = AuditLog.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Audit log not found.')
        return obj
