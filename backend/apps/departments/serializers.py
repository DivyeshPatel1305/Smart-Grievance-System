from rest_framework import serializers
from apps.core.document_serializer import DocumentSerializer
from .models import Department, ComplaintCategory, Announcement


class ComplaintCategorySerializer(DocumentSerializer):
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color',
                  'is_active', 'sla_hours', 'department', 'department_name', 'created_at']

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None

    def _resolve_department(self, dept_val):
        if not dept_val:
            return None
        if hasattr(dept_val, 'id'):
            return dept_val
        try:
            return Department.objects(id=str(dept_val)).first()
        except Exception:
            return None

    def create(self, validated_data):
        dept_obj = self._resolve_department(validated_data.pop('department', None))
        instance = ComplaintCategory(department=dept_obj, **validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        dept_val = validated_data.pop('department', None)
        if dept_val is not None:
            instance.department = self._resolve_department(dept_val)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class DepartmentListSerializer(DocumentSerializer):
    head_name = serializers.SerializerMethodField()
    officer_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head_name',
                  'officer_count', 'is_active', 'email', 'phone']

    def get_head_name(self, obj):
        try:
            return obj.head.full_name if obj.head else None
        except Exception:
            return None

    def get_officer_count(self, obj):
        try:
            from apps.accounts.models import OfficerProfile
            return OfficerProfile.objects(department=obj).count()
        except Exception:
            return 0


class DepartmentSerializer(DocumentSerializer):
    head_name = serializers.SerializerMethodField()
    officer_count = serializers.SerializerMethodField()
    total_complaints = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head_name', 'officer_count',
                  'total_complaints', 'categories', 'is_active', 'email', 'phone',
                  'address', 'created_at', 'updated_at']

    def get_head_name(self, obj):
        try:
            return obj.head.full_name if obj.head else None
        except Exception:
            return None

    def get_officer_count(self, obj):
        try:
            from apps.accounts.models import OfficerProfile
            return OfficerProfile.objects(department=obj).count()
        except Exception:
            return 0

    def get_total_complaints(self, obj):
        try:
            from apps.complaints.models import Complaint
            return Complaint.objects(department=obj).count()
        except Exception:
            return 0

    def get_categories(self, obj):
        cats = ComplaintCategory.objects(department=obj, is_active=True)
        return ComplaintCategorySerializer(cats, many=True).data

    def create(self, validated_data):
        # read_only computed fields must not be passed to constructor
        for f in ['head_name', 'officer_count', 'total_complaints', 'categories']:
            validated_data.pop(f, None)
        instance = Department(**validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for f in ['head_name', 'officer_count', 'total_complaints', 'categories']:
            validated_data.pop(f, None)
        from django.utils import timezone
        validated_data['updated_at'] = timezone.now()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AnnouncementSerializer(DocumentSerializer):
    created_by_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'department', 'department_name',
                  'is_active', 'created_by', 'created_by_name', 'created_at', 'expires_at']
        read_only_fields = ['created_by']

    def get_created_by_name(self, obj):
        try:
            return obj.created_by.full_name if obj.created_by else None
        except Exception:
            return None

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None
