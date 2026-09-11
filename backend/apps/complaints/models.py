from mongoengine import Document, StringField, BooleanField, DateTimeField, DecimalField, IntField, ReferenceField, DENY
from django.utils import timezone
import uuid


class Complaint(Document):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('assigned', 'Assigned'),
        ('accepted', 'Accepted'),
        ('work_started', 'Work Started'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('citizen_verification', 'Citizen Verification'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
        ('reopened', 'Reopened'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('emergency', 'Emergency'),
    ]

    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = StringField(unique=True, required=True)
    citizen = ReferenceField('User', required=True, reverse_delete_rule=DENY)
    category = ReferenceField('ComplaintCategory', null=True, reverse_delete_rule=DENY)
    department = ReferenceField('Department', null=True, reverse_delete_rule=DENY)
    assigned_officer = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    
    title = StringField(max_length=300, required=True)
    description = StringField(required=True)
    status = StringField(max_length=30, choices=[c[0] for c in STATUS_CHOICES], default='submitted')
    priority = StringField(max_length=20, choices=[c[0] for c in PRIORITY_CHOICES], default='medium')
    is_emergency = BooleanField(default=False)
    is_anonymous = BooleanField(default=False)
    
    # Location
    latitude = DecimalField(precision=7, null=True)
    longitude = DecimalField(precision=7, null=True)
    address = StringField(default='')
    ward_number = StringField(max_length=20, default='')
    area = StringField(max_length=100, default='')
    city = StringField(max_length=100, default='')
    pincode = StringField(max_length=10, default='')
    
    # Tracking
    support_count = IntField(default=0)
    view_count = IntField(default=0)
    is_duplicate = BooleanField(default=False)
    parent_complaint = ReferenceField('self', null=True, reverse_delete_rule=DENY)
    
    # Timestamps
    submitted_at = DateTimeField(default=timezone.now)
    assigned_at = DateTimeField(null=True)
    resolved_at = DateTimeField(null=True)
    closed_at = DateTimeField(null=True)
    expected_resolution = DateTimeField(null=True)
    updated_at = DateTimeField(default=timezone.now)
    
    # Officer remarks
    officer_remarks = StringField(default='')
    rejection_reason = StringField(default='')

    # ML Prediction fields — stored at submission time
    ml_predicted_category = StringField(default='')
    ml_confidence = DecimalField(default=0.0)
    ml_outcome = StringField(default='')
    ml_outcome_label = StringField(default='')
    ml_estimated_hours = IntField(default=0)
    ml_approval_chance = IntField(default=0)

    meta = {
        'collection': 'complaints',
        'indexes': ['complaint_id', 'status', 'priority', 'citizen', 'department', 'submitted_at'],
        'ordering': ['-submitted_at']
    }

    def save(self, *args, **kwargs):
        if not self.complaint_id:
            self.complaint_id = self._generate_complaint_id()
        super().save(*args, **kwargs)

    def _generate_complaint_id(self):
        now = timezone.now()
        start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_year = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        count = Complaint.objects.filter(
            submitted_at__gte=start_of_year,
            submitted_at__lte=end_of_year,
        ).count() + 1
        return f"GRV{now.year}{count:05d}"

    def __str__(self):
        return f"{self.complaint_id} - {self.title}"

    @property
    def resolution_time_hours(self):
        if self.resolved_at and self.submitted_at:
            delta = self.resolved_at - self.submitted_at
            return round(delta.total_seconds() / 3600, 2)
        return None


class ComplaintTrainingSample(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    title = StringField(max_length=300, required=True)
    description = StringField(required=True)
    category = StringField(max_length=50, required=True)
    category_label = StringField(max_length=100, required=True)
    priority = StringField(max_length=20, required=True)
    outcome = StringField(max_length=20, required=True)
    confidence = DecimalField(default=0.0)
    resolution_hours = IntField(default=24)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_training_samples',
        'indexes': ['category', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"{self.category_label}: {self.title}"


class ComplaintImage(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True, reverse_delete_rule=DENY)
    image_url = StringField(required=True)  # URL to image in storage
    caption = StringField(max_length=200, default='')
    uploaded_by = ReferenceField('User', null=True, reverse_delete_rule=DENY)
    is_completion_photo = BooleanField(default=False)
    uploaded_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_images',
        'indexes': ['complaint', 'uploaded_at'],
        'ordering': ['-uploaded_at']
    }

    def __str__(self):
        return f"Image for {self.complaint.complaint_id}"


class ComplaintVideo(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True)
    video_url = StringField(required=True)
    caption = StringField(max_length=200, default='')
    uploaded_by = ReferenceField('User', null=True)
    uploaded_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_videos',
        'indexes': ['complaint', 'uploaded_at'],
    }


class ComplaintTimeline(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True)
    status = StringField(max_length=30, required=True)
    title = StringField(max_length=200, required=True)
    description = StringField(default='')
    updated_by = ReferenceField('User', null=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_timeline',
        'indexes': ['complaint', 'created_at'],
        'ordering': ['created_at']
    }

    def __str__(self):
        return f"{self.complaint.complaint_id} - {self.status}"


class ComplaintSupport(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True)
    citizen = ReferenceField('User', required=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'complaint_support',
        'indexes': [('complaint', 'citizen'), 'created_at'],
    }

    def __str__(self):
        return f"{self.citizen.full_name} supports {self.complaint.complaint_id}"


class Feedback(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True, unique=True)
    citizen = ReferenceField('User', required=True)
    rating = IntField(required=True, min_value=1, max_value=5)
    comment = StringField(default='')
    suggestions = StringField(default='')
    officer_response = StringField(default='')
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'feedback',
        'indexes': ['complaint', 'citizen', 'created_at'],
    }

    def __str__(self):
        return f"Feedback for {self.complaint.complaint_id} - {self.rating}/5"


class AuditLog(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint = ReferenceField(Complaint, required=True)
    action = StringField(max_length=100, required=True)
    old_value = StringField(default='')
    new_value = StringField(default='')
    performed_by = ReferenceField('User', null=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'audit_logs',
        'indexes': ['complaint', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"Audit: {self.complaint.complaint_id} - {self.action}"
