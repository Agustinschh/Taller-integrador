from django.core.management.base import BaseCommand
from ofertas.models import Combo, ComboProducto
from productos.models import Producto
from decimal import Decimal

class Command(BaseCommand):
    help = 'Crea combos temáticos en la base de datos a partir de los productos existentes'

    def handle(self, *args, **kwargs):
        if Combo.objects.exists():
            self.stdout.write(self.style.WARNING(f"Ya existen {Combo.objects.count()} combos en la base de datos."))
            return

        # Definir configuraciones de combos a crear
        combo_configs = [
            {
                'nombre': 'Mega Pack Castillo de Hogwarts & Criaturas Mágicas',
                'tema': 'Harry Potter',
                'descuento_pct': Decimal('0.25'),
                'descripcion': 'Vive la magia completa de Hogwarts con el gran castillo y sus sets complementarios exclusivos.',
                'destacado': True,
                'search_keywords': ['hogwarts', 'harry', 'potter', 'crest', 'dobby', 'thestral', 'castle']
            },
            {
                'nombre': 'Super Combo Galáctico: Star Wars Collector Pack',
                'tema': 'Star Wars',
                'descuento_pct': Decimal('0.20'),
                'descripcion': 'El escuadrón definitivo: incluye droides coleccionables, speeder bike y pack de batalla.',
                'destacado': True,
                'search_keywords': ['star wars', 'mandalore', 'speeder', 'r2-d2', 'c-3po', 'battle pack', 'droid']
            },
            {
                'nombre': 'Dúo de Ingeniería: Technic Power & Motors Pack',
                'tema': 'Technic',
                'descuento_pct': Decimal('0.22'),
                'descripcion': 'Combina sets de mecanismos motorizados y energía renovable para proyectos de alto nivel.',
                'destacado': False,
                'search_keywords': ['technic', 'mechanism', 'motor', 'energy', 'power']
            },
            {
                'nombre': 'Pack Maestro Ninja: Spinjitzu & Mini Packs',
                'tema': 'Ninjago',
                'descuento_pct': Decimal('0.30'),
                'descripcion': 'Domina el arte del Spinjitzu con este super pack de combate y minifiguras Ninjago.',
                'destacado': False,
                'search_keywords': ['ninjago', 'spinjitzu', 'zane', 'cole', 'ninja']
            },
            {
                'nombre': 'Combo Pista Extrema: Aston Martin & Supercars',
                'tema': 'Vehículos',
                'descuento_pct': Decimal('0.18'),
                'descripcion': 'Dos íconos del automovilismo deportivo listos para la pista en un combo a precio insuperable.',
                'destacado': False,
                'search_keywords': ['aston martin', 'charger', 'speed', 'car', 'f1', 'racer']
            },
            {
                'nombre': 'Bóveda de Coleccionista: Complete Series & Stars',
                'tema': 'Colección',
                'descuento_pct': Decimal('0.28'),
                'descripcion': 'Packs completos de minifiguras y sets de edición limitada para auténticos coleccionistas.',
                'destacado': True,
                'search_keywords': ['collector', 'series', 'cr7', 'pack', 'edition', 'star']
            }
        ]

        combos_creados = 0
        all_prods = list(Producto.objects.filter(activo=True, stock__gt=0))

        for conf in combo_configs:
            matching_products = []
            for kw in conf['search_keywords']:
                for p in all_prods:
                    if p not in matching_products:
                        p_text = f"{p.nombre} {p.descripcion}".lower()
                        if kw.lower() in p_text:
                            matching_products.append(p)
                    if len(matching_products) >= 3:
                        break
                if len(matching_products) >= 3:
                    break

            # Si no encontró por palabra clave, seleccionar productos de muestra
            if len(matching_products) < 2:
                for p in all_prods:
                    if p not in matching_products:
                        matching_products.append(p)
                    if len(matching_products) >= 2:
                        break

            if not matching_products:
                continue

            selected_prods = matching_products[:3]
            precio_orig = sum(p.precio for p in selected_prods)
            precio_combo = round(precio_orig * (Decimal('1') - conf['descuento_pct']), 0)
            stock_combo = min(p.stock for p in selected_prods) if selected_prods else 5

            combo = Combo.objects.create(
                nombre=conf['nombre'],
                descripcion=conf['descripcion'],
                precio=precio_combo,
                stock=max(1, min(10, stock_combo)),
                tema=conf['tema'],
                destacado=conf['destacado'],
                activo=True
            )

            # Usar imagen del primer producto si tiene
            if selected_prods[0].imagen:
                combo.imagen = selected_prods[0].imagen
                combo.save(update_fields=['imagen'])

            for prod in selected_prods:
                ComboProducto.objects.create(
                    combo=combo,
                    producto=prod,
                    cantidad=1
                )

            combos_creados += 1
            self.stdout.write(self.style.SUCCESS(f"Combo creado: '{combo.nombre}' con {len(selected_prods)} productos por ${precio_combo} (Stock: {combo.stock})"))

        self.stdout.write(self.style.SUCCESS(f"Se crearon exitosamente {combos_creados} combos."))
