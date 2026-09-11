from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, DictField, DENY
from django.utils import timezone
import uuid


class ServiceRequest(Document):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]

    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    citizen = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    department = ReferenceField('Department', null=True, reverse_delete_rule=DENY)
    service_type = StringField(max_length=100, required=True)
    description = StringField(required=True)
    status = StringField(max_length=20, choices=[c[0] for c in STATUS_CHOICES], default='pending')
    document_url = StringField(null=True)  # URL to uploaded document
    remarks = StringField(default='')
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'service_requests',
        'indexes': ['citizen', 'department', 'status', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"{self.service_type} - {self.citizen.full_name}"
