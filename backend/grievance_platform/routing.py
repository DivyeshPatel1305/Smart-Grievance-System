from django.urls import re_path
from apps.chat import consumers as chat_consumers
from apps.notifications import consumers as notification_consumers

websocket_urlpatterns = [
    # room_id and complaint_id are UUIDs — use [\w-]+ not \d+
    re_path(r'^ws/chat/(?P<room_id>[\w-]+)/$', chat_consumers.ChatConsumer.as_asgi()),
    re_path(r'^ws/notifications/$', notification_consumers.NotificationConsumer.as_asgi()),
    re_path(r'^ws/complaints/(?P<complaint_id>[\w-]+)/$', notification_consumers.ComplaintStatusConsumer.as_asgi()),
]
