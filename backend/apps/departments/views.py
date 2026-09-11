from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from .models import Department, ComplaintCategory, Announcement
from .serializers import (
    DepartmentSerializer, DepartmentListSerializer,
    ComplaintCategorySerializer, AnnouncementSerializer,
)
from apps.accounts.permissions import IsSuperAdmin, IsDepartmentHeadOrAbove


def _get_or_404(qs, **kwargs):
    """MongoEngine-safe get — raises DRF NotFound instead of crashing."""
    try:
        obj = qs.filter(**kwargs).first()
    except Exception:
        obj = None
    if not obj:
        raise NotFound()
    return obj


class DepartmentViewSet(viewsets.ModelViewSet):
    lookup_field = 'id'
    serializer_class = DepartmentSerializer  # needed by drf-yasg for schema generation

    def get_object(self):
        pk = self.kwargs.get(self.lookup_field) or self.kwargs.get('pk')
        return _get_or_404(Department.objects, id=pk)

    def get_queryset(self):
        # MongoEngine: use .objects() not .objects.filter()
        return Department.objects(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return DepartmentListSerializer
        return DepartmentSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'officers', 'stats']:
            return [AllowAny()]
        return [IsSuperAdmin()]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(__raw__={
                '$or': [
                    {'name': {'$regex': search, '$options': 'i'}},
                    {'code': {'$regex': search, '$options': 'i'}},
                ]
            })
        return Response(DepartmentListSerializer(list(qs), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = DepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(DepartmentSerializer(instance).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = DepartmentSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(DepartmentSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def officers(self, request, **kwargs):
        from apps.accounts.models import OfficerProfile
        from apps.accounts.serializers import OfficerProfileSerializer
        department = self.get_object()
        officers = list(OfficerProfile.objects(department=department))
        return Response(OfficerProfileSerializer(officers, many=True).data)

    @action(detail=True, methods=['get'])
    def stats(self, request, **kwargs):
        from apps.complaints.models import Complaint
        from apps.accounts.models import OfficerProfile
        department = self.get_object()
        total = Complaint.objects(department=department).count()
        resolved = Complaint.objects(department=department, status__in=['resolved', 'closed']).count()
        # pending = not resolved/closed/rejected
        pending = Complaint.objects(
            department=department,
            status__nin=['resolved', 'closed', 'rejected']
        ).count()
        officer_count = OfficerProfile.objects(department=department).count()
        return Response({
            'total_complaints': total,
            'resolved': resolved,
            'pending': pending,
            'officers': officer_count,
        })


class ComplaintCategoryViewSet(viewsets.ModelViewSet):
    lookup_field = 'id'
    serializer_class = ComplaintCategorySerializer

    def get_object(self):
        pk = self.kwargs.get(self.lookup_field) or self.kwargs.get('pk')
        return _get_or_404(ComplaintCategory.objects, id=pk)

    def get_queryset(self):
        return ComplaintCategory.objects(is_active=True)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsSuperAdmin()]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        dept = request.query_params.get('department', '').strip()
        if dept:
            try:
                dept_obj = Department.objects(id=dept).first()
                if dept_obj:
                    qs = qs.filter(department=dept_obj)
            except Exception:
                pass
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(__raw__={
                '$or': [
                    {'name': {'$regex': search, '$options': 'i'}},
                    {'slug': {'$regex': search, '$options': 'i'}},
                ]
            })
        return Response(ComplaintCategorySerializer(list(qs), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = ComplaintCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(ComplaintCategorySerializer(instance).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ComplaintCategorySerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(ComplaintCategorySerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=204)


class AnnouncementViewSet(viewsets.ModelViewSet):
    lookup_field = 'id'
    serializer_class = AnnouncementSerializer

    def get_object(self):
        pk = self.kwargs.get(self.lookup_field) or self.kwargs.get('pk')
        return _get_or_404(Announcement.objects, id=pk)

    def get_queryset(self):
        return Announcement.objects(is_active=True)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsDepartmentHeadOrAbove()]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        dept = request.query_params.get('department', '').strip()
        if dept:
            try:
                dept_obj = Department.objects(id=dept).first()
                if dept_obj:
                    qs = qs.filter(department=dept_obj)
            except Exception:
                pass
        return Response(AnnouncementSerializer(list(qs), many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = AnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user)
        return Response(AnnouncementSerializer(instance).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = AnnouncementSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(AnnouncementSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=204)
