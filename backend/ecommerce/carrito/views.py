from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db import connection, models
from .models import Carrito
from productos.models import Producto
from productos.serializers import ProductoSerializer


class CarritoViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def get_authenticators(self):
        from rest_framework_simplejwt.authentication import JWTAuthentication
        return [JWTAuthentication()]

    def _get_session_key(self, request):
        session_key = (
            request.headers.get('X-Session-Key')
            or request.query_params.get('session_key')
            or (request.data.get('session_key') if hasattr(request, 'data') and isinstance(request.data, dict) else None)
        )
        if not session_key:
            session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        return session_key

    def _get_or_create_carrito(self, request, create=True):
        if request.user and request.user.is_authenticated:
            carrito = Carrito.objects.filter(usuario=request.user).first()
            if not carrito and create:
                carrito = Carrito.objects.create(usuario=request.user, total=0)
            return carrito
        session_key = self._get_session_key(request)
        carrito = Carrito.objects.filter(session_key=session_key).first()
        if not carrito and create:
            carrito = Carrito.objects.create(session_key=session_key, total=0)
        return carrito

    def _get_precio_oferta_info(self, producto):
        now = timezone.now()
        oferta_activa = producto.ofertas.filter(
            activo=True,
            fecha_inicio__lte=now,
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).first()
        if oferta_activa:
            return float(oferta_activa.precio_con_descuento), True, int(oferta_activa.porcentaje_descuento)
        return float(producto.precio), False, 0

    def _get_lineas_sanitizadas(self, carrito, request):
        if not carrito:
            return []

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_producto, cantidad, subtotal FROM linea_carrito WHERE id_carrito = %s ORDER BY id_producto",
                [carrito.id],
            )
            rows = cursor.fetchall()

        if not rows:
            return []

        prod_ids = [r[0] for r in rows]
        productos_map = {
            p.id: p
            for p in Producto.objects.select_related('categoria', 'edad', 'pelicula').filter(id__in=prod_ids)
        }

        items = []
        for prod_id, cantidad, subtotal in rows:
            producto = productos_map.get(prod_id)
            if not producto or not producto.activo or producto.stock <= 0:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                        [carrito.id, prod_id],
                    )
                continue

            precio_base_oferta, tiene_oferta_prod, pct_prod = self._get_precio_oferta_info(producto)
            subtotal_guardado = float(subtotal) if subtotal is not None else (precio_base_oferta * cantidad)
            precio_unitario_efectivo = subtotal_guardado / cantidad if cantidad > 0 else precio_base_oferta

            if cantidad > producto.stock:
                cantidad = producto.stock
                subtotal_guardado = round(precio_unitario_efectivo * cantidad, 2)
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE linea_carrito SET cantidad = %s, subtotal = %s WHERE id_carrito = %s AND id_producto = %s",
                        [cantidad, subtotal_guardado, carrito.id, prod_id],
                    )

            precio_lista = float(producto.precio)
            tiene_descuento = tiene_oferta_prod or (precio_unitario_efectivo < precio_lista - 0.01)
            pct_efectivo = (
                round((1 - (precio_unitario_efectivo / precio_lista)) * 100)
                if (tiene_descuento and precio_lista > 0)
                else pct_prod
            )

            prod_data = ProductoSerializer(producto, context={'request': request}).data
            items.append({
                'id': producto.id,
                'usuario': carrito.usuario_id,
                'producto': prod_data,
                'cantidad': cantidad,
                'subtotal': round(subtotal_guardado, 2),
                'precio_unitario': round(precio_unitario_efectivo, 2),
                'tiene_oferta': tiene_descuento,
                'porcentaje_descuento': pct_efectivo,
            })

        return items

    def list(self, request):
        carrito = self._get_or_create_carrito(request, create=False)
        items = self._get_lineas_sanitizadas(carrito, request)
        return Response(items)

    def create(self, request):
        producto_id = request.data.get('producto') or request.data.get('producto_id')
        try:
            cantidad = int(request.data.get('cantidad', 1))
        except (ValueError, TypeError):
            cantidad = 1

        if not producto_id:
            return Response({'error': 'ID del producto es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        if cantidad <= 0:
            return Response({'error': 'La cantidad debe ser mayor a 0'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            producto = Producto.objects.get(id=producto_id)
        except Producto.DoesNotExist:
            return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if cantidad > producto.stock:
            return Response(
                {'error': f'Stock insuficiente. Disponible: {producto.stock}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user and request.user.is_authenticated:
            # Verificar stock acumulado antes de llamar al SP
            carrito = self._get_or_create_carrito(request, create=True)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT cantidad FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                    [carrito.id, producto.id],
                )
                row = cursor.fetchone()
                actual = row[0] if row else 0
                if actual + cantidad > producto.stock:
                    return Response(
                        {'error': f'Stock insuficiente. Máximo disponible: {producto.stock}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    cursor.execute(
                        "CALL pr_agregar_al_carrito(%s, %s, %s)",
                        [request.user.id, producto.id, cantidad],
                    )
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            carrito = self._get_or_create_carrito(request, create=True)
            precio_unit, _, _ = self._get_precio_oferta_info(producto)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT cantidad FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                    [carrito.id, producto.id],
                )
                row = cursor.fetchone()
                nueva_cantidad = (row[0] if row else 0) + cantidad
                if nueva_cantidad > producto.stock:
                    return Response(
                        {'error': f'Stock insuficiente. Máximo disponible: {producto.stock}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                cursor.execute(
                    """
                    INSERT INTO linea_carrito (id_carrito, id_producto, cantidad, subtotal)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id_carrito, id_producto)
                    DO UPDATE SET cantidad = EXCLUDED.cantidad, subtotal = EXCLUDED.subtotal
                    """,
                    [carrito.id, producto.id, nueva_cantidad, precio_unit * nueva_cantidad],
                )

        items = self._get_lineas_sanitizadas(carrito, request)
        item_resp = next((i for i in items if i['id'] == producto.id), None)
        return Response(item_resp or {'id': producto.id, 'cantidad': cantidad}, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        return self.update(request, pk=pk)

    def update(self, request, pk=None):
        carrito = self._get_or_create_carrito(request, create=False)
        if not carrito:
            return Response({'error': 'Carrito no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        try:
            cantidad = int(request.data.get('cantidad', 1))
        except (ValueError, TypeError):
            return Response({'error': 'Cantidad inválida'}, status=status.HTTP_400_BAD_REQUEST)

        prod_id = int(pk)
        try:
            producto = Producto.objects.get(id=prod_id)
        except Producto.DoesNotExist:
            return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if cantidad <= 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                    [carrito.id, prod_id],
                )
            return Response(status=status.HTTP_204_NO_CONTENT)

        if cantidad > producto.stock:
            return Response(
                {'error': f'Stock insuficiente. Máximo disponible: {producto.stock}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT cantidad, subtotal FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                [carrito.id, prod_id],
            )
            row_prev = cursor.fetchone()
            if row_prev and row_prev[0] > 0:
                precio_unit = float(row_prev[1]) / float(row_prev[0])
            else:
                precio_unit, _, _ = self._get_precio_oferta_info(producto)
            cursor.execute(
                "UPDATE linea_carrito SET cantidad = %s, subtotal = %s WHERE id_carrito = %s AND id_producto = %s",
                [cantidad, round(precio_unit * cantidad, 2), carrito.id, prod_id],
            )

        items = self._get_lineas_sanitizadas(carrito, request)
        item_resp = next((i for i in items if i['id'] == prod_id), None)
        return Response(item_resp or {'id': prod_id, 'cantidad': cantidad})

    def destroy(self, request, pk=None):
        carrito = self._get_or_create_carrito(request, create=False)
        if not carrito:
            return Response(status=status.HTTP_204_NO_CONTENT)
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                [carrito.id, int(pk)],
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def agregar_combo(self, request):
        """
        Agrega al carrito los productos de un combo respetando exactamente el precio
        configurado para el combo (prorrateado en linea_carrito.subtotal).
        Al concretar la compra, los triggers de PostgreSQL descuentan el stock de cada producto.
        """
        from ofertas.models import Combo
        from decimal import Decimal, ROUND_HALF_UP

        combo_id = request.data.get('combo_id')
        precio_combo_req = request.data.get('precio_combo')
        items_req = request.data.get('items')

        combo_items_data = []  # lista de (Producto, cantidad)
        precio_combo_total = None

        if combo_id:
            try:
                combo = Combo.objects.prefetch_related('items__producto').get(id=combo_id, activo=True)
            except Combo.DoesNotExist:
                return Response({'error': 'Combo no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            for ci in combo.items.all():
                if ci.producto:
                    combo_items_data.append((ci.producto, int(ci.cantidad or 1)))
            precio_combo_total = Decimal(str(combo.precio))
        elif items_req and precio_combo_req is not None:
            for it in items_req:
                pid = it.get('producto_id') or it.get('id')
                cant = int(it.get('cantidad', 1))
                if pid:
                    try:
                        prod = Producto.objects.get(id=pid)
                        combo_items_data.append((prod, cant))
                    except Producto.DoesNotExist:
                        return Response({'error': f'Producto {pid} no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            precio_combo_total = Decimal(str(precio_combo_req))
        else:
            return Response(
                {'error': 'Se requiere combo_id o (items y precio_combo)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not combo_items_data:
            return Response({'error': 'El combo no tiene productos asociados'}, status=status.HTTP_400_BAD_REQUEST)

        carrito = self._get_or_create_carrito(request, create=True)

        # 1. Validar stock disponible considerando lo que ya está en el carrito
        with connection.cursor() as cursor:
            for prod, cant in combo_items_data:
                cursor.execute(
                    "SELECT cantidad FROM linea_carrito WHERE id_carrito = %s AND id_producto = %s",
                    [carrito.id, prod.id],
                )
                row = cursor.fetchone()
                actual = row[0] if row else 0
                if actual + cant > prod.stock:
                    return Response(
                        {'error': f'Stock insuficiente para {prod.nombre}. Disponible: {prod.stock}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # 2. Prorratear precio_combo_total entre los productos incluidos (exacto al centavo)
        total_original = sum(Decimal(str(prod.precio)) * cant for prod, cant in combo_items_data)
        acumulado = Decimal('0.00')
        distribucion = []

        for idx, (prod, cant) in enumerate(combo_items_data):
            if idx == len(combo_items_data) - 1:
                sub = (precio_combo_total - acumulado).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            else:
                if total_original > 0:
                    proporcion = (Decimal(str(prod.precio)) * cant) / total_original
                else:
                    proporcion = Decimal('1') / Decimal(len(combo_items_data))
                sub = (precio_combo_total * proporcion).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                acumulado += sub
            if sub < Decimal('0.01'):
                sub = Decimal('0.01')
            distribucion.append((prod, cant, sub))

        # 3. Insertar/actualizar en linea_carrito (Trigger 5 actualiza carrito.total automáticamente)
        with connection.cursor() as cursor:
            for prod, cant, sub in distribucion:
                cursor.execute(
                    """
                    INSERT INTO linea_carrito (id_carrito, id_producto, cantidad, subtotal)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id_carrito, id_producto)
                    DO UPDATE SET
                        cantidad = linea_carrito.cantidad + EXCLUDED.cantidad,
                        subtotal = linea_carrito.subtotal + EXCLUDED.subtotal
                    """,
                    [carrito.id, prod.id, cant, sub],
                )

        items = self._get_lineas_sanitizadas(carrito, request)
        return Response({
            'message': 'Combo agregado al carrito con precio especial',
            'precio_combo': float(precio_combo_total),
            'items': items,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        carrito = self._get_or_create_carrito(request, create=False)
        items = self._get_lineas_sanitizadas(carrito, request)
        total_items = sum(i['cantidad'] for i in items)
        total_precio = sum(i['subtotal'] for i in items)
        return Response({
            'total_items': total_items,
            'total_precio': total_precio,
            'items_count': len(items),
        })

    @action(detail=False, methods=['delete'])
    def limpiar(self, request):
        carrito = self._get_or_create_carrito(request, create=False)
        count = 0
        if carrito:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM linea_carrito WHERE id_carrito = %s", [carrito.id])
                count = cursor.fetchone()[0]
                cursor.execute("DELETE FROM linea_carrito WHERE id_carrito = %s", [carrito.id])
        return Response({'message': f'{count} items eliminados del carrito'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def migrar_a_usuario(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Usuario debe estar autenticado'}, status=status.HTTP_401_UNAUTHORIZED)

        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'session_key es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        guest_carrito = Carrito.objects.filter(session_key=session_key).first()
        if not guest_carrito:
            return Response({'message': '0 items migrados al carrito de usuario'}, status=status.HTTP_200_OK)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_producto, cantidad FROM linea_carrito WHERE id_carrito = %s",
                [guest_carrito.id],
            )
            rows = cursor.fetchall()

        migrados = 0
        for prod_id, cant in rows:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("CALL pr_agregar_al_carrito(%s, %s, %s)", [request.user.id, prod_id, cant])
                migrados += 1
            except Exception:
                pass

        guest_carrito.delete()
        return Response({'message': f'{migrados} items migrados al carrito de usuario'}, status=status.HTTP_200_OK)
