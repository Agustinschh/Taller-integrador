from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Envio, ConfiguracionEnvio
from .serializers import EnvioSerializer
from .correo_argentino import calcular_cotizacion_correo_argentino

class EnvioViewSet(viewsets.ModelViewSet):
	serializer_class = EnvioSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		return Envio.objects.filter(usuario=self.request.user)

	def perform_create(self, serializer):
		serializer.save(usuario=self.request.user)


@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def cotizar_envio(request):
	"""
	Endpoint público para cotizar envíos con Correo Argentino
	Parámetros:
	- codigo_postal: string (ej: '1425', '5000', 'B1900')
	- subtotal: float / int (opcional, para evaluar envío gratis)
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

	if not codigo_postal or not str(codigo_postal).strip():
		return Response(
			{'error': 'Debes proporcionar un código postal para cotizar el envío.'},
			status=status.HTTP_400_BAD_REQUEST
		)

	# Obtener monto de envío gratis configurado si existe
	monto_envio_gratis = 50000
	config = ConfiguracionEnvio.objects.first()
	if config and config.monto_envio_gratis:
		monto_envio_gratis = float(config.monto_envio_gratis)

	cotizacion = calcular_cotizacion_correo_argentino(
		codigo_postal=str(codigo_postal).strip(),
		subtotal_carrito=subtotal,
		monto_envio_gratis=monto_envio_gratis
	)

	return Response(cotizacion, status=status.HTTP_200_OK)

