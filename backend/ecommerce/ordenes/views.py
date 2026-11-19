from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import connection, transaction, models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from decimal import Decimal
from .models import Orden
from .serializers import OrdenSerializer, OrdenInvitadoSerializer, obtener_lineas_compra
from carrito.models import Carrito
from pagos.models import Pago
from envios.models import Envio, ConfiguracionEnvio
from cupones.models import Cupon
from productos.models import Producto


@method_decorator(csrf_exempt, name='dispatch')
class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_permissions(self):
        if self.action in ['crear_orden_invitado', 'preparar_pago_invitado']:
            return []
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            if self.request.user.is_staff and self.action in ['reporte_ventas', 'retrieve', 'update', 'partial_update']:
                return Orden.objects.all()
            return Orden.objects.filter(usuario=self.request.user)
        return Orden.objects.none()

    @action(detail=False, methods=['get'])
    def historial(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
        ordenes = Orden.objects.filter(usuario=request.user).order_by('-fecha')
        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def historial_sp(self, request):
        """Consulta la función PostgreSQL historial_compras_usuario(p_id_usuario)"""
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_compra, fecha, total, nombre_producto, cantidad FROM historial_compras_usuario(%s)",
                [request.user.id],
            )
            rows = cursor.fetchall()
        data = [
            {
                'id_compra': r[0],
                'fecha': r[1],
                'total': float(r[2]),
                'nombre_producto': r[3],
                'cantidad': r[4],
            }
            for r in rows
        ]
        return Response(data)

    @action(detail=True, methods=['get'])
    def detalle_orden(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            orden = self.get_object()
            serializer = self.get_serializer(orden)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': f'Orden no encontrada: {str(e)}'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def verificar_orden_pendiente(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
        orden_pendiente = Orden.objects.filter(
            usuario=request.user,
            estado='pendiente',
        ).order_by('-fecha').first()

        if orden_pendiente:
            lineas = obtener_lineas_compra(orden_pendiente.id)
            productos = [
                {
                    'nombre': item['nombre_producto'],
                    'cantidad': item['cantidad'],
                    'precio': item['precio_producto'],
                    'subtotal': item['subtotal'],
                }
                for item in lineas
            ]
            return Response({
                'tiene_pendiente': True,
                'orden': {
                    'id': orden_pendiente.id,
                    'total': float(orden_pendiente.total),
                    'fecha': orden_pendiente.fecha,
                    'productos': productos,
                },
            })
        return Response({'tiene_pendiente': False})

    @action(detail=False, methods=['post'])
    def cancelar_orden_pendiente(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
        orden_id = request.data.get('orden_id')
        if not orden_id:
            return Response({'error': 'Se requiere orden_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                orden = Orden.objects.get(id=orden_id, usuario=request.user, estado='pendiente')
                # Al pasar pago.estado_pago a 'CANCELADO', el Trigger 3 repone el stock automáticamente
                pago = Pago.objects.filter(orden=orden).first()
                if pago:
                    pago.estado = 'CANCELADO'
                    pago.save()
                orden.estado = 'cancelado'
                orden.save()

            return Response({'message': 'Orden cancelada exitosamente', 'orden_id': orden.id})
        except Orden.DoesNotExist:
            return Response({'error': 'Orden no encontrada o ya procesada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def crear_orden_usuario(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Usuario no autenticado'}, status=status.HTTP_401_UNAUTHORIZED)

        # Cancelar órdenes pendientes anteriores (dispara Trigger 3 si tenían pago)
        for orden_pendiente in Orden.objects.filter(usuario=request.user, estado='pendiente'):
            pago_prev = Pago.objects.filter(orden=orden_pendiente).first()
            if pago_prev and pago_prev.estado != 'CANCELADO':
                pago_prev.estado = 'CANCELADO'
                pago_prev.save()
            orden_pendiente.estado = 'cancelado'
            orden_pendiente.save()

        carrito = Carrito.objects.filter(usuario=request.user).first()
        if not carrito:
            return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

        metodo_entrega = request.data.get('metodo_entrega', 'delivery')
        if metodo_entrega not in ['delivery', 'retiro']:
            metodo_entrega = 'delivery'

        direccion_envio = (
            request.data.get('direccion')
            or request.user.direccion
            or 'Retiro en tienda'
        )[:150]
        cupon_codigo = request.data.get('cupon_codigo')
        cupon_codigo_clean = cupon_codigo.upper().strip() if cupon_codigo else None

        try:
            with transaction.atomic():
                # Ejecutar el procedimiento almacenado PostgreSQL pr_concretar_compra
                # Esto valida stock, aplica cupón, calcula envío con calcular_costo_envio(),
                # inserta compra, linea_compra (Trigger 2 -> movimiento_stock -> Trigger 1),
                # pago (Trigger 6), envio y limpia el carrito (Trigger 5).
                with connection.cursor() as cursor:
                    cursor.execute(
                        "CALL pr_concretar_compra(%s, %s, %s)",
                        [request.user.id, direccion_envio, cupon_codigo_clean],
                    )

                orden = Orden.objects.filter(usuario=request.user).order_by('-id').first()
                envio = Envio.objects.filter(orden=orden).first()
                costo_envio = Decimal(envio.costo) if envio else Decimal('0')

                config_envio = ConfiguracionEnvio.objects.first()
                monto_gratis = config_envio.monto_envio_gratis if config_envio else Decimal('50000')
                envio_gratis_desbloqueado = orden.subtotal >= monto_gratis

                if metodo_entrega == 'retiro' or envio_gratis_desbloqueado:
                    if costo_envio > 0:
                        nuevo_total = max(Decimal('0.01'), orden.subtotal - orden.descuento)
                        orden.costo_envio = Decimal('0')
                        orden.total = nuevo_total
                        orden.metodo_entrega = metodo_entrega
                        orden.save()
                        if envio:
                            envio.costo = Decimal('0')
                            envio.tipo = metodo_entrega
                            envio.save()
                        pago = Pago.objects.filter(orden=orden).first()
                        if pago:
                            pago.monto = nuevo_total
                            pago.save()
                        costo_envio = Decimal('0')
                else:
                    orden.costo_envio = costo_envio
                    orden.metodo_entrega = metodo_entrega
                    orden.save()
                    if envio:
                        envio.tipo = metodo_entrega
                        envio.save()

            return Response({
                'orden_id': orden.id,
                'total': float(orden.total),
                'total_productos': float(orden.subtotal),
                'metodo_entrega': orden.metodo_entrega,
                'costo_envio': float(costo_envio),
                'descuento_cupon': float(orden.descuento),
                'envio_gratis_desbloqueado': envio_gratis_desbloqueado,
                'message': 'Orden creada exitosamente',
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Error al procesar la orden: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['post'])
    def preparar_pago_invitado(self, request):
        serializer = OrdenInvitadoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        session_key = (
            request.data.get('session_key')
            or request.headers.get('X-Session-Key')
            or request.session.session_key
        )
        if not session_key:
            request.session.create()
            session_key = request.session.session_key

        carrito = Carrito.objects.filter(session_key=session_key).first()
        if not carrito:
            return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_producto, cantidad, subtotal FROM linea_carrito WHERE id_carrito = %s",
                [carrito.id],
            )
            lineas = cursor.fetchall()

        if not lineas:
            return Response({'error': 'El carrito está vacío'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Cancelar órdenes previas pendientes de esta sesión (Trigger 3 repone stock)
                for prev in Orden.objects.filter(session_key=session_key, estado='pendiente'):
                    pago_prev = Pago.objects.filter(orden=prev).first()
                    if pago_prev and pago_prev.estado != 'CANCELADO':
                        pago_prev.estado = 'CANCELADO'
                        pago_prev.save()
                    prev.estado = 'cancelado'
                    prev.save()

                metodo_entrega = serializer.validated_data.get('metodo_entrega', 'delivery')
                config_envio = ConfiguracionEnvio.objects.first()
                monto_gratis = config_envio.monto_envio_gratis if config_envio else Decimal('50000')
                costo_base = config_envio.costo_base_envio if config_envio else Decimal('3500')

                total_productos = Decimal('0')
                items_det = []
                for prod_id, cant, sub in lineas:
                    prod = Producto.objects.get(id=prod_id)
                    if cant > prod.stock:
                        return Response(
                            {'error': f'Stock insuficiente para {prod.nombre}. Stock disponible: {prod.stock}'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    precio_unit = Decimal(sub) / Decimal(cant) if cant else prod.precio
                    total_productos += Decimal(sub)
                    items_det.append((prod_id, cant, precio_unit, Decimal(sub)))

                envio_gratis_desbloqueado = total_productos >= monto_gratis
                costo_envio_req = request.data.get('costo_envio')
                if metodo_entrega == 'retiro' or envio_gratis_desbloqueado:
                    costo_envio = Decimal('0')
                elif costo_envio_req is not None:
                    try:
                        costo_envio = Decimal(str(costo_envio_req))
                    except Exception:
                        costo_envio = costo_base
                else:
                    costo_envio = costo_base

                cupon_codigo = request.data.get('cupon_codigo')
                descuento_cupon = Decimal('0')
                cupon_obj = None
                if cupon_codigo:
                    cupon_obj = Cupon.objects.filter(codigo=cupon_codigo.upper()).first()
                    if cupon_obj and cupon_obj.is_valid():
                        descuento_cupon = (total_productos * Decimal(cupon_obj.porcentaje_descuento)) / Decimal('100')
                        cupon_obj.usar()

                total_final = max(Decimal('0.01'), (total_productos + costo_envio) - descuento_cupon)

                orden = Orden.objects.create(
                    usuario=None,
                    session_key=session_key,
                    subtotal=total_productos,
                    descuento=descuento_cupon,
                    total=total_final,
                    cupon=cupon_obj,
                    email_invitado=serializer.validated_data['email'],
                    nombre_invitado=serializer.validated_data['nombre'],
                    telefono_invitado=serializer.validated_data.get('telefono', ''),
                    direccion_invitado=serializer.validated_data.get('direccion', ''),
                    metodo_entrega=metodo_entrega,
                    costo_envio=costo_envio,
                    estado='pendiente',
                )

                # Insertar en linea_compra (dispara Trigger 2 -> movimiento_stock -> Trigger 1)
                with connection.cursor() as cursor:
                    for prod_id, cant, precio_unit, sub in items_det:
                        cursor.execute(
                            """
                            INSERT INTO linea_compra (id_compra, id_producto, cantidad, precio_unitario, subtotal)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            [orden.id, prod_id, cant, precio_unit, sub],
                        )

                Pago.objects.create(orden=orden, monto=total_final, estado='PENDIENTE')
                Envio.objects.create(
                    orden=orden,
                    direccion=(serializer.validated_data.get('direccion') or 'Retiro en tienda')[:150],
                    costo=costo_envio,
                    estado='PREPARACION',
                    tipo=metodo_entrega,
                )

            return Response({
                'orden_id': orden.id,
                'session_key': session_key,
                'total': float(total_final),
                'total_productos': float(total_productos),
                'metodo_entrega': metodo_entrega,
                'costo_envio': float(costo_envio),
                'descuento_cupon': float(descuento_cupon),
                'envio_gratis_desbloqueado': envio_gratis_desbloqueado,
                'message': 'Orden de invitado creada exitosamente',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def reporte_ventas(self, request):
        if not (request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)):
            return Response({'error': 'Permiso denegado. Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)

        ordenes = Orden.objects.all()
        ordenes_pagadas = ordenes.filter(estado__in=['pagado', 'enviado', 'entregado', 'procesando'])

        total_ingresos = sum(float(o.total) for o in ordenes_pagadas)
        total_ordenes = ordenes.count()
        total_pagadas = ordenes_pagadas.count()
        ticket_promedio = (total_ingresos / total_pagadas) if total_pagadas > 0 else 0

        # Ventas por producto usando linea_compra + compra
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT lc.id_producto, p.nombre_producto, p.imagen,
                       SUM(lc.cantidad) AS unidades, SUM(lc.subtotal) AS total_generado
                FROM linea_compra lc
                JOIN compra c ON c.id_compra = lc.id_compra
                JOIN producto p ON p.id_producto = lc.id_producto
                WHERE c.estado IN ('pagado', 'enviado', 'entregado', 'procesando')
                GROUP BY lc.id_producto, p.nombre_producto, p.imagen
                ORDER BY unidades DESC
                LIMIT 8
                """
            )
            top_rows = cursor.fetchall()

        top_productos = []
        for prod_id, nombre, imagen, unidades, total_gen in top_rows:
            imagen_url = None
            if imagen:
                img_str = str(imagen)
                imagen_url = img_str if img_str.startswith('http') else request.build_absolute_uri(f'/media/{img_str}')
            top_productos.append({
                'id': prod_id,
                'nombre': nombre,
                'imagen': imagen_url,
                'unidades': int(unidades or 0),
                'total_generado': float(total_gen or 0),
            })

        total_unidades = sum(p['unidades'] for p in top_productos)

        estados_count = {}
        for orden in ordenes:
            estados_count[orden.estado] = estados_count.get(orden.estado, 0) + 1

        # También consultar la vista PostgreSQL vista_reporte_ventas
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM vista_reporte_ventas ORDER BY fecha_compra DESC LIMIT 50")
            cols = [col[0] for col in cursor.description]
            reporte_vista = [dict(zip(cols, row)) for row in cursor.fetchall()]

        ordenes_recientes = OrdenSerializer(
            ordenes.order_by('-fecha')[:15],
            many=True,
            context={'request': request},
        ).data

        return Response({
            'total_ingresos': total_ingresos,
            'total_ordenes': total_ordenes,
            'total_pagadas': total_pagadas,
            'ticket_promedio': ticket_promedio,
            'total_unidades': total_unidades,
            'estados_count': estados_count,
            'top_productos': top_productos,
            'ordenes_recientes': ordenes_recientes,
            'vista_reporte_ventas': reporte_vista,
        })
