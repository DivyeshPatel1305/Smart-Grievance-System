from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, DENY
from django.utils import timezone
import uuid


class Notification(Document):
    TYPE_CHOICES = [
        ('complaint_submitted', 'Complaint Submitted'),
        ('complaint_assigned', 'Complaint Assigned'),
        ('status_changed', 'Status Changed'),
        ('complaint_resolved', 'Complaint Resolved'),
        ('new_message', 'New Message'),
        ('complaint_reopened', 'Complaint Reopened'),
        ('priority_escalated', 'Priority Escalated'),
        ('feedback_requested', 'Feedback Requested'),
        ('announcement', 'Announcement'),
        ('system', 'System'),
    ]

    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    sender = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    notification_type = StringField(max_length=30, choices=[c[0] for c in TYPE_CHOICES], required=True)
    title = StringField(max_length=200, required=True)
    message = StringField(required=True)
    complaint = ReferenceField('Complaint', null=True, reverse_delete_rule=DENY)
    is_read = BooleanField(default=False)
    read_at = DateTimeField(null=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'notifications',
        'indexes': ['recipient', 'is_read', 'created_at', ('recipient', 'is_read')],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"Notification for {self.recipient.full_name}: {self.title}"
