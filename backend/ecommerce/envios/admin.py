from django.contrib import admin
from .models import Envio, ConfiguracionEnvio

@admin.register(Envio)
class EnvioAdmin(admin.ModelAdmin):
    list_display = ('id', 'orden', 'tipo', 'estado', 'costo', 'fecha')
    list_filter = ('tipo', 'estado', 'fecha')
    search_fields = ('orden__id', 'direccion')

@admin.register(ConfiguracionEnvio)
class ConfiguracionEnvioAdmin(admin.ModelAdmin):
    list_display = ('costo_base_envio', 'monto_envio_gratis')
