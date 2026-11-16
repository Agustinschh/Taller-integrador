from django.db import models
from django.utils import timezone
from productos.models import Producto

class Oferta(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='ofertas')
    porcentaje_descuento = models.PositiveIntegerField(
        help_text="Porcentaje de descuento (ej: 25 para 25%)"
    )
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_inicio = models.DateTimeField(default=timezone.now)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['producto'] 

    def __str__(self):
        return f"Oferta {self.porcentaje_descuento}% - {self.producto.nombre}"

    @property
    def precio_con_descuento(self):
        
        descuento = (self.producto.precio * self.porcentaje_descuento) / 100
        return self.producto.precio - descuento
    
    def aplicar_descuento(self):
        
        return self.precio_con_descuento

    def is_active(self):
        now = timezone.now()
        if not self.activo:
            return False
        if self.fecha_fin and now > self.fecha_fin:
            return False
        return now >= self.fecha_inicio


class Combo(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio especial del combo")
    stock = models.PositiveIntegerField(default=0, help_text="Cantidad de combos armados disponibles")
    imagen = models.ImageField(upload_to='combos/', null=True, blank=True)
    imagen_url = models.URLField(max_length=500, null=True, blank=True)
    tema = models.CharField(max_length=100, default='Especial', blank=True)
    activo = models.BooleanField(default=True)
    destacado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Combo: {self.nombre} (Stock: {self.stock})"

    def delete(self, *args, **kwargs):
        if self.stock > 0:
            try:
                self.devolver_stock_productos(self.stock)
            except Exception:
                pass
        super().delete(*args, **kwargs)

    @property
    def precio_original_total(self):
        return sum(item.producto.precio * item.cantidad for item in self.items.all())

    @property
    def porcentaje_ahorro(self):
        orig = float(self.precio_original_total)
        precio_actual = float(self.precio)
        if orig > 0 and precio_actual < orig:
            return round(((orig - precio_actual) / orig) * 100)
        return 0

    def descontar_stock_productos(self, cantidad_combos):
        """
        Descuenta el stock de los productos que componen el combo al crear o armar combos.
        """
        from django.db import transaction
        from django.core.exceptions import ValidationError

        if cantidad_combos <= 0:
            return

        with transaction.atomic():
            for item in self.items.select_related('producto'):
                unidades = cantidad_combos * item.cantidad
                if item.producto.stock < unidades:
                    raise ValidationError(
                        f"Stock insuficiente en '{item.producto.nombre}'. "
                        f"Se requieren {unidades} y hay {item.producto.stock} disponibles."
                    )
                item.producto.stock -= unidades
                item.producto.save(update_fields=['stock'])

    def devolver_stock_productos(self, cantidad_combos):
        """
        Devuelve el stock a los productos individuales si se cancela o desarma un combo.
        """
        from django.db import transaction

        if cantidad_combos <= 0:
            return

        with transaction.atomic():
            for item in self.items.select_related('producto'):
                unidades = cantidad_combos * item.cantidad
                item.producto.stock += unidades
                item.producto.save(update_fields=['stock'])


class ComboProducto(models.Model):
    combo = models.ForeignKey(Combo, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='combo_items')
    cantidad = models.PositiveIntegerField(default=1, help_text="Cantidad de este producto incluida en 1 combo")

    class Meta:
        unique_together = ['combo', 'producto']

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en {self.combo.nombre}"