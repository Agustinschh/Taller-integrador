from django.db import models
from usuarios.models import Usuario
from ordenes.models import Orden

class Envio(models.Model):
	usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='envios')
	orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='envios')
	direccion = models.CharField(max_length=255)
	tipo = models.CharField(max_length=30, default='retiro')
	estado = models.CharField(max_length=30, default='pendiente')
	fecha = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Envio #{self.id} - {self.usuario.username} - {self.tipo}"

class ConfiguracionEnvio(models.Model):
    costo_base_envio = models.DecimalField(max_digits=10, decimal_places=2, default=4850)
    monto_envio_gratis = models.DecimalField(max_digits=10, decimal_places=2, default=50000)

    class Meta:
        verbose_name = "Configuración de Envío"
        verbose_name_plural = "Configuraciones de Envío"

    def save(self, *args, **kwargs):
        # Asegurar que solo haya una instancia
        if not self.pk and ConfiguracionEnvio.objects.exists():
            return
        return super().save(*args, **kwargs)

    def __str__(self):
        return "Configuración Global de Envío"
