from mongoengine import Document, StringField, DateTimeField, ReferenceField, DictField, DENY
from django.utils import timezone
import uuid


class SavedReport(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    name = StringField(max_length=200, required=True)
    report_type = StringField(max_length=50, required=True)
    parameters = DictField(default=dict)
    created_by = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'saved_reports',
        'indexes': ['created_by', 'report_type', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return self.name
