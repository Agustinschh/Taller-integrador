from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
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
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reponer_stock', 'destacar']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Producto.objects.select_related('categoria', 'edad', 'pelicula')
        if self.request.user and self.request.user.is_staff:
            return qs
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return qs
        return qs.filter(activo=True)

    @action(detail=True, methods=['post'])
    def reponer_stock(self, request, pk=None):
        """Usa el procedimiento almacenado pr_gestion_stock(id_producto, cantidad)"""
        cantidad = int(request.data.get('cantidad', 0))
        if cantidad <= 0:
            return Response({'error': 'La cantidad debe ser mayor a 0'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            cursor.execute("CALL pr_gestion_stock(%s, %s)", [int(pk), cantidad])
        producto = self.get_object()
        return Response(self.get_serializer(producto).data)

    @action(detail=True, methods=['post'])
    def destacar(self, request, pk=None):
        """Usa el procedimiento almacenado pr_destacar_producto(id_producto, estado)"""
        estado = bool(request.data.get('destacado', True))
        with connection.cursor() as cursor:
            cursor.execute("CALL pr_destacar_producto(%s, %s)", [int(pk), estado])
        producto = self.get_object()
        return Response(self.get_serializer(producto).data)

    @action(detail=False, methods=['get'])
    def inventario_critico(self, request):
        """Consulta la vista PostgreSQL vista_inventario_critico"""
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_producto, nombre_producto, stock, estado_stock FROM vista_inventario_critico")
            rows = cursor.fetchall()
        data = [
            {
                'id_producto': r[0],
                'nombre_producto': r[1],
                'stock': r[2],
                'estado_stock': r[3],
            }
            for r in rows
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def filtrar_sp(self, request):
        """Consulta la función PostgreSQL filtrar_productos(id_categoria, id_edad, id_pelicula)"""
        id_cat = request.query_params.get('id_categoria') or None
        id_edad = request.query_params.get('id_edad') or None
        id_peli = request.query_params.get('id_pelicula') or None
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_producto, nombre_producto, descripcion, precio, stock FROM filtrar_productos(%s, %s, %s)",
                [
                    int(id_cat) if id_cat else None,
                    int(id_edad) if id_edad else None,
                    int(id_peli) if id_peli else None,
                ],
            )
            rows = cursor.fetchall()
        data = [
            {
                'id': r[0],
                'nombre': r[1],
                'descripcion': r[2],
                'precio': float(r[3]),
                'stock': r[4],
            }
            for r in rows
        ]
        return Response(data)
