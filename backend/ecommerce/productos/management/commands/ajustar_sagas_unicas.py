from django.core.management.base import BaseCommand
from productos.models import Producto
from categorias.models import Categoria

SAGAS_CONFIG = [
    {'nombre': 'Star Wars', 'descripcion': 'Universo Star Wars, naves, droides y Caballeros Jedi'},
    {'nombre': 'Harry Potter', 'descripcion': 'Mundo Mágico de Hogwarts, personajes y criaturas fantásticas'},
    {'nombre': 'Marvel', 'descripcion': 'Superhéroes Marvel, Avengers, Spider-Man e Infinity Saga'},
    {'nombre': 'DC / Batman', 'descripcion': 'Universo DC Comics, Batman, Gotham City y Liga de la Justicia'},
    {'nombre': 'El Señor de los Anillos', 'descripcion': 'Tierra Media, El Hobbit y El Señor de los Anillos'},
    {'nombre': 'Jurassic World', 'descripcion': 'Dinosaurios, expediciones y aventuras en Isla Nublar'},
    {'nombre': 'Super Mario', 'descripcion': 'Mundo de Nintendo, Mario, Luigi, Bowser y carreras'},
    {'nombre': 'Disney', 'descripcion': 'Clásicos Disney, Pixar, Princesas y Toy Story'},
    {'nombre': 'Minecraft', 'descripcion': 'Construcción y aventuras del videojuego Minecraft'},
    {'nombre': 'Ninjago', 'descripcion': 'Guerreros Ninja, dragones, mechas y el poder del Spinjitzu'},
    {'nombre': 'Technic', 'descripcion': 'Vehículos de ingeniería, superdeportivos y mecanismos avanzados'},
    {'nombre': 'Speed Champions', 'descripcion': 'Autos de carrera legendarios e hiperdeportivos'},
    {'nombre': 'City', 'descripcion': 'Vida urbana, policías, bomberos, trenes y construcciones'},
    {'nombre': 'Stranger Things', 'descripcion': 'Serie Stranger Things, Upside Down y Hawkins'},
    {'nombre': 'Shrek', 'descripcion': 'Mundo de Shrek, Burro y personajes de Muy Muy Lejano'},
    {'nombre': 'Pokémon', 'descripcion': 'Criaturas Pokémon, batallas y coleccionismo'},
    {'nombre': 'Fortnite', 'descripcion': 'Videojuego Fortnite, skins, pases de batalla y accesorios'},
    {'nombre': 'Animal Crossing', 'descripcion': 'Isla de Animal Crossing y personajes de Nintendo'},
    {'nombre': 'One Piece', 'descripcion': 'Anime One Piece, Piratas de Sombrero de Paja'},
    {'nombre': 'Friends', 'descripcion': 'Heartlake City, amistad y vida cotidiana'},
    {'nombre': 'Creator & Icons', 'descripcion': 'Sets clásicos, arquitectura, botánica e íconos de colección'},
]

def classify_saga(producto):
    cats = [c.nombre for c in producto.categorias.all() if 'año' not in c.nombre.lower() and 'adulto' not in c.nombre.lower()]
    all_text = ' '.join(cats + [producto.nombre, producto.descripcion or '']).lower()
    
    if any(k in all_text for k in ['star wars', 'mandalorian', 'yoda', 'r2-d2', 'darth', 'luke', 'jedi', 'lightsaber', 'caza estelar', 'halcón milenario', 'halcn']):
        return 'Star Wars'
    if any(k in all_text for k in ['harry potter', 'hogwarts', 'fantastic beasts', 'weasley', 'granger', 'dumbledore', 'draco', 'voldemort', 'quidditch']):
        return 'Harry Potter'
    if any(k in all_text for k in ['marvel', 'spider-man', 'spiderman', 'iron man', 'avengers', 'infinity saga', 'x-men', 'guardians of the galaxy', 'venom', 'hulk', 'captain america', 'thor', 'wolverine']):
        return 'Marvel'
    if any(k in all_text for k in ['batman', 'dc comics', 'super heroes dc', 'superman', 'justice league', 'joker', 'gotham', 'harley quinn']):
        return 'DC / Batman'
    if any(k in all_text for k in ['lord of the rings', 'hobbit', 'sauron', 'señor de los anillos', 'gandalf', 'frodo', 'aragorn', 'mordor']):
        return 'El Señor de los Anillos'
    if any(k in all_text for k in ['jurassic', 'dinosaur', 't-rex', 'triceratops', 'velociraptor']):
        return 'Jurassic World'
    if any(k in all_text for k in ['mario', 'luigi', 'bowser', 'yoshi', 'koopa', 'toad', 'nintendo']):
        return 'Super Mario'
    if any(k in all_text for k in ['stranger things', 'demogorgon', 'eleven', 'hawkins']):
        return 'Stranger Things'
    if any(k in all_text for k in ['shrek', 'donkey', 'gingy', 'farquaad', 'fiona']):
        return 'Shrek'
    if any(k in all_text for k in ['disney', 'frozen', 'elsa', 'anna', 'toy story', 'woody', 'buzz', 'mickey', 'minnie', 'moana', 'cinderella', 'ariel', 'princess']):
        return 'Disney'
    if any(k in all_text for k in ['minecraft', 'steve', 'creeper', 'enderman']):
        return 'Minecraft'
    if any(k in all_text for k in ['ninjago', 'spinjitzu', 'lloyd', 'kai', 'zane', 'cole', 'jay', 'nya', 'riyu']):
        return 'Ninjago'
    if any(k in all_text for k in ['pokémon', 'pokemon', 'pikachu', 'charizard']):
        return 'Pokémon'
    if any(k in all_text for k in ['fortnite', 'cuddle team leader', 'battle bus', 'peely']):
        return 'Fortnite'
    if any(k in all_text for k in ['one piece', 'luffy', 'zoro']):
        return 'One Piece'
    if any(k in all_text for k in ['animal crossing', 'isabelle', 'tom nook', 'kk slider']):
        return 'Animal Crossing'
    if any(k in all_text for k in ['technic', 'mclaren', 'bugatti', 'ferrari', 'porsche', 'lamborghini', 'formula 1', 'f1', 'mercedes']):
        return 'Technic'
    if any(k in all_text for k in ['speed champions', 'aston martin', 'ford', 'chevrolet']):
        return 'Speed Champions'
    if any(k in all_text for k in ['friends', 'heartlake', 'stephanie', 'mia', 'olivia', 'emma', 'andrea']):
        return 'Friends'
    if any(k in all_text for k in ['city', 'police', 'policía', 'bomberos', 'fire', 'hospital', 'train', 'tren', 'construction', 'town', 'traffic']):
        return 'City'
    
    return 'Creator & Icons'

class Command(BaseCommand):
    help = 'Ajusta las categorías de cada producto para que pertenezca a exactamente una saga/película y un rango de edad'

    def handle(self, *args, **options):
        # 1. Crear / obtener categorías canónicas de sagas
        sagas_map = {}
        for s in SAGAS_CONFIG:
            cat_obj, _ = Categoria.objects.get_or_create(
                nombre=s['nombre'],
                defaults={'descripcion': s['descripcion'], 'activo': True}
            )
            sagas_map[s['nombre']] = cat_obj

        # 2. Obtener categorías de edad
        edades_set = set(Categoria.objects.filter(nombre__iregex=r'(año|adulto)').values_list('id', flat=True))

        # 3. Procesar cada producto
        productos = Producto.objects.all()
        conteo = {}

        for prod in productos:
            saga_nombre = classify_saga(prod)
            cat_saga = sagas_map[saga_nombre]

            # Conservar categoría de edad existente
            edad_cat = prod.categorias.filter(id__in=edades_set).first()

            # Limpiar categorías y reasignar exactamente 1 saga + 1 edad
            prod.categorias.clear()
            prod.categorias.add(cat_saga)
            if edad_cat:
                prod.categorias.add(edad_cat)
            
            conteo[saga_nombre] = conteo.get(saga_nombre, 0) + 1

        self.stdout.write(self.style.SUCCESS(f'[OK] Ajustados {productos.count()} productos con saga/pelicula unica:'))
        for saga, c in sorted(conteo.items(), key=lambda x: x[1], reverse=True):
            self.stdout.write(f'  - [SAGA] {saga}: {c} productos')
