from django.db import models
from ordenes.models import Orden


class Envio(models.Model):
    ESTADO_MAP = {
        'pendiente': 'PREPARACION',
        'preparacion': 'PREPARACION',
        'en_camino': 'EN_CAMINO',
        'enviado': 'EN_CAMINO',
        'entregado': 'ENTREGADO',
    }

    id = models.AutoField(primary_key=True, db_column='id_envio')
    orden = models.OneToOneField(
        Orden,
        on_delete=models.CASCADE,
        related_name='envio',
        db_column='id_compra',
    )
    direccion = models.CharField(max_length=150, db_column='direccion_destino')
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='costo')
    estado = models.CharField(max_length=30, default='PREPARACION', db_column='envio_estado')
    tipo = models.CharField(max_length=30, default='delivery', db_column='tipo')
    fecha = models.DateTimeField(auto_now_add=True, db_column='fecha')

    class Meta:
        db_table = 'envio'
        managed = False

    def save(self, *args, **kwargs):
        if self.estado:
            self.estado = self.ESTADO_MAP.get(str(self.estado).lower(), 'PREPARACION')
        else:
            self.estado = 'PREPARACION'
        if self.direccion and len(self.direccion) > 150:
            self.direccion = self.direccion[:150]
        super().save(*args, **kwargs)

    @property
    def usuario(self):
        return self.orden.usuario if self.orden else None

    def __str__(self):
        return f"Envio #{self.id} - Compra #{self.orden_id} ({self.estado})"


class ConfiguracionEnvio(models.Model):
    costo_base_envio = models.DecimalField(max_digits=10, decimal_places=2, default=3500)
    monto_envio_gratis = models.DecimalField(max_digits=10, decimal_places=2, default=50000)

    class Meta:
        verbose_name = "Configuración de Envío"
        verbose_name_plural = "Configuraciones de Envío"

    def save(self, *args, **kwargs):
        if not self.pk and ConfiguracionEnvio.objects.exists():
            return
        return super().save(*args, **kwargs)

    def __str__(self):
        return "Configuración Global de Envío"
