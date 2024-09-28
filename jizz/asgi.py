import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.urls import path

from jizz.consumers import QuizConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jizz.settings.production')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/quiz/<str:game_code>/", QuizConsumer.as_asgi()),
        ])
    ),
})
