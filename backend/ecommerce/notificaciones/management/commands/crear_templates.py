from django.core.management.base import BaseCommand
from notificaciones.models import TemplateCorreo, TipoNotificacion

class Command(BaseCommand):
    help = 'Crea templates por defecto para las notificaciones'
    
    def handle(self, *args, **options):
        templates = [
            {
                'tipo': TipoNotificacion.BIENVENIDA,
                'nombre': 'Correo de Bienvenida',
                'asunto': '¡Bienvenido/a a Bloque Mundo! 🎉',
                'contenido_html': '<p>¡Gracias por registrarte!</p>',
            },
            {
                'tipo': TipoNotificacion.ORDEN_CONFIRMADA,
                'nombre': 'Confirmación de Orden',
                'asunto': 'Tu orden #{{ orden.id }} ha sido confirmada',
                'contenido_html': '<p>Tu orden ha sido confirmada y está siendo procesada.</p>',
            },
            {
                'tipo': TipoNotificacion.ORDEN_ENVIADA,
                'nombre': 'Orden Enviada',
                'asunto': '¡Tu orden #{{ orden.id }} está en camino! 🚚',
                'contenido_html': '<p>Tu pedido ha sido enviado y está en camino.</p>',
            },
            {
                'tipo': TipoNotificacion.PAGO_EXITOSO,
                'nombre': 'Pago Confirmado',
                'asunto': 'Pago confirmado - Orden #{{ orden.id }} ✅',
                'contenido_html': '<p>Tu pago ha sido confirmado exitosamente.</p>',
            },
            {
                'tipo': TipoNotificacion.RESETEO_PASSWORD,
                'nombre': 'Reseteo de Contraseña',
                'asunto': 'Restablecer tu contraseña - Bloque Mundo 🔑',
                'contenido_html': '<p>Solicitud para restablecer tu contraseña.</p>',
            },
        ]
        
        creados = 0
        actualizados = 0
        
        for template_data in templates:
            template, created = TemplateCorreo.objects.get_or_create(
                tipo=template_data['tipo'],
                defaults=template_data
            )
            
            if created:
                creados += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Creado template: {template.nombre}')
                )
            else:
                actualizados += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Template ya existe: {template.nombre}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompletado! Creados: {creados}, Ya existían: {actualizados}'
            )
        )