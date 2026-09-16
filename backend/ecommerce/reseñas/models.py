from django.db import models
from usuarios.models import Usuario
from productos.models import Producto

class Reseña(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='reseñas')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='reseñas')
    calificacion = models.PositiveIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comentario = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        unique_together = ['usuario', 'producto'] # Un usuario solo puede dejar una reseña por producto

    def __str__(self):
        return f"Reseña de {self.usuario.username} para {self.producto.nombre}"
