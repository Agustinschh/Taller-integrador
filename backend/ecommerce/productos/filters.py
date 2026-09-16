import django_filters
from .models import Producto

class ProductoFilter(django_filters.FilterSet):
    precio_min = django_filters.NumberFilter(field_name="precio", lookup_expr='gte')
    precio_max = django_filters.NumberFilter(field_name="precio", lookup_expr='lte')
    en_stock = django_filters.BooleanFilter(method='filter_en_stock')
    categorias__nombre = django_filters.CharFilter(field_name="categorias__nombre", lookup_expr='icontains', distinct=True)
    destacado = django_filters.BooleanFilter(field_name="destacado")
    
    class Meta:
        model = Producto
        fields = ['categorias__nombre', 'destacado']
        
    def filter_en_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)
