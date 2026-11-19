from rest_framework import serializers
from django.db import connection
from .models import Orden


def obtener_lineas_compra(orden_id):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT lc.id_producto, p.nombre_producto, lc.precio_unitario, lc.cantidad, lc.subtotal
            FROM linea_compra lc
            JOIN producto p ON p.id_producto = lc.id_producto
            WHERE lc.id_compra = %s
            ORDER BY lc.id_producto
            """,
            [orden_id],
        )
        rows = cursor.fetchall()
    return [
        {
            'id': r[0],
            'orden': orden_id,
            'producto_id': r[0],
            'nombre_producto': r[1],
            'precio_producto': float(r[2]),
            'cantidad': r[3],
            'subtotal': float(r[4]),
        }
        for r in rows
    ]


class OrdenSerializer(serializers.ModelSerializer):
    productos = serializers.SerializerMethodField()
    total_productos = serializers.SerializerMethodField()
    fecha_formateada = serializers.SerializerMethodField()
    metodo_entrega_display = serializers.SerializerMethodField()
    direccion_envio = serializers.ReadOnlyField()
    email_contacto = serializers.ReadOnlyField()
    nombre_completo = serializers.ReadOnlyField()

    class Meta:
        model = Orden
        fields = '__all__'

    def get_productos(self, obj):
        return obtener_lineas_compra(obj.id)

    def get_total_productos(self, obj):
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM linea_compra WHERE id_compra = %s", [obj.id])
            return cursor.fetchone()[0]

    def get_fecha_formateada(self, obj):
        return obj.fecha.strftime('%d/%m/%Y %H:%M') if obj.fecha else ''

    def get_metodo_entrega_display(self, obj):
        return obj.get_metodo_entrega_display()


class OrdenInvitadoSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nombre = serializers.CharField(max_length=100)
    telefono = serializers.CharField(max_length=20)
    direccion = serializers.CharField(max_length=500)
    metodo_entrega = serializers.ChoiceField(
        choices=[('delivery', 'Delivery a Domicilio'), ('retiro', 'Retiro en Tienda')],
        default='delivery',
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate_nombre(self, value):
        return value.strip().title()

    def validate_telefono(self, value):
        return value.strip()

    def validate_metodo_entrega(self, value):
        if value not in ['delivery', 'retiro']:
            raise serializers.ValidationError("Método de entrega inválido")
        return value
