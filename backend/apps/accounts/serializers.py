from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from apps.core.document_serializer import DocumentSerializer
from mongoengine.errors import NotUniqueError
from .models import User, CitizenProfile, OfficerProfile, ActivityLog


def _make_tokens(user):
    """Build JWT refresh + access tokens for a MongoEngine User without touching Django ORM."""
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.settings import api_settings
    refresh = RefreshToken()
    refresh[api_settings.USER_ID_CLAIM] = str(user.id)
    refresh['email'] = user.email
    refresh['full_name'] = user.full_name
    refresh['role'] = user.role
    return refresh


class LoginSerializer(serializers.Serializer):
    """Authenticates directly against MongoEngine — no Django ORM involved."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # Case-insensitive lookup in LoginSerializer too
        try:
            user = User.objects(email__iexact=attrs['email']).first()
            if not user:
                raise User.DoesNotExist
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'No account found with this email.'})

        if not user.check_password(attrs['password']):
            raise serializers.ValidationError({'detail': 'Incorrect password.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        # Email verification is ONLY required for citizens
        # Admins and officers are pre-verified by the system
        if not user.is_verified and user.role == User.CITIZEN:
            from rest_framework.exceptions import ValidationError as DRFValidationError
            raise DRFValidationError({
                'detail': 'Email not verified. Please verify your email before logging in.',
                'code': 'email_not_verified',
                'email': user.email,
            })

        refresh = _make_tokens(user)
        self._user = user
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'profile_picture': user.profile_picture or None,
                'is_verified': user.is_verified,
            }
        }


class CitizenProfileSerializer(DocumentSerializer):
    class Meta:
        model = CitizenProfile
        exclude = ['user']


class OfficerProfileSerializer(DocumentSerializer):
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficerProfile
        exclude = ['user']

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None


class UserSerializer(DocumentSerializer):
    citizen_profile = serializers.SerializerMethodField()
    officer_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone', 'role',
            'is_active', 'is_verified', 'date_joined', 'profile_picture',
            'push_notifications', 'email_notifications',
            'citizen_profile', 'officer_profile',
        ]
        read_only_fields = ['id', 'date_joined', 'role']

    def get_citizen_profile(self, obj):
        try:
            profile = CitizenProfile.objects(user=obj).first()
            return CitizenProfileSerializer(profile).data if profile else None
        except Exception:
            return None

    def get_officer_profile(self, obj):
        try:
            profile = OfficerProfile.objects(user=obj).first()
            return OfficerProfileSerializer(profile).data if profile else None
        except Exception:
            return None


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(required=True)
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    city = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    state = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    pincode = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    ward_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        attrs.pop('confirm_password', None)
        return attrs

    def create(self, validated_data):
        profile_data = {
            'address': validated_data.pop('address', ''),
            'city': validated_data.pop('city', ''),
            'state': validated_data.pop('state', ''),
            'pincode': validated_data.pop('pincode', ''),
            'ward_number': validated_data.pop('ward_number', ''),
        }
        # Always store email in lowercase
        validated_data['email'] = validated_data['email'].lower().strip()
        try:
            user = User.create_user(**validated_data)
        except NotUniqueError:
            raise serializers.ValidationError({'email': ['A user with this email already exists.']})
        CitizenProfile(user=user, **profile_data).save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class ActivityLogSerializer(DocumentSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_user_name(self, obj):
        try:
            return obj.user.full_name if obj.user else None
        except Exception:
            return None


class UserListSerializer(DocumentSerializer):
    officer_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role',
                  'is_active', 'is_verified', 'date_joined', 'profile_picture',
                  'officer_profile']

    def get_officer_profile(self, obj):
        try:
            profile = OfficerProfile.objects(user=obj).first()
            return OfficerProfileSerializer(profile).data if profile else None
        except Exception:
            return None
