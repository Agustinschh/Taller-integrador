import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Check, X, Clock, AlertCircle, Home, ShoppingBag } from 'lucide-react';
import { mercadoPagoService } from '../../services/carritoService';
import { useCarrito } from '../../context/CarritoContext';
import API_BASE_URL from '../../config';

const EstadoPago = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ordenId } = useParams();
  const { cargarCarrito } = useCarrito();
  const [estado, setEstado] = useState('verificando');
  const [datosPago, setDatosPago] = useState(null);
  const [error, setError] = useState('');

 
  const collection_status = searchParams.get('collection_status');
  const payment_id = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const external_reference = searchParams.get('external_reference');
  const preference_id = searchParams.get('preference_id');

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (currentPath.includes('/pago/procesar/') && ordenId) {
      procesarPago();
    } else {
      verificarEstadoPago();
    }
  }, [ordenId]);

  const procesarPago = async () => {
    try {
      setEstado('procesando');
      const response = await mercadoPagoService.crearPreferencia(ordenId);
      
      const initPoint = response.init_point || response.sandbox_init_point;
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        setError('Error al crear la preferencia de pago');
        setEstado('error');
      }
    } catch (error) {
      setError('Error al procesar el pago');
      setEstado('error');
    }
  };

  const verificarEstadoPago = async () => {
    try {
      setEstado('verificando');

      const currentPath = window.location.pathname;
      const isApproved = currentPath.includes('exitoso') || status === 'approved' || collection_status === 'approved';
      const isRejected = currentPath.includes('fallido') || status === 'rejected' || collection_status === 'rejected';
      const isPending = currentPath.includes('pendiente') || status === 'pending' || collection_status === 'pending';

      let nuevoEstado = isApproved ? 'exitoso' : (isRejected ? 'rechazado' : (isPending ? 'pendiente' : 'desconocido'));
      setEstado(nuevoEstado);

      // Notificar al backend para que actualice la orden a 'pagado' en la base de datos
      const token = localStorage.getItem('access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        await fetch(`${API_BASE_URL}/pagos/pagos/confirmar-retorno/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            payment_id: payment_id || '',
            external_reference: external_reference || ordenId || '',
            status: isApproved ? 'approved' : (isRejected ? 'rejected' : status || collection_status || 'approved'),
            collection_status: collection_status || ''
          })
        });
      } catch (backendErr) {
        console.warn('No se pudo sincronizar retorno con el backend:', backendErr);
      }

      if (isApproved) {
        // Limpiar datos temporales de compra y refrescar carrito
        try {
          localStorage.removeItem('guest_data');
          localStorage.removeItem('costo_envio');
          localStorage.removeItem('metodo_entrega');
          localStorage.removeItem('orden_pendiente');
          if (cargarCarrito) {
            cargarCarrito();
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (payment_id || external_reference) {
        setDatosPago({
          payment_id,
          external_reference,
          status: status || collection_status || (isApproved ? 'approved' : '')
        });
      }
    } catch (error) {
      setError('Error de conexión al verificar el pago');
      setEstado('error');
    }
  };

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer;
    if (estado === 'exitoso') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [estado, navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getEstadoInfo = () => {
    switch (estado) {
      case 'exitoso':
        return {
          icon: <Check className="h-12 w-12 text-green-600" />,
          bgColor: 'bg-green-100',
          title: '¡Pago Exitoso!',
          titleColor: 'text-green-800',
          message: 'Tu pago se ha procesado correctamente. Recibirás un email de confirmación.',
          actions: [
            {
              text: 'Ver Mi Historial',
              onClick: () => navigate('/historial-compras'),
              primary: true
            },
            {
              text: 'Seguir Comprando',
              onClick: () => navigate('/'),
              primary: false
            }
          ]
        };
      
      case 'pendiente':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-600" />,
          bgColor: 'bg-yellow-100',
          title: 'Pago Pendiente',
          titleColor: 'text-yellow-800',
          message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
          actions: [
            {
              text: 'Ver Mi Historial',
              onClick: () => navigate('/historial-compras'),
              primary: true
            },
            {
              text: 'Inicio',
              onClick: () => navigate('/'),
              primary: false
            }
          ]
        };
      
      case 'rechazado':
        return {
          icon: <X className="Display h-12 w-12 text-red-600" />,
          bgColor: 'bg-red-100',
          title: 'Pago Rechazado',
          titleColor: 'text-red-800',
          message: 'Tu pago no pudo ser procesado. Verifica los datos de tu tarjeta o intenta con otro método.',
          actions: [
            {
              text: 'Intentar Nuevamente',
              onClick: () => navigate('/carrito'),
              primary: true
            },
            {
              text: 'Ir al Inicio',
              onClick: () => navigate('/'),
              primary: false
            }
          ]
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="h-12 w-12 text-red-600" />,
          bgColor: 'bg-red-100',
          title: 'Error de Verificación',
          titleColor: 'text-red-800',
          message: error || 'No pudimos verificar el estado de tu pago. Contacta con soporte.',
          actions: [
            {
              text: 'Reintentar',
              onClick: verificarEstadoPago,
              primary: true
            },
            {
              text: 'Ir al Inicio',
              onClick: () => navigate('/'),
              primary: false
            }
          ]
        };
      
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-gray-600" />,
          bgColor: 'bg-gray-100',
          title: 'Estado Desconocido',
          titleColor: 'text-gray-800',
          message: 'No pudimos determinar el estado de tu pago.',
          actions: [
            {
              text: 'Contactar Soporte',
              onClick: () => navigate('/'),
              primary: true
            }
          ]
        };
    }
  };

  if (estado === 'verificando') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: '#f83258' }}></div>
          <p style={{ color: '#8c000f' }}>Verificando estado del pago...</p>
        </div>
      </div>
    );
  }

  if (estado === 'procesando') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: '#f83258' }}></div>
          <p style={{ color: '#8c000f' }}>Preparando tu pago...</p>
          <p className="text-gray-600 mt-2">Serás redirigido a MercadoPago en un momento</p>
        </div>
      </div>
    );
  }



  const estadoInfo = getEstadoInfo();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <div className={`mx-auto w-20 h-20 ${estadoInfo.bgColor} rounded-full flex items-center justify-center mb-4`}>
              {estadoInfo.icon}
            </div>
            <CardTitle className={estadoInfo.titleColor}>
              {estadoInfo.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
          
            <div className="text-center">
              <p className="text-gray-600 text-lg">
                {estadoInfo.message}
              </p>
            </div>

          
            {datosPago && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Detalles del Pago</h3>
                <div className="space-y-2">
                  {datosPago.amount && (
                    <div className="flex justify-between">
                      <span>Monto:</span>
                      <span className="font-semibold">{formatPrice(datosPago.amount)}</span>
                    </div>
                  )}
                  {payment_id && (
                    <div className="flex justify-between">
                      <span>ID de Pago:</span>
                      <span className="font-mono text-sm">{payment_id}</span>
                    </div>
                  )}
                  {external_reference && (
                    <div className="flex justify-between">
                      <span>Orden:</span>
                      <span>#{external_reference.replace('orden_', '')}</span>
                    </div>
                  )}
                  {datosPago.payment_method && (
                    <div className="flex justify-between">
                      <span>Método de Pago:</span>
                      <span className="capitalize">{datosPago.payment_method}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          
            <div className="space-y-3">
              {estadoInfo.actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  className={`w-full ${action.primary 
                    ? 'text-white' 
                    : 'bg-white border border-gray-300'
                  }`}
                  style={action.primary ? { backgroundColor: '#8c000f' } : { color: '#8c000f' }}
                >
                  {action.primary && index === 0 && estado === 'exitoso' && (
                    <ShoppingBag className="h-5 w-5 mr-2" />
                  )}
                  {action.primary && index === 0 && estado !== 'exitoso' && (
                    <Home className="h-5 w-5 mr-2" />
                  )}
                  {action.text}
                </Button>
              ))}
            </div>

          
            {estado === 'exitoso' && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">¿Qué sigue?</h4>
                <ul className="text-sm text-blue-700 space-y-1 mb-3">
                  <li>• Recibirás un email de confirmación</li>
                  <li>• Preparamos tu pedido en 24-48 horas</li>
                  <li>• Te notificaremos cuando sea enviado</li>
                  <li>• Puedes rastrear tu pedido en "Mi Historial"</li>
                </ul>
                <p className="text-sm font-semibold text-blue-800 border-t border-blue-200 pt-2">
                  Serás redirigido al inicio en {countdown} segundos...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstadoPago;