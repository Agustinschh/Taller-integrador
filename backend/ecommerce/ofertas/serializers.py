from rest_framework import serializers
from .models import Oferta, Combo, ComboProducto
from productos.models import Producto
from productos.serializers import ProductoSerializer
from django.db import transaction
import json

class OfertaSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)
    precio_con_descuento = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Oferta
        fields = [
            'id',
            'producto',
            'porcentaje_descuento',
            'descripcion',
            'activo',
            'fecha_inicio',
            'fecha_fin',
            'precio_con_descuento',
            'is_active',
            'created_at'
        ]


class ComboProductoSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)
    producto_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ComboProducto
        fields = ['id', 'producto', 'producto_id', 'cantidad']


class ComboSerializer(serializers.ModelSerializer):
    items = ComboProductoSerializer(many=True, read_only=True)
    items_input = serializers.CharField(write_only=True, required=False)
    precio_original_total = serializers.ReadOnlyField()
    porcentaje_ahorro = serializers.ReadOnlyField()
    imagen = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Combo
        fields = [
            'id',
            'nombre',
            'descripcion',
            'precio',
            'stock',
            'imagen',
            'imagen_url',
            'tema',
            'activo',
            'destacado',
            'precio_original_total',
            'porcentaje_ahorro',
            'items',
            'items_input',
            'created_at'
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
        elif instance.imagen_url:
            data['imagen'] = instance.imagen_url
        else:
            data['imagen'] = None
        return data

    def create(self, validated_data):
        items_input_raw = validated_data.pop('items_input', None)
        
        with transaction.atomic():
            combo = Combo.objects.create(**validated_data)
            
            # Parsear items_input si viene como JSON string o lista
            items_list = []
            if items_input_raw:
                try:
                    if isinstance(items_input_raw, str):
                        items_list = json.loads(items_input_raw)
                    elif isinstance(items_input_raw, list):
                        items_list = items_input_raw
                except Exception as e:
                    raise serializers.ValidationError({"items_input": f"Formato inválido de items: {str(e)}"})

            for item in items_list:
                prod_id = item.get('producto_id') or item.get('id')
                cant = int(item.get('cantidad', 1))
                if prod_id:
                    ComboProducto.objects.create(
                        combo=combo,
                        producto_id=prod_id,
                        cantidad=cant
                    )

            # El stock de los productos individuales se descuenta al concretar la compra
            # mediante los triggers de PostgreSQL (linea_compra -> movimiento_stock -> producto.stock).
            return combo

    def update(self, instance, validated_data):
        items_input_raw = validated_data.pop('items_input', None)

        with transaction.atomic():
            if items_input_raw is not None:
                instance.items.all().delete()
                items_list = []
                try:
                    if isinstance(items_input_raw, str):
                        items_list = json.loads(items_input_raw)
                    elif isinstance(items_input_raw, list):
                        items_list = items_input_raw
                except Exception as e:
                    raise serializers.ValidationError({"items_input": f"Formato inválido de items: {str(e)}"})

                for item in items_list:
                    prod_id = item.get('producto_id') or item.get('id')
                    cant = int(item.get('cantidad', 1))
                    if prod_id:
                        ComboProducto.objects.create(
                            combo=instance,
                            producto_id=prod_id,
                            cantidad=cant
                        )

            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            instance.save()
            return instance