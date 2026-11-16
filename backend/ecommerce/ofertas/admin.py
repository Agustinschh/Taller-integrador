from django.contrib import admin
from django.utils.html import format_html
from .models import Oferta

@admin.register(Oferta)
class OfertaAdmin(admin.ModelAdmin):
    list_display = [
        'producto',
        'porcentaje_descuento',
        'precio_original',
        'precio_con_descuento_display',
        'activo',
        'fecha_inicio',
        'fecha_fin',
        'is_active_display'
    ]
    list_filter = ['activo', 'fecha_inicio', 'fecha_fin', 'producto__categorias']
    search_fields = ['producto__nombre', 'descripcion']
    list_editable = ['activo', 'porcentaje_descuento']
    date_hierarchy = 'fecha_inicio'

    def precio_original(self, obj):
        precio = f"${obj.producto.precio:,.0f}"
        return precio
    precio_original.short_description = "Precio Original"

    def precio_con_descuento_display(self, obj):
        precio_descuento = obj.precio_con_descuento
        precio_formateado = f"${precio_descuento:,.0f}"
        return format_html(
            '<span style="color: #e74c3c; font-weight: bold;">{}</span>',
            precio_formateado
        )
    precio_con_descuento_display.short_description = "Precio c/Descuento"

    def is_active_display(self, obj):
        if obj.is_active():
            return format_html('<span style="color: green;">✓ Activa</span>')
        return format_html('<span style="color: red;">✗ Inactiva</span>')
    is_active_display.short_description = "Estado"

    fieldsets = (
        ('Información básica', {
            'fields': ('producto', 'porcentaje_descuento', 'descripcion')
        }),
        ('Configuración', {
            'fields': ('activo', 'fecha_inicio', 'fecha_fin')
        }),
    )


from .models import Combo, ComboProducto
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.db import transaction


class ComboProductoInline(admin.TabularInline):
    model = ComboProducto
    extra = 2
    autocomplete_fields = ['producto']
    fields = ['producto', 'cantidad']


@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = [
        'nombre',
        'precio_display',
        'precio_original_display',
        'ahorro_display',
        'stock',
        'tema',
        'activo',
        'destacado',
        'created_at'
    ]
    list_filter = ['activo', 'destacado', 'tema', 'created_at']
    search_fields = ['nombre', 'descripcion', 'tema']
    list_editable = ['activo', 'destacado', 'stock']
    inlines = [ComboProductoInline]

    def precio_display(self, obj):
        return format_html('<span style="font-weight: bold; color: #283655;">${:,.0f}</span>', obj.precio)
    precio_display.short_description = "Precio Combo"

    def precio_original_display(self, obj):
        return f"${obj.precio_original_total:,.0f}"
    precio_original_display.short_description = "Valor Catálogo"

    def ahorro_display(self, obj):
        ahorro = obj.porcentaje_ahorro
        if ahorro > 0:
            return format_html('<span style="color: #16a34a; font-weight: bold;">-{}% Ahorro</span>', ahorro)
        return "0%"
    ahorro_display.short_description = "Descuento"

    def save_related(self, request, form, formsets, change):
        """
        Al guardar el combo y sus productos relacionados, valida y descuenta
        automáticamente el stock de cada producto individual según el stock del combo.
        """
        super().save_related(request, form, formsets, change)
        combo = form.instance
        if combo.stock > 0:
            try:
                # Validar disponibilidad de stock en cada producto
                with transaction.atomic():
                    for item in combo.items.select_related('producto'):
                        unidades = combo.stock * item.cantidad
                        if item.producto.stock < unidades:
                            messages.warning(
                                request,
                                f"⚠️ Advertencia: El producto '{item.producto.nombre}' solo tiene {item.producto.stock} en stock. "
                                f"Se requieren {unidades} unidades para {combo.stock} combos."
                            )
            except Exception as e:
                messages.error(request, f"Error al procesar stock del combo: {str(e)}")