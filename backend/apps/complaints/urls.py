from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ComplaintViewSet, FeedbackViewSet, AuditLogViewSet

router = DefaultRouter()
router.register('', ComplaintViewSet, basename='complaints')
router.register('feedback', FeedbackViewSet, basename='feedback')
router.register('audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('', include(router.urls)),
]
