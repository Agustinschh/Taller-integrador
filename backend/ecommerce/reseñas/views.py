from rest_framework import viewsets, permissions
from .models import Reseña
from .serializers import ReseñaSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied

class ReseñaViewSet(viewsets.ModelViewSet):
    queryset = Reseña.objects.all()
    serializer_class = ReseñaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['producto']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.usuario != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("No puede editar esta reseña.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.usuario != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("No puede eliminar esta reseña.")
        instance.delete()
