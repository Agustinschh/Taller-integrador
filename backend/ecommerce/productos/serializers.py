from rest_framework import serializers
from .models import Producto, Pelicula, Edad
from categorias.models import Categoria
from django.utils import timezone
from django.db import models


class CategoriaSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre']


class ProductoSerializer(serializers.ModelSerializer):
    categorias = serializers.SerializerMethodField()
    categoria_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(), source='categoria', required=False, write_only=True
    )
    categoria = serializers.SerializerMethodField()
    edad = serializers.SerializerMethodField()
    edad_id = serializers.PrimaryKeyRelatedField(
        queryset=Edad.objects.all(), source='edad', required=False, allow_null=True, write_only=True
    )
    pelicula_saga = serializers.SerializerMethodField()
    pelicula_id = serializers.PrimaryKeyRelatedField(
        queryset=Pelicula.objects.all(), source='pelicula', required=False, allow_null=True, write_only=True
    )
    precio_oferta = serializers.SerializerMethodField()
    en_oferta = serializers.SerializerMethodField()
    porcentaje_descuento = serializers.SerializerMethodField()
    imagen = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'precio', 'stock', 'destacado',
            'categoria', 'categoria_id', 'categorias', 'categoria_ids',
            'edad', 'edad_id', 'pelicula_saga', 'pelicula_id',
            'imagen', 'activo', 'creado',
            'precio_oferta', 'en_oferta', 'porcentaje_descuento',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.imagen:
            img_str = str(instance.imagen)
            if not img_str.startswith('http'):
                request = self.context.get('request')
                if request is not None:
                    data['imagen'] = request.build_absolute_uri(instance.imagen.url)
                else:
                    data['imagen'] = instance.imagen.url
            else:
                data['imagen'] = img_str
        else:
            data['imagen'] = None
        return data

    def get_categorias(self, obj):
        res = []
        if obj.categoria:
            res.append({'id': obj.categoria.id, 'nombre': obj.categoria.nombre})
        if obj.edad:
            res.append({'id': obj.edad.id, 'nombre': obj.edad.rango})
        return res

    def get_categoria(self, obj):
        return obj.categoria.nombre if obj.categoria else 'Colección'

    def get_edad(self, obj):
        return obj.edad.rango if obj.edad else 'Todas las edades'

    def get_pelicula_saga(self, obj):
        if obj.pelicula:
            return obj.pelicula.nombre
        return obj.categoria.nombre if obj.categoria else 'Colección Clásica'

    def get_en_oferta(self, obj):
        now = timezone.now()
        return obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now,
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).exists()

    def get_precio_oferta(self, obj):
        now = timezone.now()
        oferta = obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now,
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        if oferta:
            return oferta.precio_con_descuento
        return None

    def get_porcentaje_descuento(self, obj):
        now = timezone.now()
        oferta = obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now,
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        if oferta:
            return oferta.porcentaje_descuento
        return None

    def _resolve_categoria(self, validated_data):
        cat_ids = validated_data.pop('categoria_ids', None)
        if 'categoria' not in validated_data or validated_data['categoria'] is None:
            if cat_ids:
                cat = Categoria.objects.filter(id__in=cat_ids).first()
                if cat:
                    validated_data['categoria'] = cat
            if 'categoria' not in validated_data or validated_data['categoria'] is None:
                default_cat, _ = Categoria.objects.get_or_create(
                    nombre='Colección',
                    defaults={'descripcion': 'Categoría general', 'activo': True},
                )
                validated_data['categoria'] = default_cat

    def create(self, validated_data):
        self._resolve_categoria(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        cat_ids = validated_data.pop('categoria_ids', None)
        if cat_ids and 'categoria' not in validated_data:
            cat = Categoria.objects.filter(id__in=cat_ids).first()
            if cat:
                validated_data['categoria'] = cat
        return super().update(instance, validated_data)

    def validate(self, data):
        activo = data.get('activo', getattr(self.instance, 'activo', True) if self.instance else True)
        if not activo:
            data['destacado'] = False
        return data
