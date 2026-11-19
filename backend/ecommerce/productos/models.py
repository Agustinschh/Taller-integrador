from django.db import models
from categorias.models import Categoria


class Pelicula(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_pelicula')
    nombre = models.CharField(max_length=50, unique=True, db_column='nombre_pelicula')

    class Meta:
        db_table = 'pelicula'
        managed = False
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Edad(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_edad')
    rango = models.CharField(max_length=20, unique=True, db_column='rango')

    class Meta:
        db_table = 'edad'
        managed = False
        ordering = ['id']

    def __str__(self):
        return self.rango


class Producto(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_producto')
    nombre = models.CharField(max_length=100, db_column='nombre_producto')
    descripcion = models.CharField(max_length=300, blank=True, null=True, db_column='descripcion')
    precio = models.DecimalField(max_digits=10, decimal_places=2, db_column='precio')
    stock = models.IntegerField(default=0, db_column='stock')
    destacado = models.BooleanField(default=False, db_column='destacado')
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='productos',
        db_column='id_categoria',
    )
    edad = models.ForeignKey(
        Edad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos',
        db_column='id_edad',
    )
    pelicula = models.ForeignKey(
        Pelicula,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos',
        db_column='id_pelicula',
    )
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True, db_column='imagen')
    activo = models.BooleanField(default=True, db_column='activo')
    creado = models.DateTimeField(auto_now_add=True, db_column='creado')

    class Meta:
        db_table = 'producto'
        managed = False

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.activo:
            self.destacado = False
        if self.descripcion and len(self.descripcion) > 300:
            self.descripcion = self.descripcion[:300]
        super().save(*args, **kwargs)


class MovimientoStock(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_movimiento')
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='movimientos_stock',
        db_column='id_producto',
    )
    compra = models.ForeignKey(
        'ordenes.Orden',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_stock',
        db_column='id_compra',
    )
    tipo_movimiento = models.CharField(max_length=30, db_column='tipo_movimiento')
    cantidad = models.IntegerField(db_column='cantidad')
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='costo_unitario')
    fecha_movimiento = models.DateTimeField(auto_now_add=True, db_column='fecha_movimiento')

    class Meta:
        db_table = 'movimiento_stock'
        managed = False
        ordering = ['-fecha_movimiento']

    def __str__(self):
        return f"{self.tipo_movimiento} ({self.cantidad}) - {self.producto.nombre}"
