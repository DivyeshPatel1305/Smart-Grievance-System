from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, ImageField, ReferenceField, DENY, IntField, DecimalField
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
import uuid
import random
import string


def _generate_otp():
    return ''.join(random.choices(string.digits, k=6))


class User(Document):
    CITIZEN = 'citizen'
    OFFICER = 'officer'
    DEPARTMENT_HEAD = 'department_head'
    SUPER_ADMIN = 'super_admin'

    ROLE_CHOICES = [
        (CITIZEN, 'Citizen'),
        (OFFICER, 'Department Officer'),
        (DEPARTMENT_HEAD, 'Department Head'),
        (SUPER_ADMIN, 'Super Admin'),
    ]

    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    email = EmailField(unique=True, required=True)
    full_name = StringField(max_length=150, required=True)
    phone = StringField(max_length=15, default='')
    password = StringField(required=True)
    role = StringField(max_length=20, choices=[c[0] for c in ROLE_CHOICES], default=CITIZEN)
    is_active = BooleanField(default=True)
    is_staff = BooleanField(default=False)
    is_superuser = BooleanField(default=False)
    is_verified = BooleanField(default=False)
    date_joined = DateTimeField(default=timezone.now)
    last_login = DateTimeField(null=True)
    profile_picture = StringField(null=True)  # URL to image
    push_notifications = BooleanField(default=True)
    email_notifications = BooleanField(default=True)

    meta = {
        'collection': 'users',
        'indexes': ['email', 'role', 'date_joined'],
        'ordering': ['-date_joined']
    }

    def set_password(self, password):
        self.password = make_password(password)

    def check_password(self, password):
        return check_password(password, self.password)

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @classmethod
    def create_user(cls, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        user = cls(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save()
        return user

    @classmethod
    def create_superuser(cls, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', cls.SUPER_ADMIN)
        return cls.create_user(email, password, **extra_fields)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_citizen(self):
        return self.role == self.CITIZEN

    @property
    def is_officer(self):
        return self.role == self.OFFICER

    @property
    def is_department_head(self):
        return self.role == self.DEPARTMENT_HEAD

    @property
    def is_super_admin(self):
        return self.role == self.SUPER_ADMIN


class CitizenProfile(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    user = ReferenceField(User, required=True, unique=True, reverse_delete_rule=DENY)
    address = StringField(default='')
    city = StringField(max_length=100, default='')
    state = StringField(max_length=100, default='')
    pincode = StringField(max_length=10, default='')
    ward_number = StringField(max_length=20, default='')
    area = StringField(max_length=100, default='')
    aadhar_number = StringField(max_length=12, default='')
    date_of_birth = DateTimeField(null=True)
    gender = StringField(max_length=10, choices=['male', 'female', 'other'], null=True, default=None)
    total_complaints = IntField(default=0)
    resolved_complaints = IntField(default=0)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'citizen_profiles',
        'indexes': ['user'],
    }

    def __str__(self):
        return f"Profile: {self.user.full_name}"


class OfficerProfile(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    user = ReferenceField(User, required=True, unique=True)
    department = ReferenceField('Department', null=True)
    employee_id = StringField(max_length=50, unique=True, required=True)
    designation = StringField(max_length=100, default='')
    city = StringField(max_length=100, default='')          # city officer is assigned to
    joining_date = DateTimeField(null=True)
    is_available = BooleanField(default=True)
    assigned_area = StringField(max_length=200, default='')
    total_assigned = IntField(default=0)
    total_resolved = IntField(default=0)
    avg_resolution_time = DecimalField(default=0.0)
    created_at = DateTimeField(default=timezone.now)
    updated_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'officer_profiles',
        'indexes': ['user', 'employee_id', 'department', 'city'],
    }

    def __str__(self):
        return f"Officer: {self.user.full_name} - {self.employee_id}"


class ActivityLog(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    user = ReferenceField(User, null=True, reverse_delete_rule=DENY)
    action = StringField(max_length=200, required=True)
    description = StringField(default='')
    ip_address = StringField(null=True)
    user_agent = StringField(default='')
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'activity_logs',
        'indexes': ['user', 'created_at'],
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"{self.user} - {self.action}"


class EmailVerification(Document):
    """Stores a 6-digit OTP for email verification. Expires after 10 minutes."""
    id         = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    user       = ReferenceField(User, required=True, reverse_delete_rule=DENY)
    otp        = StringField(max_length=6, required=True, default=_generate_otp)
    is_used    = BooleanField(default=False)
    created_at = DateTimeField(default=timezone.now)
    expires_at = DateTimeField()

    OTP_EXPIRY_MINUTES = 10

    meta = {
        'collection': 'email_verifications',
        'indexes': ['user', 'created_at'],
        'ordering': ['-created_at'],
    }

    def save(self, *args, **kwargs):
        from datetime import timedelta
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        from django.utils.timezone import make_aware, is_naive
        import pytz
        now = timezone.now()
        exp = self.expires_at
        if exp and is_naive(exp):
            exp = make_aware(exp, pytz.UTC)
        return now > exp if exp else True

    def __str__(self):
        return f'OTP for {self.user.email}'
