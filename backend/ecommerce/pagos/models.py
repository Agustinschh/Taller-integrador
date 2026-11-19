from django.db import models
from ordenes.models import Orden


class Pago(models.Model):
    ESTADO_MAP = {
        'pendiente': 'PENDIENTE',
        'pending': 'PENDIENTE',
        'aprobado': 'APROBADO',
        'approved': 'APROBADO',
        'completado': 'APROBADO',
        'pagado': 'APROBADO',
        'cancelado': 'CANCELADO',
        'cancelled': 'CANCELADO',
        'rechazado': 'CANCELADO',
        'rejected': 'CANCELADO',
    }

    id = models.AutoField(primary_key=True, db_column='id_pago')
    orden = models.OneToOneField(
        Orden,
        on_delete=models.CASCADE,
        related_name='pago',
        db_column='id_compra',
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2, db_column='monto')
    payment_method = models.CharField(max_length=20, default='MERCADOPAGO', db_column='metodo_pago')
    estado = models.CharField(max_length=30, default='PENDIENTE', db_column='estado_pago')
    fecha = models.DateTimeField(auto_now_add=True, db_column='fecha')

    preference_id = models.CharField(max_length=100, null=True, blank=True, db_column='preference_id')
    payment_id = models.CharField(max_length=100, null=True, blank=True, db_column='payment_id')
    payment_type = models.CharField(max_length=50, null=True, blank=True, db_column='payment_type')

    class Meta:
        db_table = 'pago'
        managed = False

    def save(self, *args, **kwargs):
        # La restriccion ck_pago_metodo requiere 'MERCADOPAGO'
        self.payment_method = 'MERCADOPAGO'
        # Normalizar estado al ENUM estado_pago_enum ('PENDIENTE', 'APROBADO', 'CANCELADO')
        if self.estado:
            self.estado = self.ESTADO_MAP.get(str(self.estado).lower(), 'PENDIENTE')
        else:
            self.estado = 'PENDIENTE'
        super().save(*args, **kwargs)

    @property
    def usuario(self):
        return self.orden.usuario if self.orden else None

    def __str__(self):
        return f"Pago #{self.id} - Compra #{self.orden_id} - {self.estado} (${self.monto})"
