import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return

        self.user = user
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'chat_{self.room_id}'

        if not await self.check_room_access():
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.mark_messages_read()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data.get('message', '').strip()
        if not message_text:
            return

        message = await self.save_message(message_text)
        if not message:
            return

        # Broadcast to everyone in the room
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id':          message['id'],
                    'sender_id':   str(self.user.id),
                    'sender_name': self.user.full_name,
                    'sender_role': self.user.role,
                    'message':     message_text,
                    'created_at':  message['created_at'],
                    'is_read':     False,
                }
            }
        )
        # Send notification to the other party (non-blocking)
        await self.notify_other_party(message_text)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type': 'message', 'message': event['message']}))

    @database_sync_to_async
    def check_room_access(self):
        from .models import ChatRoom
        try:
            room = ChatRoom.objects(id=self.room_id).first()
            if not room:
                return False
            return (
                str(room.citizen.id) == str(self.user.id)
                or (room.officer and str(room.officer.id) == str(self.user.id))
                or self.user.role in ['department_head', 'super_admin']
            )
        except Exception:
            return False

    @database_sync_to_async
    def save_message(self, message_text):
        from .models import ChatRoom, ChatMessage
        try:
            room = ChatRoom.objects(id=self.room_id).first()
            if not room:
                return None
            msg = ChatMessage(room=room, sender=self.user, message=message_text)
            msg.save()
            room.updated_at = timezone.now()
            room.save()
            return {'id': str(msg.id), 'created_at': str(msg.created_at)}
        except Exception:
            return None

    @database_sync_to_async
    def mark_messages_read(self):
        from .models import ChatRoom, ChatMessage
        try:
            room = ChatRoom.objects(id=self.room_id).first()
            if not room:
                return
            for msg in ChatMessage.objects(room=room, is_read=False):
                if str(msg.sender.id) != str(self.user.id):
                    msg.is_read = True
                    msg.read_at = timezone.now()
                    msg.save()
        except Exception:
            pass

    @database_sync_to_async
    def _get_notification_data(self, message_text):
        """Get recipient and build notification object — DB work only."""
        from .models import ChatRoom
        from apps.notifications.models import Notification
        try:
            room = ChatRoom.objects(id=self.room_id).first()
            if not room:
                return None, None
            recipient = room.officer if str(room.citizen.id) == str(self.user.id) else room.citizen
            if not recipient:
                return None, None
            notif = Notification(
                recipient=recipient,
                sender=self.user,
                notification_type='new_message',
                title=f'New message from {self.user.full_name}',
                message=message_text[:100],
                complaint=room.complaint,
            )
            notif.save()
            return str(recipient.id), {
                'id':                str(notif.id),
                'title':             notif.title,
                'message':           notif.message,
                'notification_type': 'new_message',
                'created_at':        str(notif.created_at),
            }
        except Exception:
            return None, None

    async def notify_other_party(self, message_text):
        """Send in-app notification to the other party — fully async, no deadlock."""
        try:
            recipient_id, notif_data = await self._get_notification_data(message_text)
            if recipient_id and notif_data:
                await self.channel_layer.group_send(
                    f'notifications_{recipient_id}',
                    {'type': 'send_notification', 'notification': notif_data}
                )
        except Exception:
            pass
