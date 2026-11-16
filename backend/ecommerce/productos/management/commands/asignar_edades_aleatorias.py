import random
from django.core.management.base import BaseCommand
from productos.models import Producto
from categorias.models import Categoria

CATEGORIAS_EDAD = [
    {
        'nombre': '0 - 3 años',
        'descripcion': 'Sets para primera infancia, piezas grandes y seguras (Duplo)'
    },
    {
        'nombre': '4 - 6 años',
        'descripcion': 'Constructores Junior, sets creativos sencillos'
    },
    {
        'nombre': '7 - 11 años',
        'descripcion': 'Aventura, acción y retos intermedios'
    },
    {
        'nombre': '12 - 17 años',
        'descripcion': 'Sets técnicos, mecanismos y réplicas avanzadas'
    },
    {
        'nombre': '18+ Adultos',
        'descripcion': 'Coleccionismo, arquitectura y piezas de exhibición'
    }
]

class Command(BaseCommand):
    help = 'Asigna una categoria de edad aleatoria a cada producto cargado en la base de datos'

    def handle(self, *args, **options):
        # 1. Asegurar la existencia de las categorías de edad
        instancias_edad = []
        for cat_data in CATEGORIAS_EDAD:
            cat, created = Categoria.objects.get_or_create(
                nombre=cat_data['nombre'],
                defaults={
                    'descripcion': cat_data['descripcion'],
                    'activo': True
                }
            )
            instancias_edad.append(cat)
            if created:
                self.stdout.write(f"Categoria creada: {cat.nombre}")

        # Nombres de todas las categorias de edad para identificarlas
        nombres_edades = {c.nombre for c in instancias_edad}

        # 2. Asignar aleatoriamente a cada producto
        productos = Producto.objects.all()
        total_productos = productos.count()

        if total_productos == 0:
            self.stdout.write(self.style.WARNING("No hay productos cargados en la base de datos."))
            return

        conteo_por_edad = {cat.nombre: 0 for cat in instancias_edad}

        for prod in productos:
            # Remover categorías de edad previas si tuviera alguna
            categorias_actuales = prod.categorias.all()
            for cat_existente in categorias_actuales:
                if cat_existente.nombre in nombres_edades:
                    prod.categorias.remove(cat_existente)

            # Seleccionar una categoría de edad al azar
            edad_elegida = random.choice(instancias_edad)
            prod.categorias.add(edad_elegida)
            conteo_por_edad[edad_elegida.nombre] += 1

        self.stdout.write(self.style.SUCCESS(f"[OK] Se asigno una categoria de edad a {total_productos} productos exitosamente:"))
        for nombre, cant in conteo_por_edad.items():
            self.stdout.write(f"  - {nombre}: {cant} productos")
