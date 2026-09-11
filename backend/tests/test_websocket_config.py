import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grievance_platform.settings')

import django

django.setup()

from django.conf import settings


def test_channel_layer_config_is_safe_for_local_dev():
    backend = settings.CHANNEL_LAYERS['default']['BACKEND']
    assert backend in {
        'channels.layers.InMemoryChannelLayer',
        'channels_redis.core.RedisChannelLayer',
    }
