from django.db import models
from usuarios.models import Usuario


class Carrito(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_carrito')
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='carrito',
        null=True,
        blank=True,
        db_column='id_usuario',
    )
    session_key = models.CharField(max_length=64, unique=True, null=True, blank=True, db_column='session_key')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='total')

    class Meta:
        db_table = 'carrito'
        managed = False

    def __str__(self):
        if self.usuario:
            return f"Carrito #{self.id} - {self.usuario.username} (${self.total})"
        return f"Carrito #{self.id} - Invitado ({self.session_key})"
