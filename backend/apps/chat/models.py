from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, DENY
from django.utils import timezone
import uuid


class ChatRoom(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField('Complaint', required=True, unique=True, reverse_delete_rule=DENY)
    citizen = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    officer = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'chat_rooms',
        'indexes': ['complaint', 'citizen', 'officer', 'updated_at'],
        'ordering': ['-updated_at']
    }

    def __str__(self):
        return f"Chat: {self.complaint.complaint_id}"


class ChatMessage(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    room = ReferenceField(ChatRoom, required=True, reverse_delete_rule=DENY)
    sender = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    message = StringField(default='')
    image_url = StringField(null=True)  # URL to image
    is_read = BooleanField(default=False)
    read_at = DateTimeField(null=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'chat_messages',
        'indexes': ['room', 'sender', 'created_at', 'is_read'],
        'ordering': ['created_at']
    }

    def __str__(self):
        return f"Message by {self.sender.full_name} in {self.room}"
