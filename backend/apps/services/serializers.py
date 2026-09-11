from rest_framework import serializers
from apps.core.document_serializer import DocumentSerializer
from .models import ServiceRequest


class ServiceRequestSerializer(DocumentSerializer):
    citizen_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'service_type', 'description', 'status',
            'department', 'department_name', 'citizen', 'citizen_name',
            'document_url', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['citizen', 'status', 'created_at', 'updated_at']

    def get_citizen_name(self, obj):
        try:
            return obj.citizen.full_name if obj.citizen else None
        except Exception:
            return None

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None

    def create(self, validated_data):
        citizen = validated_data.pop('citizen', None)
        # Resolve department id string → Department document
        department_val = validated_data.pop('department', None)
        department_obj = None
        if department_val:
            from apps.departments.models import Department
            # If it came in as a Department object already, use it directly
            if isinstance(department_val, Department):
                department_obj = department_val
            else:
                department_obj = Department.objects(id=str(department_val)).first()

        instance = ServiceRequest(citizen=citizen, department=department_obj, **validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        department_val = validated_data.pop('department', None)
        if department_val is not None:
            from apps.departments.models import Department
            if isinstance(department_val, Department):
                instance.department = department_val
            else:
                dept = Department.objects(id=str(department_val)).first()
                if dept:
                    instance.department = dept
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
