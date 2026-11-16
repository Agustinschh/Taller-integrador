from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from carrito.models import Carrito

class Command(BaseCommand):
    help = 'Limpia carritos de compra abandonados y sesiones de invitados expiradas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=30,
            help='Número de días de antigüedad para considerar un carrito de invitado como abandonado (default: 30)'
        )

    def handle(self, *args, **options):
        dias = options['dias']
        limite_fecha = timezone.now() - timedelta(days=dias)
        
        # 1. Carritos de invitados antiguos
        carritos_invitados_antiguos = Carrito.objects.filter(
            usuario__isnull=True,
            agregado__lte=limite_fecha
        )
        count_invitados = carritos_invitados_antiguos.count()
        carritos_invitados_antiguos.delete()

        # 2. Carritos con productos inactivos o sin stock
        carritos_invalidos = Carrito.objects.filter(
            producto__activo=False
        ) | Carrito.objects.filter(
            producto__stock=0
        )
        count_invalidos = carritos_invalidos.count()
        carritos_invalidos.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'[OK] Limpieza completada: {count_invitados} carritos de invitados >{dias}d eliminados, '
                f'{count_invalidos} items con stock 0 o inactivos depurados.'
            )
        )
