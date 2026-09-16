from rest_framework import viewsets, permissions, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Producto
from .serializers import ProductoSerializer
from .filters import ProductoFilter

class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductoFilter
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio', 'creado', 'stock']
    ordering = ['-creado']
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Si el usuario es staff o solicita ver todos los productos (incluyendo inactivos)
        if self.request.user and self.request.user.is_staff:
            return Producto.objects.all()
        if self.request.query_params.get('admin_view') == 'true':
            # Si se pasa admin_view pero no es staff, no mostrará inactivos salvo que sea staff
            if self.request.user and self.request.user.is_staff:
                return Producto.objects.all()
        # Por defecto para clientes solo activos
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return Producto.objects.all()
        return Producto.objects.filter(activo=True)  