from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound
from django.core.mail import send_mail
from django.conf import settings as django_settings

from .models import User, CitizenProfile, OfficerProfile, ActivityLog, EmailVerification
from .serializers import (
    LoginSerializer, RegisterSerializer, UserSerializer,
    ChangePasswordSerializer, ActivityLogSerializer, UserListSerializer,
    CitizenProfileSerializer, OfficerProfileSerializer, _make_tokens,
)
from .permissions import IsSuperAdmin, IsOfficerOrAbove
from apps.departments.models import Department


class OTPDeliveryError(Exception):
    pass


def _log(user, action, description='', request=None):
    try:
        ip = request.META.get('REMOTE_ADDR') if request else None
        agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        ActivityLog(user=user, action=action, description=description,
                    ip_address=ip, user_agent=agent).save()
    except Exception:
        pass


def _send_login_notification(user):
    """Send a login notification email to the citizen. Never raises."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from django.utils import timezone
        now = timezone.now().strftime('%d %b %Y, %I:%M %p')
        subject = 'New Login to Your Smart Grievance Portal Account'
        message = (
            f'Dear {user.full_name},\n\n'
            f'A successful login was made to your Smart Grievance Portal account.\n\n'
            f'  Email   : {user.email}\n'
            f'  Time    : {now}\n\n'
            f'If this was you, no action is needed.\n\n'
            f'If you did NOT log in, please change your password immediately '
            f'by visiting the portal and going to Profile → Change Password.\n\n'
            f'Regards,\nSmart Grievance Portal Security Team'
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=django_settings.EMAIL_HOST_USER or 'noreply@grievance.gov.in',
            recipient_list=[user.email],
            fail_silently=True,
        )
        logger.info('Login notification sent to %s', user.email)
    except Exception as e:
        logger.warning('Could not send login notification to %s: %s', user.email, e)


def _send_otp(user):
    """Create a fresh OTP and email it without exposing the OTP in an API response."""
    import logging
    logger = logging.getLogger(__name__)

    if django_settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        raise OTPDeliveryError('Email delivery is not configured. Add Gmail SMTP credentials to backend/.env.')

    # Invalidate all previous OTPs for this user
    try:
        for old in EmailVerification.objects(user=user, is_used=False):
            old.is_used = True
            old.save()
    except Exception:
        pass

    ev = EmailVerification(user=user)
    ev.save()

    subject = 'Verify your email — Smart Grievance Portal'
    message = (
        f'Dear {user.full_name},\n\n'
        f'Your email verification OTP is:\n\n'
        f'    {ev.otp}\n\n'
        f'This OTP is valid for {EmailVerification.OTP_EXPIRY_MINUTES} minutes.\n'
        f'Do not share this OTP with anyone.\n\n'
        f'If you did not register, please ignore this email.\n\n'
        f'Regards,\nSmart Grievance Portal Team'
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=django_settings.EMAIL_HOST_USER or 'noreply@grievance.gov.in',
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info('OTP sent to %s via SMTP', user.email)
    except Exception as e:
        logger.error('Failed to send OTP email to %s: %s', user.email, e)
        raise OTPDeliveryError('OTP email could not be sent.') from e

    return ev.otp


# ─── Auth views ────────────────────────────────────────────────────────────────

class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = serializer._user
        _log(user, 'LOGIN', 'User logged in', request)
        # Send login notification email only to citizens
        if user.role == 'citizen':
            _send_login_notification(user)
        return Response(data, status=status.HTTP_200_OK)


class RegisterView(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Send OTP email — non-blocking, never fails the registration
        try:
            _send_otp(user)
        except OTPDeliveryError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        refresh = _make_tokens(user)
        _log(user, 'REGISTER', 'New citizen registered', request)

        response_data = {
            'message': 'Registration successful. Please check your email for the verification OTP.',
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'user': {
                'id': str(user.id),
                'email': user.email.lower(),  # always lowercase in response
                'full_name': user.full_name,
                'role': user.role,
                'profile_picture': user.profile_picture or None,
                'is_verified': user.is_verified,
            }
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


class ForgotPasswordView(generics.GenericAPIView):
    """Step 1 — Send a password-reset OTP to the citizen's email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email__iexact=email).first()

        # Always respond the same way — never reveal whether email exists
        generic_msg = 'If that email is registered, a password reset OTP has been sent.'

        if not user:
            return Response({'message': generic_msg})

        # Only citizens can use forgot password
        if user.role != User.CITIZEN:
            return Response({'message': generic_msg})

        if not user.is_active:
            return Response({'message': generic_msg})

        try:
            _send_otp(user)   # reuse the same OTP mechanism
        except OTPDeliveryError:
            return Response({'message': generic_msg})
        _log(user, 'FORGOT_PASSWORD', 'Password reset OTP requested', request)

        response_data = {'message': generic_msg}
        if django_settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            response_data['otp'] = otp
            response_data['dev_note'] = 'Dev mode — OTP shown here since email is not configured.'

        return Response(response_data)


class ResetPasswordView(generics.GenericAPIView):
    """Step 2 — Verify OTP and set a new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        email       = request.data.get('email', '').strip().lower()
        otp         = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        confirm     = request.data.get('confirm_password', '')

        if not all([email, otp, new_password, confirm]):
            return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email__iexact=email).first()
        if not user or user.role != User.CITIZEN:
            return Response({'detail': 'Invalid email or OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        ev = EmailVerification.objects(user=user, is_used=False).order_by('-created_at').first()

        if not ev:
            return Response({'detail': 'No active OTP found. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if ev.is_expired:
            return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if ev.otp != otp:
            return Response({'detail': 'Incorrect OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        # OTP valid — reset the password
        ev.is_used = True
        ev.save()

        user.set_password(new_password)
        # Also mark verified if they weren't (proves they own the email)
        user.is_verified = True
        user.save()

        _log(user, 'PASSWORD_RESET', 'Password reset via OTP', request)

        # Send confirmation email
        try:
            send_mail(
                subject='Your Smart Grievance Portal password has been reset',
                message=(
                    f'Dear {user.full_name},\n\n'
                    f'Your password has been successfully reset.\n\n'
                    f'If you did not do this, please contact support immediately.\n\n'
                    f'Regards,\nSmart Grievance Portal Team'
                ),
                from_email=django_settings.EMAIL_HOST_USER or 'noreply@grievance.gov.in',
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({'message': 'Password reset successfully. You can now log in with your new password.'})


class SendOTPView(generics.GenericAPIView):
    """Resend or send a fresh OTP to the user's registered email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Case-insensitive lookup
        user = User.objects(email__iexact=email).first()
        if not user:
            return Response({'message': 'If that email is registered, an OTP has been sent.'})

        if user.is_verified:
            return Response({'detail': 'This email is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _send_otp(user)
        except OTPDeliveryError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        _log(user, 'SEND_OTP', 'OTP sent for email verification', request)

        response_data = {
            'message': f'OTP sent to {email}. Valid for {EmailVerification.OTP_EXPIRY_MINUTES} minutes.',
        }
        return Response(response_data)


class VerifyEmailView(generics.GenericAPIView):
    """Verify a user's email using the 6-digit OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp   = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'detail': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Case-insensitive lookup — handles users registered before lowercase fix
        user = User.objects(email__iexact=email).first()
        if not user:
            return Response({'detail': 'Invalid email or OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_verified:
            return Response({'message': 'Email is already verified. You can log in.'})

        # Find the latest unused OTP for this user
        ev = EmailVerification.objects(user=user, is_used=False).order_by('-created_at').first()

        if not ev:
            return Response({'detail': 'No active OTP found. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if ev.is_expired:
            return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if ev.otp != otp:
            return Response({'detail': 'Incorrect OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is valid — mark user as verified
        ev.is_used = True
        ev.save()
        user.is_verified = True
        user.save()

        _log(user, 'EMAIL_VERIFIED', 'Email verified successfully', request)
        return Response({
            'message': 'Email verified successfully! You can now log in.',
            'verified': True,
        })


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        _log(request.user, 'LOGOUT', 'User logged out', request)
        return Response({'message': 'Logged out successfully'})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        allowed = ['full_name', 'phone', 'profile_picture',
                   'push_notifications', 'email_notifications']
        for field in allowed:
            if field in request.data:
                setattr(instance, field, request.data[field])
        instance.save()
        return Response(UserSerializer(instance).data)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Old password is incorrect'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        _log(user, 'PASSWORD_CHANGE', 'Password changed', request)
        return Response({'message': 'Password changed successfully'})


class CitizenProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CitizenProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile = CitizenProfile.objects(user=self.request.user).first()
        if not profile:
            profile = CitizenProfile(user=self.request.user)
            profile.save()
        return profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        allowed = ['address', 'city', 'state', 'pincode', 'ward_number',
                   'area', 'aadhar_number', 'date_of_birth', 'gender']
        for field in allowed:
            if field in request.data:
                setattr(instance, field, request.data[field])
        instance.save()
        return Response(CitizenProfileSerializer(instance).data)


# ─── Admin viewsets ────────────────────────────────────────────────────────────

class UserManagementViewSet(viewsets.ModelViewSet):
    serializer_class = UserListSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return User.objects.all()

    # MongoEngine override
    def list(self, request, *args, **kwargs):
        qs = User.objects.all()

        # manual search
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(__raw__={
                '$or': [
                    {'email': {'$regex': search, '$options': 'i'}},
                    {'full_name': {'$regex': search, '$options': 'i'}},
                    {'phone': {'$regex': search, '$options': 'i'}},
                ]
            })

        # manual field filters
        for field in ['role', 'is_active', 'is_verified']:
            val = request.query_params.get(field, '').strip()
            if val:
                # booleans come as 'true'/'false' strings
                if val.lower() == 'true':
                    val = True
                elif val.lower() == 'false':
                    val = False
                qs = qs.filter(**{field: val})

        qs = qs.order_by('-date_joined')
        return Response(UserListSerializer(list(qs), many=True).data)

    # MongoEngine override
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = User.objects(id=pk).first()
        if not obj:
            raise NotFound('User not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        allowed = ['full_name', 'phone', 'role', 'is_active', 'is_verified']
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(UserListSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"}',
            'is_active': user.is_active,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'total': User.objects.count(),
            'citizens': User.objects(role='citizen').count(),
            'officers': User.objects(role='officer').count(),
            'department_heads': User.objects(role='department_head').count(),
            'active': User.objects(is_active=True).count(),
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def officers_by_city(self, request):
        """
        GET /auth/users/officers_by_city/?city=Ahmedabad&department_id=xxx
        Public endpoint — used on the officer login page.
        Returns officers filtered by city (and optionally department).
        """
        city    = request.query_params.get('city', '').strip()
        dept_id = request.query_params.get('department_id', '').strip()

        qs = OfficerProfile.objects(is_available=True)

        if city:
            qs = qs.filter(city__iexact=city)

        if dept_id:
            from apps.departments.models import Department
            dept = Department.objects(id=dept_id).first()
            if dept:
                qs = qs.filter(department=dept)

        # Some shared department officers do not have a city assigned. Keep
        # them available for login when no city-specific officer matches.
        if city:
            fallback_profiles = [
                profile for profile in OfficerProfile.objects(is_available=True)
                if not (profile.city or '').strip()
            ]
            if dept_id and dept:
                fallback_profiles = [
                    profile for profile in fallback_profiles
                    if profile.department and str(profile.department.id) == str(dept.id)
                ]
            qs = list(qs) + fallback_profiles

        result = []
        for op in qs:
            try:
                dept_name = op.department.name if op.department else ''
            except Exception:
                dept_name = ''
            result.append({
                'id':            str(op.user.id),
                'full_name':     op.user.full_name,
                'email':         op.user.email,
                'role':          op.user.role,
                'employee_id':   op.employee_id,
                'designation':   op.designation,
                'city':          op.city,
                'department_name': dept_name,
                'is_available':  op.is_available,
            })
        return Response(result)


class CreateOfficerView(generics.GenericAPIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        data = request.data
        department = Department.objects(id=data.get('department_id')).first()
        if not department:
            return Response({'error': 'Department not found'},
                            status=status.HTTP_404_NOT_FOUND)
        try:
            user = User.create_user(
                email=data['email'],
                password=data['password'],
                full_name=data['full_name'],
                phone=data.get('phone', ''),
                role=data.get('role', User.OFFICER),
                is_verified=True,  # Officers are pre-verified — no email OTP needed
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        OfficerProfile(
            user=user,
            department=department,
            employee_id=data['employee_id'],
            designation=data.get('designation', ''),
            assigned_area=data.get('assigned_area', ''),
            city=data.get('city', ''),
        ).save()
        _log(request.user, 'CREATE_OFFICER', f'Created officer {user.email}', request)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return ActivityLog.objects.all()

    # MongoEngine override
    def list(self, request, *args, **kwargs):
        qs = ActivityLog.objects.all()
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(__raw__={
                '$or': [
                    {'action': {'$regex': search, '$options': 'i'}},
                    {'description': {'$regex': search, '$options': 'i'}},
                ]
            })
        qs = list(qs.order_by('-created_at').limit(200))
        return Response(ActivityLogSerializer(qs, many=True).data)

    # MongoEngine override
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = ActivityLog.objects(id=pk).first()
        if not obj:
            raise NotFound('Activity log not found.')
        return obj
