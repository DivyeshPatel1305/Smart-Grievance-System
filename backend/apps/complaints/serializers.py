from rest_framework import serializers
from django.utils import timezone
from apps.core.document_serializer import DocumentSerializer
from django.conf import settings
from .models import (
    Complaint, ComplaintImage, ComplaintVideo,
    ComplaintTimeline, ComplaintSupport, Feedback, AuditLog
)
from apps.departments.serializers import ComplaintCategorySerializer, DepartmentListSerializer
from .ml_predictions import get_complaint_prediction


class ComplaintImageSerializer(DocumentSerializer):
    class Meta:
        model = ComplaintImage
        fields = ['id', 'image_url', 'caption', 'is_completion_photo', 'uploaded_at']


class ComplaintVideoSerializer(DocumentSerializer):
    class Meta:
        model = ComplaintVideo
        fields = ['id', 'video_url', 'caption', 'uploaded_at']


class ComplaintTimelineSerializer(DocumentSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintTimeline
        fields = ['id', 'status', 'title', 'description', 'updated_by_name', 'created_at']

    def get_updated_by_name(self, obj):
        try:
            return obj.updated_by.full_name if obj.updated_by else None
        except Exception:
            return None


class FeedbackSerializer(DocumentSerializer):
    citizen_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'complaint', 'citizen', 'citizen_name', 'rating',
                  'comment', 'suggestions', 'officer_response', 'created_at']
        read_only_fields = ['citizen', 'created_at']

    def get_citizen_name(self, obj):
        try:
            return obj.citizen.full_name if obj.citizen else None
        except Exception:
            return None

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def create(self, validated_data):
        citizen = validated_data.pop('citizen', None)
        complaint = validated_data.pop('complaint', None)
        instance = Feedback(citizen=citizen, complaint=complaint, **validated_data)
        instance.save()
        return instance


class ComplaintListSerializer(DocumentSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    citizen_name = serializers.SerializerMethodField()
    officer_name = serializers.SerializerMethodField()
    officer_email = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_id', 'title', 'status', 'priority', 'is_emergency',
            'category_name', 'category_color', 'department_name', 'citizen_name',
            'officer_name', 'officer_email', 'address', 'area', 'city', 'ward_number',
            'department_id', 'latitude', 'longitude', 'support_count', 'view_count',
            'submitted_at', 'updated_at', 'image_count',
        ]

    def get_category_name(self, obj):
        try:
            return obj.category.name if obj.category else None
        except Exception:
            return None

    def get_category_color(self, obj):
        try:
            return obj.category.color if obj.category else None
        except Exception:
            return None

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None

    def get_department_id(self, obj):
        try:
            return str(obj.department.id) if obj.department else None
        except Exception:
            return None

    def get_citizen_name(self, obj):
        if obj.is_anonymous:
            return 'Anonymous'
        try:
            return obj.citizen.full_name if obj.citizen else None
        except Exception:
            return None

    def _get_officer(self, obj):
        """
        Safely dereference assigned_officer.
        DocumentSerializer.to_representation converts ReferenceFields to id strings
        BEFORE SerializerMethodField methods are called on some code paths.
        We use the raw pk from the document's _data dict to avoid this.
        """
        try:
            # Try direct access first (works when already dereferenced)
            officer = obj.assigned_officer
            if officer is None:
                return None
            if hasattr(officer, 'email'):
                return officer
            # Fallback: fetch by id from _data dict (raw pk before dereference)
            from apps.accounts.models import User
            raw_id = None
            try:
                raw_id = obj._data.get('assigned_officer')
            except Exception:
                pass
            if raw_id:
                pk = str(raw_id.id) if hasattr(raw_id, 'id') else str(raw_id)
                return User.objects(id=pk).first()
            return None
        except Exception:
            return None

    def get_officer_name(self, obj):
        try:
            officer = self._get_officer(obj)
            return officer.full_name if officer else None
        except Exception:
            return None

    def get_officer_email(self, obj):
        try:
            officer = self._get_officer(obj)
            return officer.email if officer else None
        except Exception:
            return None

    def get_image_count(self, obj):
        try:
            return ComplaintImage.objects(complaint=obj).count()
        except Exception:
            return 0


class ComplaintDetailSerializer(DocumentSerializer):
    category = ComplaintCategorySerializer(read_only=True)
    department = DepartmentListSerializer(read_only=True)
    citizen_name = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()
    officer_name = serializers.SerializerMethodField()
    officer_id = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    has_supported = serializers.SerializerMethodField()
    resolution_time_hours = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_id', 'title', 'description', 'status', 'priority',
            'is_emergency', 'is_anonymous', 'category', 'department',
            'citizen_name', 'citizen_phone', 'officer_name', 'officer_id',
            'address', 'ward_number', 'area', 'city', 'pincode',
            'latitude', 'longitude',
            'support_count', 'view_count', 'is_duplicate',
            'officer_remarks', 'rejection_reason',
            'ml_predicted_category', 'ml_confidence', 'ml_outcome',
            'ml_outcome_label', 'ml_estimated_hours', 'ml_approval_chance',
            'submitted_at', 'assigned_at', 'resolved_at', 'closed_at',
            'expected_resolution', 'updated_at',
            'images', 'videos', 'timeline', 'feedback',
            'has_supported', 'resolution_time_hours',
        ]

    def get_citizen_name(self, obj):
        if obj.is_anonymous:
            return 'Anonymous'
        try:
            return obj.citizen.full_name if obj.citizen else None
        except Exception:
            return None

    def get_citizen_phone(self, obj):
        if obj.is_anonymous:
            return None
        try:
            return obj.citizen.phone if obj.citizen else None
        except Exception:
            return None

    def get_officer_name(self, obj):
        try:
            return obj.assigned_officer.full_name if obj.assigned_officer else None
        except Exception:
            return None

    def get_officer_id(self, obj):
        try:
            return str(obj.assigned_officer.id) if obj.assigned_officer else None
        except Exception:
            return None

    def get_images(self, obj):
        return ComplaintImageSerializer(ComplaintImage.objects(complaint=obj), many=True).data

    def get_videos(self, obj):
        return ComplaintVideoSerializer(ComplaintVideo.objects(complaint=obj), many=True).data

    def get_timeline(self, obj):
        return ComplaintTimelineSerializer(
            ComplaintTimeline.objects(complaint=obj).order_by('created_at'), many=True
        ).data

    def get_feedback(self, obj):
        fb = Feedback.objects(complaint=obj).first()
        return FeedbackSerializer(fb).data if fb else None

    def get_has_supported(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ComplaintSupport.objects(complaint=obj, citizen=request.user).count() > 0
        return False

    def get_resolution_time_hours(self, obj):
        try:
            if obj.resolved_at and obj.submitted_at:
                delta = obj.resolved_at - obj.submitted_at
                return round(delta.total_seconds() / 3600, 2)
        except Exception:
            pass
        return None


class ComplaintCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=300)
    description = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'emergency'], default='medium'
    )
    is_emergency = serializers.BooleanField(default=False)
    is_anonymous = serializers.BooleanField(default=False)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    ward_number = serializers.CharField(required=False, allow_blank=True, default='')
    area = serializers.CharField(required=False, allow_blank=True, default='')
    city = serializers.CharField(required=False, allow_blank=True, default='')
    pincode = serializers.CharField(required=False, allow_blank=True, default='')
    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )
    videos = serializers.ListField(
        child=serializers.FileField(), write_only=True, required=False
    )

    def validate_images(self, images):
        allowed = getattr(settings, 'ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp'])
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)
        for img in images:
            if img.content_type not in allowed:
                raise serializers.ValidationError(f'Invalid image type: {img.content_type}')
            if img.size > max_size:
                raise serializers.ValidationError('Image size exceeds 10MB limit.')
        return images

    def validate_videos(self, videos):
        allowed = getattr(settings, 'ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/avi', 'video/mov'])
        for vid in videos:
            if vid.content_type not in allowed:
                raise serializers.ValidationError(f'Invalid video type: {vid.content_type}')
            if vid.size > 50 * 1024 * 1024:
                raise serializers.ValidationError('Video size exceeds 50MB limit.')
        return videos

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        videos = validated_data.pop('videos', [])

        # citizen comes from context['request'].user — never from serializer.save(citizen=...)
        request = self.context.get('request')
        citizen = getattr(request, 'user', None)

        # Resolve category slug/id → ComplaintCategory document
        category_value = validated_data.pop('category', None)
        category_obj = None
        if category_value:
            from apps.departments.models import ComplaintCategory
            category_obj = ComplaintCategory.objects(slug=category_value).first()
            if not category_obj:
                try:
                    category_obj = ComplaintCategory.objects(id=category_value).first()
                except Exception:
                    pass

        complaint = Complaint(
            citizen=citizen,
            category=category_obj,
            **validated_data,
        )
        complaint.save()

        # Set department from category
        if category_obj and category_obj.department:
            complaint.department = category_obj.department
            complaint.save()

        for img in images:
            ComplaintImage(
                complaint=complaint,
                image_url=getattr(img, 'name', str(img)),
                uploaded_by=citizen,
            ).save()

        for vid in videos:
            ComplaintVideo(
                complaint=complaint,
                video_url=getattr(vid, 'name', str(vid)),
                uploaded_by=citizen,
            ).save()

        self.instance = complaint
        return complaint


class ComplaintUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        'submitted', 'verified', 'assigned', 'accepted', 'work_started',
        'in_progress', 'resolved', 'citizen_verification', 'closed',
        'rejected', 'reopened',
    ], required=False)
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'emergency'], required=False
    )
    officer_remarks = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    assigned_officer = serializers.CharField(required=False)

    def update(self, instance, validated_data):
        officer_id = validated_data.pop('assigned_officer', None)
        if officer_id:
            from apps.accounts.models import User
            officer = User.objects(id=officer_id).first()
            if officer:
                instance.assigned_officer = officer

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_at = timezone.now()
        instance.save()
        return instance


class AuditLogSerializer(DocumentSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'complaint', 'action', 'old_value', 'new_value',
                  'performed_by_name', 'created_at']

    def get_performed_by_name(self, obj):
        try:
            return obj.performed_by.full_name if obj.performed_by else None
        except Exception:
            return None
