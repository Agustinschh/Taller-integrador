from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cupon
from .serializers import CuponSerializer

class CuponViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Cupon.objects.all()

    @action(detail=False, methods=['post'])
    def validar(self, request):
        codigo = request.data.get('codigo')
        if not codigo:
            return Response({'error': 'Código de cupón es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            cupon = Cupon.objects.get(codigo=codigo.upper())
            if cupon.is_valid():
                serializer = CuponSerializer(cupon)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'El cupón no es válido o ha expirado'}, status=status.HTTP_400_BAD_REQUEST)
        except Cupon.DoesNotExist:
            return Response({'error': 'Cupón no encontrado'}, status=status.HTTP_404_NOT_FOUND)
