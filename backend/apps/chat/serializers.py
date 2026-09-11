from rest_framework import serializers
from apps.core.document_serializer import DocumentSerializer
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(DocumentSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    # Expose sender id as sender_id so frontend can use the same field
    # name regardless of whether the message came from REST or WebSocket
    sender_id = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_id', 'sender_name', 'sender_role',
                  'message', 'image_url', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['sender', 'is_read', 'read_at', 'created_at']

    def get_sender_id(self, obj):
        try:
            return str(obj.sender.id) if obj.sender else None
        except Exception:
            return None

    def get_sender_name(self, obj):
        try:
            return obj.sender.full_name if obj.sender else None
        except Exception:
            return None

    def get_sender_role(self, obj):
        try:
            return obj.sender.role if obj.sender else None
        except Exception:
            return None

    def create(self, validated_data):
        sender = validated_data.pop('sender', None)
        room   = validated_data.pop('room', None)
        instance = ChatMessage(sender=sender, room=room, **validated_data)
        instance.save()
        return instance


class ChatRoomSerializer(DocumentSerializer):
    complaint_id = serializers.SerializerMethodField()
    complaint_title = serializers.SerializerMethodField()
    citizen_name = serializers.SerializerMethodField()
    officer_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'complaint', 'complaint_id', 'complaint_title',
                  'citizen_name', 'officer_name', 'is_active',
                  'last_message', 'unread_count', 'created_at', 'updated_at']

    def get_complaint_id(self, obj):
        try:
            return obj.complaint.complaint_id if obj.complaint else None
        except Exception:
            return None

    def get_complaint_title(self, obj):
        try:
            return obj.complaint.title if obj.complaint else None
        except Exception:
            return None

    def get_citizen_name(self, obj):
        try:
            return obj.citizen.full_name if obj.citizen else None
        except Exception:
            return None

    def get_officer_name(self, obj):
        try:
            return obj.officer.full_name if obj.officer else None
        except Exception:
            return None

    def get_last_message(self, obj):
        try:
            last = ChatMessage.objects(room=obj).order_by('-created_at').first()
            if last:
                return {
                    'message': last.message,
                    'created_at': str(last.created_at),
                    'sender': last.sender.full_name,
                }
        except Exception:
            pass
        return None

    def get_unread_count(self, obj):
        try:
            request = self.context.get('request')
            if request:
                count = 0
                for msg in ChatMessage.objects(room=obj, is_read=False):
                    if str(msg.sender.id) != str(request.user.id):
                        count += 1
                return count
        except Exception:
            pass
        return 0
