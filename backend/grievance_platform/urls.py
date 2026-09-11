from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework import status
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Smart Public Grievance API",
        default_version='v1',
        description="Complete API for Smart Public Grievance & Service Delivery Platform",
        contact=openapi.Contact(email="admin@grievance.gov.in"),
        license=openapi.License(name="Government License"),
    ),
    public=True,
    permission_classes=[AllowAny],
)


class MongoTokenRefreshView(APIView):
    """
    Custom token refresh view that works with MongoEngine users.
    The default simplejwt TokenRefreshView validates the user via Django ORM — this skips that.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            return Response({'access': str(token.access_token)}, status=status.HTTP_200_OK)
        except (TokenError, InvalidToken) as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


urlpatterns = [
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/complaints/', include('apps.complaints.urls')),
    path('api/v1/departments/', include('apps.departments.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/chat/', include('apps.chat.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/services/', include('apps.services.urls')),
    path('api/v1/token/refresh/', MongoTokenRefreshView.as_view(), name='token_refresh'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
