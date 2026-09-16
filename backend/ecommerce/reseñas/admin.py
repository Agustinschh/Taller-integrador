from django.contrib import admin
from .models import Reseña

@admin.register(Reseña)
class ReseñaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'producto', 'calificacion', 'fecha')
    list_filter = ('calificacion', 'fecha', 'producto')
    search_fields = ('usuario__username', 'producto__nombre', 'comentario')
