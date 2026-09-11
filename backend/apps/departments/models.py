from mongoengine import Document, StringField, BooleanField, DateTimeField, ReferenceField, DENY
from django.utils import timezone
import uuid


class Department(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    name = StringField(max_length=200, required=True, unique=True)
    code = StringField(max_length=20, required=True, unique=True)
    description = StringField(default='')
    head = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    email = StringField(default='')
    phone = StringField(max_length=15, default='')
    address = StringField(default='')
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'departments',
        'indexes': ['name', 'code'],
        'ordering': ['name']
    }

    def __str__(self):
        return self.name

    @property
    def officer_count(self):
        from apps.accounts.models import User
        return User.objects(role='officer').count()

    @property
    def total_complaints(self):
        from apps.complaints.models import Complaint
        return Complaint.objects(department=self).count()


class ComplaintCategory(Document):
    CATEGORIES = [
        ('road_damage', 'Road Damage'),
        ('garbage', 'Garbage Collection'),
        ('street_light', 'Street Light'),
        ('water_supply', 'Water Supply'),
        ('drainage', 'Drainage'),
        ('electricity', 'Electricity'),
        ('traffic', 'Traffic'),
        ('illegal_parking', 'Illegal Parking'),
        ('public_transport', 'Public Transport'),
        ('government_office', 'Government Office'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('environment', 'Environment'),
        ('others', 'Others'),
    ]

    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    name = StringField(max_length=100, required=True)
    slug = StringField(max_length=50, required=True, unique=True, choices=[c[0] for c in CATEGORIES])
    department = ReferenceField(Department, null=True, reverse_delete_rule=DENY)
    description = StringField(default='')
    icon = StringField(max_length=50, default='')
    color = StringField(max_length=20, default='#3B82F6')
    is_active = BooleanField(default=True)
    sla_hours = StringField(default='72', help_text='Expected resolution time in hours')
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_categories',
        'indexes': ['slug', 'name'],
        'ordering': ['name']
    }

    def __str__(self):
        return self.name


class Announcement(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    title = StringField(max_length=200, required=True)
    content = StringField(required=True)
    department = ReferenceField(Department, null=True, reverse_delete_rule=DENY)
    is_active = BooleanField(default=True)
    created_by = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    created_at = DateTimeField(default=timezone.now)
    expires_at = DateTimeField(null=True)

    meta = {
        'collection': 'announcements',
        'indexes': ['created_at', 'is_active'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return self.title
