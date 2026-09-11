from django.contrib.auth.backends import BaseBackend
from .models import User


class MongoAuthBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get('email') or username
        if not email or not password:
            return None

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and user.is_active:
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
