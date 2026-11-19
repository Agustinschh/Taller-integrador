from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import connection
from .models import Envio, ConfiguracionEnvio
from .serializers import EnvioSerializer
from .correo_argentino import calcular_cotizacion_correo_argentino


class EnvioViewSet(viewsets.ModelViewSet):
    serializer_class = EnvioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Envio.objects.filter(orden__usuario=self.request.user)


@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def cotizar_envio(request):
    """
    Endpoint público para cotizar envíos integrando la función PostgreSQL
    calcular_costo_envio(cp) con el formato de opciones esperado por el frontend.
    """
    if request.method == 'GET':
        codigo_postal = request.query_params.get('codigo_postal', '')
        try:
            subtotal = float(request.query_params.get('subtotal', 0))
        except (ValueError, TypeError):
            subtotal = 0
    else:
        codigo_postal = request.data.get('codigo_postal', '')
        try:
            subtotal = float(request.data.get('subtotal', 0))
        except (ValueError, TypeError):
            subtotal = 0

    cp = str(codigo_postal).strip()
    if not cp:
        return Response(
            {'error': 'Debes proporcionar un código postal para cotizar el envío.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    monto_envio_gratis = 50000.0
    config = ConfiguracionEnvio.objects.first()
    if config and config.monto_envio_gratis:
        monto_envio_gratis = float(config.monto_envio_gratis)

    # 1. Consultar la función PostgreSQL calcular_costo_envio(p_codigo_postal)
    with connection.cursor() as cursor:
        cursor.execute("SELECT calcular_costo_envio(%s)", [cp])
        costo_pg = float(cursor.fetchone()[0])

    # 2. Construir la estructura completa esperada por el frontend (incluyendo opciones y region)
    cotizacion = calcular_cotizacion_correo_argentino(
        codigo_postal=cp,
        subtotal_carrito=subtotal,
        monto_envio_gratis=monto_envio_gratis,
    )

    aplica_gratis = cotizacion.get('envio_gratis_activo', False)
    costo_domicilio_final = 0 if aplica_gratis else costo_pg
    costo_sucursal_final = 0 if aplica_gratis else max(0, costo_pg - 1000)

    for opcion in cotizacion.get('opciones', []):
        if opcion['id'] == 'correo_domicilio':
            opcion['costo'] = costo_domicilio_final
            opcion['costo_original'] = costo_pg
        elif opcion['id'] == 'correo_sucursal':
            opcion['costo'] = costo_sucursal_final
            opcion['costo_original'] = max(0, costo_pg - 1000)

    cotizacion['costo'] = costo_domicilio_final
    cotizacion['costo_envio'] = costo_domicilio_final
    cotizacion['costo_original'] = costo_pg
    cotizacion['envio_gratis'] = aplica_gratis

    return Response(cotizacion, status=status.HTTP_200_OK)
