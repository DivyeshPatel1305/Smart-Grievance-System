from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer


class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'citizen':
            return ChatRoom.objects(citizen=user)
        elif user.role in ['officer', 'department_head']:
            return ChatRoom.objects(officer=user)
        return ChatRoom.objects.all()

    # MongoEngine override
    def list(self, request, *args, **kwargs):
        qs = list(self.get_queryset().order_by('-updated_at'))
        return Response(ChatRoomSerializer(qs, many=True, context={'request': request}).data)

    # MongoEngine override
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = ChatRoom.objects(id=pk).first()
        if not obj:
            raise NotFound('Chat room not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        complaint_id = request.data.get('complaint_id')
        if not complaint_id:
            return Response({'error': 'complaint_id required'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.complaints.models import Complaint
        complaint = Complaint.objects(id=complaint_id).first()
        if not complaint:
            return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

        room = ChatRoom.objects(complaint=complaint).first()
        created = False
        if not room:
            room = ChatRoom(
                complaint=complaint,
                citizen=complaint.citizen,
                officer=complaint.assigned_officer,
            )
            room.save()
            created = True
        elif complaint.assigned_officer and not room.officer:
            room.officer = complaint.assigned_officer
            room.updated_at = timezone.now()
            room.save()

        return Response(
            ChatRoomSerializer(room, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        room_id = self.kwargs.get('room_pk') or self.request.query_params.get('room')
        if room_id:
            room = ChatRoom.objects(id=room_id).first()
            if room:
                return ChatMessage.objects(room=room).order_by('created_at')
        return ChatMessage.objects.none()

    # MongoEngine override
    def list(self, request, *args, **kwargs):
        qs = list(self.get_queryset())
        return Response(ChatMessageSerializer(qs, many=True, context={'request': request}).data)

    # MongoEngine override
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = ChatMessage.objects(id=pk).first()
        if not obj:
            raise NotFound('Message not found.')
        return obj

    def perform_create(self, serializer):
        room_id = self.request.data.get('room')
        room = ChatRoom.objects(id=room_id).first()
        if not room:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Chat room not found.')
        serializer.save(sender=self.request.user, room=room)
        room.updated_at = timezone.now()
        room.save()

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        room_id = request.data.get('room_id')
        room = ChatRoom.objects(id=room_id).first()
        if room:
            for msg in ChatMessage.objects(room=room, is_read=False):
                if str(msg.sender.id) != str(request.user.id):
                    msg.is_read = True
                    msg.read_at = timezone.now()
                    msg.save()
        return Response({'message': 'Messages marked as read'})
