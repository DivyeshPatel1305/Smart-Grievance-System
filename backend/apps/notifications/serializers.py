from rest_framework import serializers
from apps.core.document_serializer import DocumentSerializer
from .models import Notification


class NotificationSerializer(DocumentSerializer):
    sender_name = serializers.SerializerMethodField()
    complaint_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'complaint', 'complaint_id', 'sender_name',
            'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['created_at', 'read_at']

    def get_sender_name(self, obj):
        try:
            return obj.sender.full_name if obj.sender else None
        except Exception:
            return None

    def get_complaint_id(self, obj):
        try:
            return obj.complaint.complaint_id if obj.complaint else None
        except Exception:
            return None
