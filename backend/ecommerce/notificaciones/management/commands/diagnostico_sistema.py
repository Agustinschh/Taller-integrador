from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from notificaciones.services import NotificacionService
from notificaciones.models import TemplateCorreo, ConfiguracionNotificacion, NotificacionCorreo
import logging

User = get_user_model()

class Command(BaseCommand):
    help = 'Diagnóstico completo del sistema de notificaciones y correos'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email-test',
            type=str,
            help='Email para enviar correo de prueba'
        )
        parser.add_argument(
            '--full-test',
            action='store_true',
            help='Ejecuta todas las pruebas del sistema'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== DIAGNÓSTICO DEL SISTEMA DE NOTIFICACIONES ===\n')
        )
        
        # 1. Verificar configuración de email
        self.verificar_configuracion_email()
        
        # 2. Verificar base de datos
        self.verificar_base_datos()
        
        # 3. Verificar templates
        self.verificar_templates()
        
        # 4. Prueba de conectividad SMTP
        if options['email_test']:
            self.probar_conectividad_smtp(options['email_test'])
        
        # 5. Prueba completa del sistema
        if options['full_test']:
            self.prueba_completa_sistema(options.get('email_test'))
    
    def verificar_configuracion_email(self):
        """Verifica la configuración de email en settings"""
        self.stdout.write('1. 📧 Verificando configuración de email...')
        
        configuraciones = {
            'EMAIL_BACKEND': getattr(settings, 'EMAIL_BACKEND', 'No configurado'),
            'EMAIL_HOST': getattr(settings, 'EMAIL_HOST', 'No configurado'),
            'EMAIL_PORT': getattr(settings, 'EMAIL_PORT', 'No configurado'),
            'EMAIL_USE_TLS': getattr(settings, 'EMAIL_USE_TLS', 'No configurado'),
            'EMAIL_HOST_USER': getattr(settings, 'EMAIL_HOST_USER', 'No configurado'),
            'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', 'No configurado'),
        }
        
        for key, value in configuraciones.items():
            if value == 'No configurado':
                self.stdout.write(f'   ❌ {key}: {value}')
            else:
                self.stdout.write(f'   ✅ {key}: {value}')
        
        # Verificar API key de Resend
        email_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        if email_password:
            self.stdout.write(f'   ✅ EMAIL_HOST_PASSWORD: Configurado (***{email_password[-10:]})')
        else:
            self.stdout.write(f'   ❌ EMAIL_HOST_PASSWORD: No configurado')
        
        self.stdout.write('')
    
    def verificar_base_datos(self):
        """Verifica que las tablas de notificaciones existan"""
        self.stdout.write('2. 🗄️ Verificando base de datos...')
        
        try:
            # Verificar modelos
            template_count = TemplateCorreo.objects.count()
            config_count = ConfiguracionNotificacion.objects.count()
            notif_count = NotificacionCorreo.objects.count()
            
            self.stdout.write(f'   ✅ Templates de correo: {template_count} registros')
            self.stdout.write(f'   ✅ Configuraciones de usuario: {config_count} registros')
            self.stdout.write(f'   ✅ Notificaciones enviadas: {notif_count} registros')
            
        except Exception as e:
            self.stdout.write(f'   ❌ Error accediendo a la base de datos: {str(e)}')
        
        self.stdout.write('')
    
    def verificar_templates(self):
        """Verifica que los templates existan"""
        self.stdout.write('3. 📄 Verificando templates...')
        
        from notificaciones.models import TipoNotificacion
        
        tipos_requeridos = [
            TipoNotificacion.BIENVENIDA,
            TipoNotificacion.ORDEN_CONFIRMADA,
            TipoNotificacion.ORDEN_ENVIADA,
            TipoNotificacion.PAGO_EXITOSO,
            TipoNotificacion.RESETEO_PASSWORD,
        ]
        
        for tipo in tipos_requeridos:
            try:
                template = TemplateCorreo.objects.get(tipo=tipo, activo=True)
                self.stdout.write(f'   ✅ {template.get_tipo_display()}: {template.nombre}')
            except TemplateCorreo.DoesNotExist:
                self.stdout.write(f'   ❌ Template {tipo} no encontrado')
        
        self.stdout.write('')
    
    def probar_conectividad_smtp(self, email_destino):
        """Prueba la conectividad SMTP enviando un correo simple"""
        self.stdout.write('4. 🌐 Probando conectividad SMTP...')
        
        try:
            send_mail(
                subject='Test de Conectividad - Bloque Mundo',
                message='Este es un correo de prueba para verificar la conectividad SMTP.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_destino],
                html_message='<h1>Test de Conectividad</h1><p>Este es un correo de prueba para verificar la conectividad SMTP.</p>',
                fail_silently=False
            )
            self.stdout.write(f'   ✅ Correo de prueba enviado exitosamente a {email_destino}')
        except Exception as e:
            self.stdout.write(f'   ❌ Error enviando correo: {str(e)}')
        
        self.stdout.write('')
    
    def prueba_completa_sistema(self, email_test=None):
        """Ejecuta una prueba completa del sistema de notificaciones"""
        self.stdout.write('5. 🧪 Ejecutando prueba completa del sistema...')
        
        if not email_test:
            email_test = 'test@bloquemundo.com'
        
        try:
            # Crear usuario de prueba
            usuario_test, created = User.objects.get_or_create(
                email=email_test,
                defaults={
                    'first_name': 'Usuario',
                    'last_name': 'Prueba',
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f'   ✅ Usuario de prueba creado: {email_test}')
            else:
                self.stdout.write(f'   ℹ️ Usando usuario existente: {email_test}')
            
            # Verificar configuración de notificaciones
            config, config_created = ConfiguracionNotificacion.objects.get_or_create(
                usuario=usuario_test
            )
            
            if config_created:
                self.stdout.write('   ✅ Configuración de notificaciones creada')
            else:
                self.stdout.write('   ℹ️ Configuración de notificaciones ya existe')
            
            # Probar servicio de notificaciones
            service = NotificacionService()
            
            # Enviar correo de bienvenida
            notificacion = service.enviar_bienvenida(usuario_test)
            
            if notificacion:
                self.stdout.write(f'   ✅ Correo de bienvenida enviado. ID: {notificacion.id}')
                self.stdout.write(f'   📧 Asunto: {notificacion.asunto}')
                self.stdout.write(f'   📋 Estado: {notificacion.get_estado_display()}')
            else:
                self.stdout.write('   ❌ No se pudo enviar el correo de bienvenida')
            
        except Exception as e:
            self.stdout.write(f'   ❌ Error en prueba completa: {str(e)}')
            import traceback
            self.stdout.write(f'   🔍 Traceback: {traceback.format_exc()}')
        
        self.stdout.write('')
    
    def mostrar_estadisticas(self):
        """Muestra estadísticas del sistema"""
        self.stdout.write('6. 📊 Estadísticas del sistema...')
        
        from notificaciones.models import EstadoNotificacion
        
        # Estadísticas por estado
        estados = NotificacionCorreo.objects.values('estado').annotate(
            total=models.Count('id')
        )
        
        for estado in estados:
            self.stdout.write(f'   📈 {estado["estado"]}: {estado["total"]} notificaciones')
        
        # Últimas notificaciones
        ultimas = NotificacionCorreo.objects.order_by('-fecha_creacion')[:5]
        
        if ultimas:
            self.stdout.write('   📬 Últimas 5 notificaciones:')
            for notif in ultimas:
                self.stdout.write(
                    f'      - {notif.get_tipo_display()} | {notif.usuario.email} | {notif.get_estado_display()}'
                )
        
        self.stdout.write('')
        
        # Resumen final
        self.stdout.write(
            self.style.SUCCESS('=== DIAGNÓSTICO COMPLETADO ===\n')
        )
        
        total_notificaciones = NotificacionCorreo.objects.count()
        self.stdout.write(f'📊 Total de notificaciones en el sistema: {total_notificaciones}')
        
        if total_notificaciones > 0:
            exitosas = NotificacionCorreo.objects.filter(estado=EstadoNotificacion.ENVIADA).count()
            tasa_exito = (exitosas / total_notificaciones) * 100
            self.stdout.write(f'✅ Tasa de éxito: {tasa_exito:.2f}%')
        
        self.stdout.write(
            self.style.SUCCESS('\n✨ Para más información, visita /admin/notificaciones/')
        )