from rest_framework import serializers
from .models import Carrito


class CarritoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrito
        fields = ['id', 'usuario', 'session_key', 'total']
