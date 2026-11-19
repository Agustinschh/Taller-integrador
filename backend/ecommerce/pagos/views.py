from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import Pago
from .serializers import PagoSerializer
from ordenes.models import Orden
import mercadopago
import logging

logger = logging.getLogger(__name__)

class PagoViewSet(viewsets.ModelViewSet):
    serializer_class = PagoSerializer
    def get_permissions(self):
        if self.action in ['crear_preferencia', 'webhook', 'confirmar_retorno']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='confirmar-retorno', permission_classes=[permissions.AllowAny])
    def confirmar_retorno(self, request):
        """
        Endpoint que llama el frontend al volver de Mercado Pago a /pago/exitoso
        para sincronizar y marcar la orden como pagada de forma inmediata.
        """
        try:
            payment_id = request.data.get('payment_id')
            external_reference = request.data.get('external_reference')
            param_status = request.data.get('status') or request.data.get('collection_status')

            if not payment_id and not external_reference:
                return Response({'error': 'Se requiere payment_id o external_reference'}, status=status.HTTP_400_BAD_REQUEST)

            from ordenes.models import Orden
            from carrito.models import Carrito
            from .models import Pago

            real_status = param_status
            payment_data = {}

            if payment_id:
                try:
                    sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
                    payment_info = sdk.payment().get(str(payment_id))
                    if payment_info.get('status') in [200, 201]:
                        payment_data = payment_info.get('response', {})
                        real_status = payment_data.get('status', param_status)
                        if not external_reference:
                            external_reference = payment_data.get('external_reference')
                except Exception as e:
                    logger.error(f"Error consultando pago en MP: {e}")

            orden = None
            if external_reference:
                try:
                    orden_id = int(str(external_reference).replace('orden_', ''))
                    orden = Orden.objects.filter(id=orden_id).first()
                except (ValueError, TypeError):
                    orden = Orden.objects.filter(session_key=external_reference).first()

            if not orden and payment_id:
                pago_existente = Pago.objects.filter(payment_id=str(payment_id)).first()
                if pago_existente:
                    orden = pago_existente.orden

            if not orden:
                # Si es un usuario autenticado con una orden pendiente reciente
                if request.user and request.user.is_authenticated:
                    orden = Orden.objects.filter(usuario=request.user, estado='pendiente').order_by('-fecha').first()

            if orden:
                if real_status == 'approved' or param_status == 'approved':
                    if orden.estado != 'pagado':
                        # El stock ya fue descontado por Trigger 2 -> Trigger 1 al crear linea_compra
                        orden.estado = 'pagado'
                        orden.save()

                        # Limpiar carrito (ON DELETE CASCADE borra linea_carrito)
                        if orden.usuario:
                            Carrito.objects.filter(usuario=orden.usuario).delete()
                        if orden.session_key:
                            Carrito.objects.filter(session_key=orden.session_key).delete()

                    # Actualizar o crear Pago
                    pago = Pago.objects.filter(orden=orden).first()
                    if not pago:
                        pago = Pago.objects.create(
                            orden=orden,
                            monto=orden.total,
                            estado='APROBADO',
                            payment_id=payment_id or '',
                            payment_method='MERCADOPAGO',
                            payment_type=payment_data.get('payment_type_id', 'account_money')
                        )
                    else:
                        pago.estado = 'APROBADO'
                        if payment_id:
                            pago.payment_id = str(payment_id)
                        pago.save()

                    return Response({
                        'status': 'approved',
                        'orden_id': orden.id,
                        'estado_orden': orden.estado,
                        'message': 'Pago verificado y orden actualizada a PAGADO'
                    }, status=status.HTTP_200_OK)

                elif real_status in ['rejected', 'cancelled']:
                    orden.estado = 'cancelado'
                    orden.save()
                    pago = Pago.objects.filter(orden=orden).first()
                    if pago:
                        # Trigger 3 repone stock automaticamente al pasar estado_pago a 'CANCELADO'
                        pago.estado = 'CANCELADO'
                        pago.save()
                    return Response({
                        'status': real_status,
                        'orden_id': orden.id,
                        'estado_orden': orden.estado
                    }, status=status.HTTP_200_OK)

            return Response({
                'status': real_status or 'verificado',
                'message': 'Estado procesado'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en confirmar_retorno: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='crear-preferencia', permission_classes=[permissions.AllowAny])
    def crear_preferencia(self, request):
        try:
            orden_id = request.data.get('orden_id')
            session_key = request.data.get('session_key')
            
            if orden_id:
                return self._crear_preferencia_usuario_autenticado(request, orden_id)
            elif session_key:
                return self._crear_preferencia_invitado(request, session_key)
            else:
                return Response({
                    'error': 'Se requiere orden_id (usuarios autenticados) o session_key (invitados)'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error al crear preferencia: {str(e)}")
            return Response({
                'error': f'Error interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _crear_preferencia_usuario_autenticado(self, request, orden_id):
        try:
            try:
                if request.user.is_authenticated:
                    orden = Orden.objects.get(id=orden_id, usuario=request.user)
                else:
                    orden = Orden.objects.get(id=orden_id, usuario__isnull=True)
                
            except Orden.DoesNotExist:
                return Response({
                    'error': 'Orden no encontrada'
                }, status=status.HTTP_404_NOT_FOUND)

            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            from ordenes.serializers import obtener_lineas_compra
            items = []
            productos_orden = obtener_lineas_compra(orden.id)
            
            # Calcular si hay descuento aplicado en la orden (orden.total vs suma original)
            costo_envio = float(orden.costo_envio or 0)
            total_orden = float(orden.total)
            total_productos_original = sum(float(item['precio_producto']) * item['cantidad'] for item in productos_orden)
            
            total_productos_objetivo = max(0.0, total_orden - costo_envio)
            factor_descuento = 1.0
            if total_productos_original > 0 and total_productos_objetivo < total_productos_original:
                factor_descuento = total_productos_objetivo / total_productos_original

            for item in productos_orden:
                precio_unitario = float(item['precio_producto'])
                precio_final = round(precio_unitario * factor_descuento, 2)
                
                titulo = item['nombre_producto']
                if factor_descuento < 0.999:
                    descuento_pct = round((1 - factor_descuento) * 100)
                    titulo = f"{item['nombre_producto']} ({descuento_pct}% OFF)"
                
                items.append({
                    "title": titulo[:255],
                    "quantity": item['cantidad'],
                    "unit_price": max(0.01, precio_final) if total_orden > 0 else 0.0,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": item['nombre_producto'][:255]
                })

            if costo_envio > 0:
                metodo_display = orden.get_metodo_entrega_display()
                items.append({
                    "title": f"Envío - {metodo_display}",
                    "quantity": 1,
                    "unit_price": costo_envio,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": f"Costo de envío por {metodo_display.lower()}"
                })

            # Configurar URLs de retorno dinámicas o desde settings
            origin = request.headers.get('Origin') or request.headers.get('Referer', '').rstrip('/')
            base_url = origin if (origin and 'http' in origin) else 'http://localhost:5173'
            
            success_url = getattr(settings, 'MERCADOPAGO_SUCCESS_URL', '') or f"{base_url}/pago/exitoso"
            failure_url = getattr(settings, 'MERCADOPAGO_FAILURE_URL', '') or f"{base_url}/pago/fallido"
            pending_url = getattr(settings, 'MERCADOPAGO_PENDING_URL', '') or f"{base_url}/pago/pendiente"

            # Si viene por ngrok o túnel, adaptar las back_urls
            if origin and ('ngrok' in origin or 'loca.lt' in origin):
                success_url = f"{origin}/pago/exitoso"
                failure_url = f"{origin}/pago/fallido"
                pending_url = f"{origin}/pago/pendiente"

            payer_email = None
            payer_name = None
            if request.user.is_authenticated:
                payer_email = getattr(request.user, 'email', None)
                payer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            else:
                payer_email = orden.email_invitado
                payer_name = orden.nombre_invitado

            if not payer_email or '@' not in str(payer_email):
                payer_email = "comprador_test@bloquemundo.com"
            if not payer_name:
                payer_name = "Cliente Tienda"

            preference_data = {
                "items": items,
                "payer": {
                    "email": payer_email,
                    "name": payer_name
                },
                "back_urls": {
                    "success": success_url,
                    "failure": failure_url,
                    "pending": pending_url
                },
                "external_reference": str(orden.id),
                "statement_descriptor": "BLOQUE MUNDO",
                "payment_methods": {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            }

            # MercadoPago solo acepta auto_return cuando back_urls.success es una URL pública HTTPS (no localhost)
            if success_url.startswith('https://') and 'localhost' not in success_url and '127.0.0.1' not in success_url:
                preference_data["auto_return"] = "approved"

            webhook_url = getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', '')
            if webhook_url and webhook_url.startswith('https://') and 'localhost' not in webhook_url and '127.0.0.1' not in webhook_url:
                preference_data["notification_url"] = webhook_url

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response.get("response", {})

            if preference_response.get("status") == 201:
                return Response({
                    'preference_id': preference.get('id'),
                    'init_point': preference.get('init_point'),
                    'sandbox_init_point': preference.get('sandbox_init_point'),
                    'orden_id': orden.id,
                    'total': float(orden.total),
                    'message': 'Preferencia creada exitosamente'
                }, status=status.HTTP_201_CREATED)
            else:
                error_detail = preference_response.get("response", {}) or preference_response.get("message", "Error desconocido")
                logger.error(f"Error creando preferencia MercadoPago: {error_detail}")
                return Response({
                    'error': f'MercadoPago Error: {error_detail}'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Excepción en _crear_preferencia_usuario_autenticado: {str(e)}")
            return Response({
                'error': f'Error interno al procesar pago: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _crear_preferencia_invitado(self, request, session_key):
        try:
            from django.contrib.sessions.models import Session
            datos_invitado = None
            try:
                session_obj = Session.objects.get(session_key=session_key)
                session_data = session_obj.get_decoded()
                datos_invitado = session_data.get('datos_invitado')
            except Exception:
                pass

            if not datos_invitado and hasattr(request, 'session'):
                datos_invitado = request.session.get('datos_invitado')

            if not datos_invitado:
                datos_invitado = request.data.get('datos_invitado') or {
                    'email': request.data.get('email', 'cliente@tienda.com'),
                    'nombre': request.data.get('nombre', 'Cliente Invitado'),
                    'metodo_entrega': request.data.get('metodo_entrega', 'delivery'),
                    'costo_envio': float(request.data.get('costo_envio', 0)),
                    'total': 0
                }

            from carrito.models import Carrito
            from productos.models import Producto
            from django.db import connection
            carrito_obj = Carrito.objects.filter(session_key=session_key).first()
            if not carrito_obj:
                return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id_producto, cantidad, subtotal FROM linea_carrito WHERE id_carrito = %s",
                    [carrito_obj.id],
                )
                lineas_guest = cursor.fetchall()

            if not lineas_guest:
                return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            items = []
            items_data = []
            total_productos_sin_descuento = 0.0
            from django.utils import timezone
            now = timezone.now()

            for prod_id, cant, sub in lineas_guest:
                producto = Producto.objects.get(id=prod_id)
                precio_f = float(sub) / float(cant) if cant else float(producto.precio)
                items_data.append({
                    'nombre': producto.nombre,
                    'cantidad': cant,
                    'precio_original': precio_f
                })
                total_productos_sin_descuento += precio_f * cant

            descuento_cupon = float(datos_invitado.get('descuento_cupon', 0) or 0)
            costo_envio = float(datos_invitado.get('costo_envio', 0) or 0)
            total_esperado = float(datos_invitado.get('total', 0) or 0)

            total_productos_objetivo = max(0.0, total_productos_sin_descuento - descuento_cupon)
            factor_descuento = 1.0
            if total_productos_sin_descuento > 0 and total_productos_objetivo < total_productos_sin_descuento:
                factor_descuento = total_productos_objetivo / total_productos_sin_descuento

            for item in items_data:
                precio_final = round(item['precio_original'] * factor_descuento, 2)
                titulo = item['nombre']
                if factor_descuento < 0.999:
                    descuento_pct = round((1 - factor_descuento) * 100)
                    titulo = f"{item['nombre']} ({descuento_pct}% OFF)"
                
                items.append({
                    "title": titulo[:255],
                    "quantity": item['cantidad'],
                    "unit_price": max(0.01, precio_final) if total_esperado > 0 else 0.0,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": item['nombre'][:255]
                })

            if costo_envio > 0:
                metodo_entrega = datos_invitado.get('metodo_entrega', 'delivery')
                metodo_display = 'Delivery a Domicilio' if metodo_entrega == 'delivery' else 'Retiro en Tienda'
                
                items.append({
                    "title": f"Envío - {metodo_display}",
                    "quantity": 1,
                    "unit_price": costo_envio,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": f"Costo de envío por {metodo_display.lower()}"
                })

            total_items = sum(item["unit_price"] * item["quantity"] for item in items)
            total_esperado = datos_invitado.get('total', 0)

            # Configurar URLs de retorno dinámicas o desde settings
            origin = request.headers.get('Origin') or request.headers.get('Referer', '').rstrip('/')
            base_url = origin if (origin and 'http' in origin) else 'http://localhost:5173'
            
            success_url = getattr(settings, 'MERCADOPAGO_SUCCESS_URL', '') or f"{base_url}/pago/exitoso"
            failure_url = getattr(settings, 'MERCADOPAGO_FAILURE_URL', '') or f"{base_url}/pago/fallido"
            pending_url = getattr(settings, 'MERCADOPAGO_PENDING_URL', '') or f"{base_url}/pago/pendiente"

            # Si viene por ngrok o túnel, adaptar las back_urls
            if origin and ('ngrok' in origin or 'loca.lt' in origin):
                success_url = f"{origin}/pago/exitoso"
                failure_url = f"{origin}/pago/fallido"
                pending_url = f"{origin}/pago/pendiente"

            payer_email = datos_invitado.get('email')
            payer_name = datos_invitado.get('nombre')
            if not payer_email or '@' not in str(payer_email):
                payer_email = "comprador_invitado@bloquemundo.com"
            if not payer_name:
                payer_name = "Cliente Invitado"
            
            from ordenes.models import Orden
            orden_invitado = Orden.objects.filter(session_key=session_key, estado='pendiente').order_by('-fecha').first()
            ext_ref = str(orden_invitado.id) if orden_invitado else session_key

            preference_data = {
                "items": items,
                "payer": {
                    "email": payer_email,
                    "name": payer_name
                },
                "back_urls": {
                    "success": success_url,
                    "failure": failure_url,
                    "pending": pending_url
                },
                "external_reference": ext_ref,
                "statement_descriptor": "BLOQUE MUNDO",
                "payment_methods": {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            }

            if success_url.startswith('https://') and 'localhost' not in success_url and '127.0.0.1' not in success_url:
                preference_data["auto_return"] = "approved"

            webhook_url = getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', '')
            if webhook_url and webhook_url.startswith('https://') and 'localhost' not in webhook_url and '127.0.0.1' not in webhook_url:
                preference_data["notification_url"] = webhook_url

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response.get("response", {})

            if preference_response.get("status") == 201:
                return Response({
                    'preference_id': preference.get('id'),
                    'init_point': preference.get('init_point'),
                    'sandbox_init_point': preference.get('sandbox_init_point'),
                    'session_key': session_key,
                    'total': total_esperado,
                    'message': 'Preferencia creada exitosamente'
                }, status=status.HTTP_201_CREATED)
            else:
                error_detail = preference_response.get("response", {}) or preference_response.get("message", "Error desconocido")
                logger.error(f"Error creando preferencia invitado MercadoPago: {error_detail}")
                return Response({
                    'error': f'MercadoPago Error: {error_detail}'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error al crear preferencia invitado: {str(e)}")
            return Response({
                'error': f'Error interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='webhook', permission_classes=[permissions.AllowAny])
    def webhook(self, request):
        try:
            from ordenes.models import Orden
            from carrito.models import Carrito
            from django.contrib.sessions.models import Session
            from django.utils import timezone
            
            data = request.data
            logger.info(f"Webhook recibido: {data}")

            topic = data.get('topic') or data.get('type')
            
            if topic == 'payment':
                sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
                
                payment_id = data.get('data', {}).get('id')
                
                if not payment_id:
                    return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                
                payment_info = sdk.payment().get(payment_id)
                payment = payment_info['response']
                
                payment_status = payment.get('status')
                external_reference = payment.get('external_reference')
                
                if not external_reference:
                    return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                
                try:
                    orden_id = int(external_reference)
                    return self._procesar_pago_orden_existente(payment_status, orden_id, payment_id, payment)
                except ValueError:
                    return self._procesar_pago_invitado(payment_status, external_reference, payment_id, payment)
                    
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error en webhook: {str(e)}")
            return Response({
                'error': 'Error procesando webhook'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _procesar_pago_orden_existente(self, payment_status, orden_id, payment_id, payment):
        try:
            orden = Orden.objects.get(id=orden_id)
        except Orden.DoesNotExist:
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
        
        if payment_status == 'approved':
            if orden.estado == 'pendiente':
                orden.estado = 'pagado'
                orden.save()
                
                from .models import Pago
                pago = Pago.objects.filter(orden=orden).first()
                if pago:
                    pago.estado = 'APROBADO'
                    pago.payment_id = payment_id
                    pago.payment_method = 'MERCADOPAGO'
                    pago.payment_type = payment.get('payment_type_id')
                    pago.save()

        elif payment_status in ['rejected', 'cancelled']:
            if orden.estado == 'pendiente':
                orden.estado = 'cancelado'
                orden.save()
                
                from .models import Pago
                pago = Pago.objects.filter(orden=orden).first()
                if pago:
                    # Trigger 3 repone stock automaticamente al pasar estado_pago a 'CANCELADO'
                    pago.estado = 'CANCELADO'
                    pago.payment_id = payment_id
                    pago.save()

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    def _procesar_pago_invitado(self, payment_status, session_key, payment_id, payment):
        if payment_status == 'approved':
            from ordenes.models import Orden
            orden_existente = Orden.objects.filter(
                session_key=session_key,
                estado='pagado'
            ).first()
            
            if orden_existente:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
            from django.contrib.sessions.models import Session
            try:
                session_obj = Session.objects.get(session_key=session_key)
                session_data = session_obj.get_decoded()
                datos_invitado = session_data.get('datos_invitado')
                
                if not datos_invitado:
                    return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                    
            except Session.DoesNotExist:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
            from carrito.models import Carrito
            from django.db import connection
            carrito_obj = Carrito.objects.filter(session_key=session_key).first()
            if not carrito_obj:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id_producto, cantidad, subtotal FROM linea_carrito WHERE id_carrito = %s",
                    [carrito_obj.id],
                )
                lineas_guest = cursor.fetchall()

            if not lineas_guest:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)

            from ordenes.models import Orden
            orden = Orden.objects.create(
                session_key=session_key,
                email_invitado=datos_invitado['email'],
                nombre_invitado=datos_invitado['nombre'],
                telefono_invitado=datos_invitado['telefono'],
                direccion_invitado=datos_invitado['direccion'],
                metodo_entrega=datos_invitado['metodo_entrega'],
                costo_envio=datos_invitado['costo_envio'],
                subtotal=datos_invitado.get('total_productos', datos_invitado['total']),
                descuento=datos_invitado.get('descuento_cupon', 0),
                total=datos_invitado['total'],
                estado='pagado'
            )

            with connection.cursor() as cursor:
                for prod_id, cant, sub in lineas_guest:
                    precio_unit = float(sub) / float(cant) if cant else 0
                    cursor.execute(
                        """
                        INSERT INTO linea_compra (id_compra, id_producto, cantidad, precio_unitario, subtotal)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        [orden.id, prod_id, cant, precio_unit, sub],
                    )

            from .models import Pago
            Pago.objects.create(
                orden=orden,
                monto=orden.total,
                estado='APROBADO',
                payment_id=payment_id,
                payment_method='MERCADOPAGO',
                payment_type=payment.get('payment_type_id')
            )

            carrito_obj.delete()
        
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)