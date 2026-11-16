from rest_framework import serializers
from .models import Reseña
from ordenes.models import Orden, OrdenProducto

class ReseñaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Reseña
        fields = ['id', 'usuario_nombre', 'producto', 'calificacion', 'comentario', 'fecha']
        read_only_fields = ['usuario_nombre', 'fecha']

    def get_usuario_nombre(self, obj):
        return "Comprador Anónimo"

    def validate(self, data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Debe estar autenticado para dejar una reseña.")
        
        producto = data.get('producto')
        
        # Check if the user has purchased this product
        comprado = OrdenProducto.objects.filter(
            orden__usuario=request.user,
            orden__estado__in=['pagado', 'procesando', 'enviado', 'entregado'],
            producto_id=producto.id
        ).exists()
        
        if not comprado:
            raise serializers.ValidationError("Debe comprar el producto antes de poder dejar una reseña.")
            
        return data
