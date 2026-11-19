from rest_framework import serializers
from django.db import connection
from .models import Reseña


class ReseñaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Reseña
        fields = ['id', 'usuario_nombre', 'producto', 'calificacion', 'comentario', 'fecha']
        read_only_fields = ['usuario_nombre', 'fecha']

    def get_usuario_nombre(self, obj):
        return "Comprador Verificado"

    def validate(self, data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Debe estar autenticado para dejar una reseña.")

        producto = data.get('producto')
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1
                FROM linea_compra lc
                JOIN compra c ON c.id_compra = lc.id_compra
                WHERE c.id_usuario = %s AND lc.id_producto = %s
                LIMIT 1
                """,
                [request.user.id, producto.id],
            )
            comprado = cursor.fetchone() is not None

        if not comprado:
            raise serializers.ValidationError("Debe comprar el producto antes de poder dejar una reseña.")

        return data
