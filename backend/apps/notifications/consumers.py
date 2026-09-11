import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return

        self.user = user
        self.group_name = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'connected', 'message': 'Connected to notifications'}))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mark_read':
            notification_id = data.get('notification_id')
            if notification_id:
                await self.mark_notification_read(notification_id)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from .models import Notification
        try:
            # MongoEngine has no .filter().update() — fetch and save
            notif = Notification.objects(id=notification_id, recipient=self.user).first()
            if notif:
                notif.is_read = True
                notif.read_at = timezone.now()
                notif.save()
        except Exception:
            pass


class ComplaintStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return

        self.complaint_id = self.scope['url_route']['kwargs']['complaint_id']
        self.group_name = f'complaint_{self.complaint_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def complaint_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'status_update',
            'status': event['status'],
            'complaint_id': event['complaint_id'],
        }))
