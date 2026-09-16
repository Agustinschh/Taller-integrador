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

            from ordenes.models import Orden, OrdenProducto
            from productos.models import Producto
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
                        # Descontar stock
                        for item in orden.productos.all():
                            try:
                                prod = Producto.objects.get(id=item.producto_id)
                                if prod.stock >= item.cantidad:
                                    prod.stock -= item.cantidad
                                else:
                                    prod.stock = 0
                                prod.save()
                            except Producto.DoesNotExist:
                                pass

                        orden.estado = 'pagado'
                        orden.save()

                    # Actualizar o crear Pago
                    pago = Pago.objects.filter(orden=orden).first()
                    if not pago:
                        pago = Pago.objects.create(
                            orden=orden,
                            monto=orden.total,
                            estado='completado',
                            payment_id=payment_id or '',
                            payment_method=payment_data.get('payment_method_id', 'mercadopago'),
                            payment_type=payment_data.get('payment_type_id', 'account_money')
                        )
                    else:
                        pago.estado = 'completado'
                        if payment_id:
                            pago.payment_id = str(payment_id)
                        if payment_data.get('payment_method_id'):
                            pago.payment_method = payment_data.get('payment_method_id')
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
                        pago.estado = 'rechazado'
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

            items = []
            
            productos_orden = orden.productos.all()
            
            for item in productos_orden:
                precio = float(item.precio_producto)
                
                items.append({
                    "title": item.nombre_producto,
                    "quantity": item.cantidad,
                    "unit_price": precio,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": item.nombre_producto[:255]
                })

            if orden.costo_envio and orden.costo_envio > 0:
                costo_envio = float(orden.costo_envio)
                metodo_display = orden.get_metodo_entrega_display()
                
                items.append({
                    "title": f"Envío - {metodo_display}",
                    "quantity": 1,
                    "unit_price": costo_envio,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": f"Costo de envío por {metodo_display.lower()}"
                })

            if request.user.is_authenticated:
                payer_email = request.user.email
                payer_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            else:
                payer_email = orden.email_invitado
                payer_name = orden.nombre_invitado

            preference_data = {
                "items": items,
                "payer": {
                    "email": payer_email,
                    "name": payer_name
                },
                "back_urls": {
                    "success": settings.MERCADOPAGO_SUCCESS_URL,
                    "failure": settings.MERCADOPAGO_FAILURE_URL,
                    "pending": settings.MERCADOPAGO_PENDING_URL
                },
                "external_reference": str(orden.id),
                "notification_url": settings.MERCADOPAGO_WEBHOOK_URL,
                "statement_descriptor": "BLOQUE MUNDO",
                "payment_methods": {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            }

            if getattr(settings, 'MERCADOPAGO_SUCCESS_URL', None):
                preference_data["auto_return"] = "approved"

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response["response"]

            if preference_response["status"] == 201:
                return Response({
                    'preference_id': preference['id'],
                    'init_point': preference['init_point'],
                    'sandbox_init_point': preference.get('sandbox_init_point'),
                    'orden_id': orden.id,
                    'total': float(orden.total),
                    'message': 'Preferencia creada exitosamente'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Error al crear la preferencia de pago'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'error': f'Error interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _crear_preferencia_invitado(self, request, session_key):
        try:
            from django.contrib.sessions.models import Session
            try:
                session_obj = Session.objects.get(session_key=session_key)
                session_data = session_obj.get_decoded()
                datos_invitado = session_data.get('datos_invitado')
                
                if not datos_invitado:
                    return Response({
                        'error': 'No se encontraron datos de invitado en la sesión'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Session.DoesNotExist:
                return Response({
                    'error': 'Sesión no encontrada'
                }, status=status.HTTP_400_BAD_REQUEST)

            from carrito.models import Carrito
            carrito_items = Carrito.objects.filter(session_key=session_key)
            
            if not carrito_items.exists():
                return Response({
                    'error': 'El carrito está vacío'
                }, status=status.HTTP_400_BAD_REQUEST)

            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            items = []
            
            for item in carrito_items:
                from django.utils import timezone
                now = timezone.now()
                producto = item.producto
                precio_unitario = producto.precio
                
                try:
                    oferta_activa = producto.ofertas.filter(
                        activo=True,
                        fecha_inicio__lte=now
                    ).filter(
                        models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
                    ).first()
                    
                    if oferta_activa:
                        precio_unitario = oferta_activa.precio_con_descuento
                except Exception:
                    pass
                
                precio = float(precio_unitario)
                
                items.append({
                    "title": producto.nombre,
                    "quantity": item.cantidad,
                    "unit_price": precio,
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": producto.nombre[:255]
                })

            costo_envio = datos_invitado.get('costo_envio', 0)
            if costo_envio and costo_envio > 0:
                metodo_entrega = datos_invitado.get('metodo_entrega', 'delivery')
                metodo_display = 'Delivery a Domicilio' if metodo_entrega == 'delivery' else 'Retiro en Tienda'
                
                items.append({
                    "title": f"Envío - {metodo_display}",
                    "quantity": 1,
                    "unit_price": float(costo_envio),
                    "currency_id": getattr(settings, 'MERCADOPAGO_CURRENCY_ID', 'ARS'),
                    "description": f"Costo de envío por {metodo_display.lower()}"
                })

            total_items = sum(item["unit_price"] * item["quantity"] for item in items)
            total_esperado = datos_invitado.get('total', 0)

            payer_email = datos_invitado.get('email')
            payer_name = datos_invitado.get('nombre')
            
            preference_data = {
                "items": items,
                "payer": {
                    "email": payer_email,
                    "name": payer_name
                },
                "back_urls": {
                    "success": settings.MERCADOPAGO_SUCCESS_URL,
                    "failure": settings.MERCADOPAGO_FAILURE_URL,
                    "pending": settings.MERCADOPAGO_PENDING_URL
                },
                "external_reference": session_key,
                "notification_url": settings.MERCADOPAGO_WEBHOOK_URL,
                "statement_descriptor": "BLOQUE MUNDO",
                "payment_methods": {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            }

            if getattr(settings, 'MERCADOPAGO_SUCCESS_URL', None):
                preference_data["auto_return"] = "approved"

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response["response"]

            if preference_response["status"] == 201:
                return Response({
                    'preference_id': preference['id'],
                    'init_point': preference['init_point'],
                    'session_key': session_key,
                    'total': total_esperado,
                    'message': 'Preferencia creada exitosamente'
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Error al crear la preferencia de pago'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error al crear preferencia: {str(e)}")
            return Response({
                'error': f'Error interno: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='webhook', permission_classes=[permissions.AllowAny])
    def webhook(self, request):
        try:
            from ordenes.models import OrdenProducto, Orden
            from productos.models import Producto
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
                from ordenes.models import OrdenProducto
                from productos.models import Producto
                
                productos_orden = OrdenProducto.objects.filter(orden=orden)
                for item in productos_orden:
                    try:
                        producto = Producto.objects.get(id=item.producto_id)
                        producto.stock -= item.cantidad
                        producto.save()
                    except Producto.DoesNotExist:
                        pass
                
                orden.estado = 'pagado'
                orden.save()
                
                from .models import Pago
                pago = Pago.objects.filter(orden=orden).first()
                if pago:
                    pago.estado = 'completado'
                    pago.payment_id = payment_id
                    pago.payment_method = payment.get('payment_method_id')
                    pago.payment_type = payment.get('payment_type_id')
                    pago.save()

        elif payment_status in ['rejected', 'cancelled']:
            if orden.estado == 'pendiente':
                orden.estado = 'cancelado'
                orden.save()
                
                from .models import Pago
                pago = Pago.objects.filter(orden=orden).first()
                if pago:
                    pago.estado = 'rechazado'
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
            carrito_items = Carrito.objects.filter(session_key=session_key)
            
            if not carrito_items.exists():
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
            from ordenes.models import Orden, OrdenProducto
            orden = Orden.objects.create(
                session_key=session_key,
                email_invitado=datos_invitado['email'],
                nombre_invitado=datos_invitado['nombre'],
                telefono_invitado=datos_invitado['telefono'],
                direccion_invitado=datos_invitado['direccion'],
                metodo_entrega=datos_invitado['metodo_entrega'],
                costo_envio=datos_invitado['costo_envio'],
                total=datos_invitado['total'],
                estado='pagado'
            )
            
            from django.utils import timezone
            from django.db import models
            now = timezone.now()
            for item in carrito_items:
                if item.cantidad > item.producto.stock:
                    continue
                
                producto = item.producto
                precio_unitario = producto.precio
                
                try:
                    oferta_activa = producto.ofertas.filter(
                        activo=True,
                        fecha_inicio__lte=now
                    ).filter(
                        models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
                    ).first()
                    
                    if oferta_activa:
                        precio_unitario = oferta_activa.precio_con_descuento
                except Exception:
                    pass
                
                subtotal = precio_unitario * item.cantidad
                
                OrdenProducto.objects.create(
                    orden=orden,
                    producto_id=producto.id,
                    nombre_producto=producto.nombre,
                    precio_producto=precio_unitario,
                    cantidad=item.cantidad,
                    subtotal=subtotal
                )
                
                producto.stock -= item.cantidad
                producto.save()
            
            from .models import Pago
            pago = Pago.objects.create(
                orden=orden,
                monto=orden.total,
                estado='completado',
                payment_id=payment_id,
                payment_method=payment.get('payment_method_id'),
                payment_type=payment.get('payment_type_id')
            )
            
            carrito_items.delete()
        
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)