from rest_framework import serializers
from .models import Cupon

class CuponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cupon
        fields = ['codigo', 'porcentaje_descuento']
