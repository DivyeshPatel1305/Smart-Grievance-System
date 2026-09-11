from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects(recipient=self.request.user).order_by('-created_at')

    # MongoEngine override — DRF default list() uses Django ORM pagination
    def list(self, request, *args, **kwargs):
        qs = list(self.get_queryset().limit(100))
        return Response(NotificationSerializer(qs, many=True).data)

    # MongoEngine override — DRF default get_object() uses Django ORM .get()
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = Notification.objects(id=pk, recipient=self.request.user).first()
        if not obj:
            raise NotFound('Notification not found.')
        return obj

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return Response({'message': 'Marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        now = timezone.now()
        for notif in Notification.objects(recipient=request.user, is_read=False):
            notif.is_read = True
            notif.read_at = now
            notif.save()
        return Response({'message': 'All notifications marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})
