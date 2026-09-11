from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register('rooms', ChatRoomViewSet, basename='chat-rooms')
router.register('messages', ChatMessageViewSet, basename='chat-messages')

urlpatterns = [
    path('', include(router.urls)),
]
