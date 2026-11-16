from rest_framework import serializers
from .models import Producto
from categorias.models import Categoria
from django.utils import timezone
from django.db import models

class CategoriaSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre']

class ProductoSerializer(serializers.ModelSerializer):
    categorias = CategoriaSimpleSerializer(many=True, read_only=True)
    categoria_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Categoria.objects.all(), source='categorias', required=False, write_only=True
    )
    categoria = serializers.SerializerMethodField()
    edad = serializers.SerializerMethodField()
    pelicula_saga = serializers.SerializerMethodField()
    precio_oferta = serializers.SerializerMethodField()
    en_oferta = serializers.SerializerMethodField()
    porcentaje_descuento = serializers.SerializerMethodField()
    imagen = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Producto
        fields = '__all__'
    
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

    def get_categoria(self, obj):
        cats = [c.nombre for c in obj.categorias.all() if 'año' not in c.nombre.lower() and 'adulto' not in c.nombre.lower()]
        return cats[0] if cats else 'Colección'

    def get_edad(self, obj):
        for cat in obj.categorias.all():
            nombre = cat.nombre.lower()
            if 'año' in nombre or 'años' in nombre or 'adulto' in nombre:
                return cat.nombre
        return 'Todas las edades'

    def get_pelicula_saga(self, obj):
        cats = [c.nombre for c in obj.categorias.all() if 'año' not in c.nombre.lower() and 'adulto' not in c.nombre.lower()]
        all_text = ' '.join(cats + [obj.nombre]).lower()
        if 'star wars' in all_text: return 'Star Wars'
        if 'harry potter' in all_text or 'fantastic beasts' in all_text or 'hogwarts' in all_text: return 'Harry Potter'
        if 'marvel' in all_text or 'infinity saga' in all_text or 'spider-man' in all_text or 'spiderman' in all_text or 'iron man' in all_text or 'avengers' in all_text: return 'Marvel'
        if 'batman' in all_text or 'dc comics' in all_text or 'super heroes dc' in all_text or 'superman' in all_text: return 'DC / Batman'
        if 'jurassic' in all_text: return 'Jurassic World'
        if 'mario' in all_text: return 'Super Mario'
        if 'lord of the rings' in all_text or 'hobbit' in all_text or 'señor de los anillos' in all_text: return 'El Señor de los Anillos'
        if 'disney' in all_text or 'frozen' in all_text or 'toy story' in all_text or 'mickey' in all_text: return 'Disney'
        if 'minecraft' in all_text: return 'Minecraft'
        if 'ninjago' in all_text: return 'Ninjago'
        if 'pok' in all_text: return 'Pokémon'
        if 'fortnite' in all_text: return 'Fortnite'
        if 'one piece' in all_text: return 'One Piece'
        if 'speed champions' in all_text: return 'Speed Champions'
        if 'technic' in all_text: return 'Technic'
        if 'friends' in all_text: return 'Friends'
        if 'city' in all_text or 'police' in all_text or 'town' in all_text: return 'City'
        if 'animal crossing' in all_text: return 'Animal Crossing'
        if cats: return cats[0]
        return 'Colección Clásica'
    
    def get_en_oferta(self, obj):
        """Verifica si el producto tiene una oferta activa"""
        now = timezone.now()
        oferta = obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        return oferta is not None
    
    def get_precio_oferta(self, obj):
        """Calcula el precio con oferta si existe una oferta activa"""
        now = timezone.now()
        oferta = obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        
        if oferta:
            return oferta.precio_con_descuento
        return None
    
    def get_porcentaje_descuento(self, obj):
        """Devuelve el porcentaje de descuento si existe una oferta activa"""
        now = timezone.now()
        oferta = obj.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        
        if oferta:
            return oferta.porcentaje_descuento
        return None

    def validate(self, data):
        activo = data.get('activo', getattr(self.instance, 'activo', True) if self.instance else True)
        if not activo:
            data['destacado'] = False
        return data