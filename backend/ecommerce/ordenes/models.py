from django.db import models
from usuarios.models import Usuario


class Orden(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('procesando', 'Procesando'),
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]

    METODO_ENTREGA_CHOICES = [
        ('delivery', 'Delivery a Domicilio'),
        ('retiro', 'Retiro en Tienda'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_compra')
    fecha = models.DateTimeField(auto_now_add=True, db_column='fecha')
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='ordenes',
        null=True,
        blank=True,
        db_column='id_usuario',
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='subtotal')
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='descuento')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='total')
    cupon = models.ForeignKey(
        'cupones.Cupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes',
        db_column='id_cupon',
    )

    session_key = models.CharField(max_length=40, null=True, blank=True, db_column='session_key')
    email_invitado = models.EmailField(null=True, blank=True, db_column='email_invitado')
    nombre_invitado = models.CharField(max_length=100, null=True, blank=True, db_column='nombre_invitado')
    telefono_invitado = models.CharField(max_length=20, null=True, blank=True, db_column='telefono_invitado')
    direccion_invitado = models.TextField(null=True, blank=True, db_column='direccion_invitado')
    metodo_entrega = models.CharField(
        max_length=20,
        choices=METODO_ENTREGA_CHOICES,
        default='delivery',
        verbose_name='Método de Entrega',
        db_column='metodo_entrega',
    )
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_column='costo_envio')
    estado = models.CharField(
        max_length=30,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name='Estado de la Orden',
        db_column='estado',
    )

    class Meta:
        db_table = 'compra'
        managed = False
        ordering = ['-fecha']

    def __str__(self):
        if self.usuario:
            return f"Compra #{self.id} - {self.usuario.username}"
        return f"Compra #{self.id} - Invitado ({self.email_invitado})"

    @property
    def direccion_envio(self):
        if self.usuario:
            return self.usuario.direccion
        return self.direccion_invitado

    @property
    def email_contacto(self):
        if self.usuario:
            return self.usuario.email
        return self.email_invitado

    @property
    def nombre_completo(self):
        if self.usuario:
            if self.usuario.first_name and self.usuario.last_name:
                return f"{self.usuario.first_name} {self.usuario.last_name}"
            return self.usuario.username
        return self.nombre_invitado
