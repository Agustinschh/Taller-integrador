from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnvioViewSet, cotizar_envio

router = DefaultRouter()
router.register(r'shipments', EnvioViewSet, basename='envio')

urlpatterns = [
    path('cotizar/', cotizar_envio, name='cotizar-envio'),
    path('', include(router.urls)),
]
