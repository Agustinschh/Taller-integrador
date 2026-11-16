from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Orden, OrdenProducto
from .serializers import OrdenSerializer, OrdenInvitadoSerializer
from carrito.models import Carrito
from pagos.models import Pago
from envios.models import ConfiguracionEnvio
from cupones.models import Cupon

@method_decorator(csrf_exempt, name='dispatch')
class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_permissions(self):
        if self.action in ['crear_orden_invitado', 'preparar_pago_invitado']:
            return []  
        elif self.action in ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]  
        else:
            return [permissions.IsAuthenticated()]  

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Orden.objects.filter(usuario=self.request.user)
        return Orden.objects.none()

    @action(detail=False, methods=['get'])
    def historial(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Usuario no autenticado'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        ordenes = self.get_queryset().order_by('-fecha')  
        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def detalle_orden(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Usuario no autenticado'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            orden = self.get_object()
            serializer = self.get_serializer(orden)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Orden no encontrada: {str(e)}'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def verificar_orden_pendiente(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Usuario no autenticado'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        orden_pendiente = Orden.objects.filter(
            usuario=request.user,
            estado='pendiente'
        ).order_by('-fecha').first()
        
        if orden_pendiente:
            productos = []
            for item in orden_pendiente.productos.all():
                productos.append({
                    'nombre': item.nombre_producto,
                    'cantidad': item.cantidad,
                    'precio': float(item.precio_producto),
                    'subtotal': float(item.subtotal)
                })
            
            return Response({
                'tiene_pendiente': True,
                'orden': {
                    'id': orden_pendiente.id,
                    'total': float(orden_pendiente.total),
                    'fecha': orden_pendiente.fecha,
                    'productos': productos
                }
            })
        else:
            return Response({
                'tiene_pendiente': False
            })

    @action(detail=False, methods=['post'])
    def cancelar_orden_pendiente(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Usuario no autenticado'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        orden_id = request.data.get('orden_id')
        
        if not orden_id:
            return Response(
                {'error': 'Se requiere orden_id'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            orden = Orden.objects.get(
                id=orden_id,
                usuario=request.user,
                estado='pendiente'
            )
            
            for item in orden.productos.all():
                from productos.models import Producto
                try:
                    producto = Producto.objects.get(id=item.producto_id)
                    producto.stock += item.cantidad
                    producto.save()
                except Producto.DoesNotExist:
                    pass
            
            orden.estado = 'cancelado'
            orden.save()
            
            return Response({
                'message': 'Orden cancelada exitosamente',
                'orden_id': orden.id
            })
            
        except Orden.DoesNotExist:
            return Response(
                {'error': 'Orden no encontrada o ya procesada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def crear_orden_usuario(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Usuario no autenticado'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        ordenes_pendientes = Orden.objects.filter(
            usuario=request.user,
            estado='pendiente'
        )
        
        if ordenes_pendientes.exists():
            for orden_pendiente in ordenes_pendientes:
                orden_pendiente.estado = 'cancelado'
                orden_pendiente.save()

        carrito_items = list(Carrito.objects.filter(usuario=request.user).select_related('producto'))
        
        if not carrito_items:
            return Response(
                {'error': 'El carrito está vacío'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        for item in carrito_items:
            if item.cantidad > item.producto.stock:
                return Response(
                    {'error': f'Stock insuficiente para {item.producto.nombre}. Stock disponible: {item.producto.stock}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            metodo_entrega = request.data.get('metodo_entrega', 'delivery')
            if metodo_entrega not in ['delivery', 'retiro']:
                metodo_entrega = 'delivery'
            
            total_productos = 0
            now = timezone.now()
            
            for item in carrito_items:
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
                total_productos += subtotal
            
            config_envio = ConfiguracionEnvio.objects.first()
            if not config_envio:
                config_envio = ConfiguracionEnvio.objects.create()

            envio_gratis_desbloqueado = total_productos >= config_envio.monto_envio_gratis
            
            # Obtener costo de envío dinámico de la cotización
            costo_envio_req = request.data.get('costo_envio')
            if metodo_entrega == 'retiro':
                costo_envio = 0
            elif envio_gratis_desbloqueado:
                costo_envio = 0
            elif costo_envio_req is not None:
                try:
                    costo_envio = float(costo_envio_req)
                except (ValueError, TypeError):
                    costo_envio = config_envio.costo_base_envio
            else:
                costo_envio = config_envio.costo_base_envio
            
            orden = Orden.objects.create(
                usuario=request.user,
                metodo_entrega=metodo_entrega,
                costo_envio=costo_envio,
                estado='pendiente'
            )

            total = 0  
            
            for item in carrito_items:
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
                total += subtotal

                OrdenProducto.objects.create(
                    orden=orden,
                    producto_id=producto.id,
                    nombre_producto=producto.nombre,
                    precio_producto=precio_unitario,  
                    cantidad=item.cantidad,
                    subtotal=subtotal
                )

            total += costo_envio

            # Cupon logic
            cupon_codigo = request.data.get('cupon_codigo')
            descuento_cupon = 0
            if cupon_codigo:
                try:
                    cupon = Cupon.objects.get(codigo=cupon_codigo.upper())
                    if cupon.is_valid():
                        descuento_cupon = (total_productos * cupon.porcentaje_descuento) / 100
                        cupon.usar()
                except Cupon.DoesNotExist:
                    pass

            total_final = total - descuento_cupon
            if total_final < 0:
                total_final = 0

            orden.total = total_final
            orden.save()

            pago = Pago.objects.create(
                orden=orden,
                monto=total_final,
                estado='pendiente'
            )

            Carrito.objects.filter(usuario=request.user).delete()
            
            return Response({
                'orden_id': orden.id,
                'total': float(total_final),
                'total_productos': float(total_productos),
                'metodo_entrega': metodo_entrega,
                'costo_envio': float(costo_envio),
                'descuento_cupon': float(descuento_cupon),
                'envio_gratis_desbloqueado': envio_gratis_desbloqueado,
                'message': 'Orden creada exitosamente'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            try:
                if 'orden' in locals():
                    orden.delete()
            except Exception:
                pass
            
            return Response(
                {'error': f'Error al procesar la orden: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def preparar_pago_invitado(self, request):
        
        serializer = OrdenInvitadoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session_key = (
            request.data.get('session_key') or 
            request.headers.get('X-Session-Key') or 
            request.session.session_key
        )
        
        if not session_key and not request.session.session_key:
            request.session.create()
            session_key = request.session.session_key
        elif not session_key:
            session_key = request.session.session_key

        carrito_items = Carrito.objects.filter(session_key=session_key)
        
        if not carrito_items.exists():
            return Response(
                {'error': 'El carrito está vacío'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            for item in carrito_items:
                if item.cantidad > item.producto.stock:
                    return Response(
                        {'error': f'Stock insuficiente para {item.producto.nombre}. Stock disponible: {item.producto.stock}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            metodo_entrega = serializer.validated_data.get('metodo_entrega', 'delivery')
            if metodo_entrega not in ['delivery', 'retiro']:
                metodo_entrega = 'delivery'
                
            config_envio = ConfiguracionEnvio.objects.first()
            if not config_envio:
                config_envio = ConfiguracionEnvio.objects.create()

            costo_envio = config_envio.costo_base_envio if metodo_entrega == 'delivery' else 0
            
            total_productos = 0
            now = timezone.now()
            
            for item in carrito_items:
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
                total_productos += subtotal

            envio_gratis_desbloqueado = total_productos >= config_envio.monto_envio_gratis
            
            costo_envio_req = request.data.get('costo_envio')
            if metodo_entrega == 'retiro':
                costo_envio = 0
            elif envio_gratis_desbloqueado:
                costo_envio = 0
            elif costo_envio_req is not None:
                try:
                    costo_envio = float(costo_envio_req)
                except (ValueError, TypeError):
                    costo_envio = config_envio.costo_base_envio
            else:
                costo_envio = config_envio.costo_base_envio
            
            cupon_codigo = request.data.get('cupon_codigo')
            descuento_cupon = 0
            if cupon_codigo:
                try:
                    cupon = Cupon.objects.get(codigo=cupon_codigo.upper())
                    if cupon.is_valid():
                        descuento_cupon = (total_productos * cupon.porcentaje_descuento) / 100
                except Cupon.DoesNotExist:
                    pass

            total_final = (total_productos + costo_envio) - descuento_cupon
            if total_final < 0:
                total_final = 0

            # Cancelar ordenes previas pendientes para esta misma session
            Orden.objects.filter(
                session_key=session_key,
                estado='pendiente'
            ).update(estado='cancelado')

            # Crear la orden de invitado en la base de datos
            orden = Orden.objects.create(
                usuario=None,
                session_key=session_key,
                email_invitado=serializer.validated_data['email'],
                nombre_invitado=serializer.validated_data['nombre'],
                telefono_invitado=serializer.validated_data.get('telefono', ''),
                direccion_invitado=serializer.validated_data.get('direccion', ''),
                metodo_entrega=metodo_entrega,
                costo_envio=costo_envio,
                total=total_final,
                estado='pendiente'
            )

            for item in carrito_items:
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

            Pago.objects.create(
                orden=orden,
                monto=total_final,
                estado='pendiente'
            )

            request.session['datos_invitado'] = {
                'orden_id': orden.id,
                'email': serializer.validated_data['email'],
                'nombre': serializer.validated_data['nombre'],
                'telefono': serializer.validated_data.get('telefono', ''),
                'direccion': serializer.validated_data.get('direccion', ''),
                'metodo_entrega': metodo_entrega,
                'costo_envio': float(costo_envio),
                'total_productos': float(total_productos),
                'descuento_cupon': float(descuento_cupon),
                'cupon_codigo': cupon_codigo if descuento_cupon > 0 else None,
                'envio_gratis_desbloqueado': envio_gratis_desbloqueado,
                'total': float(total_final)
            }
            if hasattr(request, 'session') and hasattr(request.session, 'save'):
                try:
                    request.session.save()
                except Exception:
                    pass
            
            return Response({
                'orden_id': orden.id,
                'session_key': session_key,  
                'total': float(total_final),
                'total_productos': float(total_productos),
                'metodo_entrega': metodo_entrega,
                'costo_envio': float(costo_envio),
                'descuento_cupon': float(descuento_cupon),
                'envio_gratis_desbloqueado': envio_gratis_desbloqueado,
                'message': 'Orden de invitado creada exitosamente'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def reporte_ventas(self, request):
        if not (request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)):
            return Response({'error': 'Permiso denegado. Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)

        from productos.models import Producto

        ordenes = Orden.objects.all().prefetch_related('productos')
        ordenes_pagadas = ordenes.filter(estado__in=['pagado', 'enviado', 'entregado', 'procesando'])

        total_ingresos = sum(float(o.total) for o in ordenes_pagadas)
        total_ordenes = ordenes.count()
        total_pagadas = ordenes_pagadas.count()
        ticket_promedio = (total_ingresos / total_pagadas) if total_pagadas > 0 else 0

        # Ventas por producto
        productos_vendidos = {}
        for orden in ordenes_pagadas:
            for item in orden.productos.all():
                prod_id = item.producto_id
                if prod_id not in productos_vendidos:
                    imagen_url = None
                    try:
                        p_obj = Producto.objects.filter(id=prod_id).first()
                        if p_obj and p_obj.imagen:
                            imagen_url = request.build_absolute_uri(p_obj.imagen.url)
                    except Exception:
                        pass

                    productos_vendidos[prod_id] = {
                        'id': prod_id,
                        'nombre': item.nombre_producto,
                        'imagen': imagen_url,
                        'unidades': 0,
                        'total_generado': 0
                    }
                productos_vendidos[prod_id]['unidades'] += item.cantidad
                precio_unit = float(item.precio_producto) if item.precio_producto else 0
                productos_vendidos[prod_id]['total_generado'] += float(item.subtotal) if item.subtotal else (precio_unit * item.cantidad)

        top_productos = sorted(productos_vendidos.values(), key=lambda x: x['unidades'], reverse=True)[:8]
        total_unidades = sum(p['unidades'] for p in productos_vendidos.values())

        # Conteo por estado
        estados_count = {}
        for orden in ordenes:
            estados_count[orden.estado] = estados_count.get(orden.estado, 0) + 1

        # Ventas recientes (ultimas 15 ordenes)
        ordenes_recientes = OrdenSerializer(ordenes.order_by('-fecha')[:15], many=True, context={'request': request}).data

        return Response({
            'total_ingresos': total_ingresos,
            'total_ordenes': total_ordenes,
            'total_pagadas': total_pagadas,
            'ticket_promedio': ticket_promedio,
            'total_unidades': total_unidades,
            'estados_count': estados_count,
            'top_productos': top_productos,
            'ordenes_recientes': ordenes_recientes
        })