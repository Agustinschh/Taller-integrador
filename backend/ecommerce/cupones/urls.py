from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CuponViewSet

router = DefaultRouter()
router.register(r'', CuponViewSet, basename='cupon')

urlpatterns = [
    path('', include(router.urls)),
]
