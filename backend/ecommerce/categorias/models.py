from django.db import models


class Categoria(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_categoria')
    nombre = models.CharField(max_length=50, unique=True, db_column='nombre_categoria')
    descripcion = models.CharField(max_length=200, blank=True, null=True, db_column='descripcion')
    activo = models.BooleanField(default=True, db_column='activo')

    class Meta:
        db_table = 'categoria'
        managed = False
        ordering = ['nombre']

    def __str__(self):
        return self.nombre
