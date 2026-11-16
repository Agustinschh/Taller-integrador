from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db import models
from .models import Oferta, Combo
from .serializers import OfertaSerializer, ComboSerializer


class OfertasActivasListView(generics.ListAPIView):
    serializer_class = OfertaSerializer
    pagination_class = None 
    
    def get_queryset(self):
        now = timezone.now()
        return Oferta.objects.filter(
            activo=True,
            fecha_inicio__lte=now
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).select_related('producto').prefetch_related('producto__categorias')


class OfertaDetailView(generics.RetrieveAPIView):
    queryset = Oferta.objects.all()
    serializer_class = OfertaSerializer


class ComboListView(generics.ListCreateAPIView):
    serializer_class = ComboSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Si el usuario es staff o solicita admin_view
        is_admin_req = self.request.query_params.get('admin_view') == 'true'
        if (self.request.user and self.request.user.is_staff) or is_admin_req:
            queryset = Combo.objects.all().prefetch_related(
                'items__producto',
                'items__producto__categorias'
            )
        else:
            queryset = Combo.objects.filter(activo=True).prefetch_related(
                'items__producto',
                'items__producto__categorias'
            )
        
        tema = self.request.query_params.get('tema')
        if tema and tema != 'todos':
            queryset = queryset.filter(tema__iexact=tema)
        
        destacado = self.request.query_params.get('destacado')
        if destacado == 'true':
            queryset = queryset.filter(destacado=True)
            
        return queryset


class ComboDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ComboSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return Combo.objects.all().prefetch_related(
            'items__producto',
            'items__producto__categorias'
        )

    def perform_destroy(self, instance):
        if instance.stock > 0:
            try:
                instance.devolver_stock_productos(instance.stock)
            except Exception:
                pass
        instance.delete()