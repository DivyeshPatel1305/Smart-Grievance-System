from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _

from .models import User


class MongoJWTAuthentication(JWTAuthentication):
    """JWT authentication adapter for the MongoEngine-backed User model."""

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as exc:
            raise AuthenticationFailed(
                _("Token contained no recognizable user identification"),
                code='token_not_valid',
            ) from exc

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed(_("User not found"), code='user_not_found') from exc

        if not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code='user_inactive')

        return user
