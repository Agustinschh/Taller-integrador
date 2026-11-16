import django_filters
from django.db import models
from .models import Producto

class ProductoFilter(django_filters.FilterSet):
    precio_min = django_filters.NumberFilter(field_name="precio", lookup_expr='gte')
    precio_max = django_filters.NumberFilter(field_name="precio", lookup_expr='lte')
    en_stock = django_filters.BooleanFilter(method='filter_en_stock')
    categorias__nombre = django_filters.CharFilter(field_name="categorias__nombre", lookup_expr='icontains', distinct=True)
    destacado = django_filters.BooleanFilter(field_name="destacado")
    pelicula = django_filters.CharFilter(method='filter_pelicula_saga')
    saga = django_filters.CharFilter(method='filter_pelicula_saga')
    edad = django_filters.CharFilter(method='filter_edad')
    
    class Meta:
        model = Producto
        fields = ['categorias__nombre', 'destacado', 'pelicula', 'saga', 'edad']
        
    def filter_en_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)

    def filter_pelicula_saga(self, queryset, name, value):
        if not value:
            return queryset
        val = value.strip()
        # Mapeo de sagas a términos de búsqueda en BD
        saga_keywords = {
            'star wars': ['star wars'],
            'harry potter': ['harry potter', 'fantastic beasts', 'hogwarts'],
            'marvel': ['marvel', 'infinity saga', 'spider-man', 'spiderman', 'iron man', 'avengers', 'x-men', 'guardians of the galaxy'],
            'dc / batman': ['batman', 'dc comics', 'super heroes dc', 'superman', 'justice league'],
            'dc': ['batman', 'dc comics', 'super heroes dc', 'superman', 'justice league'],
            'batman': ['batman', 'dc comics', 'the lego batman movie'],
            'jurassic world': ['jurassic'],
            'super mario': ['mario'],
            'el señor de los anillos': ['lord of the rings', 'hobbit'],
            'disney': ['disney', 'frozen', 'toy story', 'mickey', 'princess'],
            'minecraft': ['minecraft'],
            'ninjago': ['ninjago'],
            'technic': ['technic'],
            'speed champions': ['speed champions'],
            'city': ['city', 'police', 'town'],
            'friends': ['friends'],
            'pokémon': ['pok'],
            'pokemon': ['pok'],
            'fortnite': ['fortnite'],
            'one piece': ['one piece'],
            'animal crossing': ['animal crossing'],
        }
        
        keywords = saga_keywords.get(val.lower(), [val])
        q_obj = models.Q()
        for kw in keywords:
            q_obj |= models.Q(categorias__nombre__icontains=kw) | models.Q(nombre__icontains=kw)
        return queryset.filter(q_obj).distinct()

    def filter_edad(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(categorias__nombre__icontains=value.strip()).distinct()
