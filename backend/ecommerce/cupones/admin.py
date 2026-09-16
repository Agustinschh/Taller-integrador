from django.contrib import admin
from .models import Cupon

@admin.register(Cupon)
class CuponAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'porcentaje_descuento', 'activo', 'fecha_inicio', 'fecha_fin', 'usos_actuales', 'usos_maximos')
    list_filter = ('activo', 'fecha_inicio', 'fecha_fin')
    search_fields = ('codigo',)
