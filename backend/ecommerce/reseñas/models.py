from django.db import models
from usuarios.models import Usuario
from productos.models import Producto


class Reseña(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_comentario')
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='reseñas',
        db_column='id_usuario',
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='reseñas',
        db_column='id_producto',
    )
    comentario = models.CharField(max_length=300, db_column='texto')
    calificacion = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)], db_column='calificacion')
    fecha = models.DateTimeField(auto_now_add=True, db_column='fecha')

    class Meta:
        db_table = 'comentario'
        managed = False
        ordering = ['-fecha']

    def __str__(self):
        return f"Comentario de {self.usuario.username} para {self.producto.nombre}"
