from django.db import models
from django.utils import timezone

class Cupon(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    porcentaje_descuento = models.PositiveIntegerField()
    activo = models.BooleanField(default=True)
    fecha_inicio = models.DateTimeField(default=timezone.now)
    fecha_fin = models.DateTimeField()
    usos_maximos = models.PositiveIntegerField(default=100)
    usos_actuales = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Cupón"
        verbose_name_plural = "Cupones"

    def is_valid(self):
        now = timezone.now()
        if not self.activo:
            return False
        if self.fecha_inicio > now or self.fecha_fin < now:
            return False
        if self.usos_actuales >= self.usos_maximos:
            return False
        return True

    def usar(self):
        if self.is_valid():
            self.usos_actuales += 1
            self.save()
            return True
        return False

    def __str__(self):
        return f"{self.codigo} - {self.porcentaje_descuento}%"
