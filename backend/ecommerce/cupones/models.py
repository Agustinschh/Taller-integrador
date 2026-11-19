from django.db import models
from django.utils import timezone


class Cupon(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cupon')
    codigo = models.CharField(max_length=30, unique=True, db_column='codigo')
    porcentaje_descuento = models.DecimalField(max_digits=5, decimal_places=2, db_column='porcentaje')
    usado = models.BooleanField(default=False, db_column='usado')
    fecha_fin = models.DateTimeField(db_column='fecha_vencimiento')
    activo = models.BooleanField(default=True, db_column='activo')
    fecha_inicio = models.DateTimeField(default=timezone.now, db_column='fecha_inicio')
    usos_maximos = models.PositiveIntegerField(default=100, db_column='usos_maximos')
    usos_actuales = models.PositiveIntegerField(default=0, db_column='usos_actuales')

    class Meta:
        db_table = 'cupon'
        managed = False
        verbose_name = "Cupón"
        verbose_name_plural = "Cupones"

    def is_valid(self):
        now = timezone.now()
        if not self.activo or self.usado:
            return False
        if self.fecha_inicio and self.fecha_inicio > now:
            return False
        if self.fecha_fin and self.fecha_fin < now:
            return False
        if self.usos_actuales >= self.usos_maximos:
            return False
        return True

    def usar(self):
        if self.is_valid():
            self.usos_actuales += 1
            if self.usos_actuales >= self.usos_maximos:
                self.usado = True
            self.save()
            return True
        return False

    def __str__(self):
        return f"{self.codigo} - {self.porcentaje_descuento}%"
