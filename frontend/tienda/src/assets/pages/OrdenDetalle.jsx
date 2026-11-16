import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import { ordenesService } from '../../services/ordenesServices';

export default function OrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orden, setOrden] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ordenesService.obtenerDetalleOrden(id);
      setOrden(data);
    } catch (err) {
      console.error('Error al cargar detalle de orden:', err);
      setError('No se pudo cargar el detalle de la compra. Verifica tu conexión o intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    const num = Number(price) || 0;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getEstadoBadge = (estado) => {
    const est = (estado || '').toLowerCase();
    switch (est) {
      case 'pagado':
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {estado.toUpperCase()}
          </span>
        );
      case 'enviado':
      case 'procesando':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3.5 h-3.5" />
            {estado.toUpperCase()}
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertCircle className="w-3.5 h-3.5" />
            {estado.toUpperCase()}
          </span>
        );
      case 'pendiente':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" />
            {(estado || 'PENDIENTE').toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Encabezado con navegación */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/historial-compras')}
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 text-[#283655]"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Historial
          </Button>
          
          <Link to="/">
            <Button
              variant="ghost"
              className="text-[#4D648D] hover:text-[#283655]"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Seguir Comprando
            </Button>
          </Link>
        </div>

        {/* Estado de Carga */}
        {isLoading && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
              style={{ borderColor: '#4D648D' }}
            ></div>
            <p className="text-[#283655] font-medium">Cargando detalles de la orden #{id}...</p>
          </div>
        )}

        {/* Estado de Error */}
        {!isLoading && error && (
          <Card className="border-red-200 bg-red-50 text-center py-12">
            <CardContent>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
              <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
              <Button
                onClick={cargarDetalle}
                className="bg-[#283655] text-white hover:bg-[#1E2738]"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Detalle de la Orden */}
        {!isLoading && !error && orden && (
          <div className="space-y-6">
            {/* Card Principal de Cabecera */}
            <Card className="shadow-sm border-gray-200 overflow-hidden">
              <div className="bg-[#283655] text-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[#D0E1F9] mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>{orden.fecha_formateada || (orden.fecha ? new Date(orden.fecha).toLocaleString('es-CL') : '')}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                      Orden #{orden.id}
                    </h1>
                  </div>
                  <div>
                    {getEstadoBadge(orden.estado)}
                  </div>
                </div>
              </div>

              <CardContent className="p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resumen de Entrega */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <Truck className="w-5 h-5 text-[#4D648D] mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#283655] uppercase tracking-wider">
                        Método de Entrega
                      </h3>
                      <p className="text-gray-700 font-medium mt-1">
                        {orden.metodo_entrega_display || (orden.metodo_entrega === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio')}
                      </p>
                      {orden.direccion_envio && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {orden.direccion_envio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Resumen de Comprador */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <Package className="w-5 h-5 text-[#4D648D] mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#283655] uppercase tracking-wider">
                        Destinatario / Contacto
                      </h3>
                      <p className="text-gray-700 font-medium mt-1">
                        {orden.nombre_completo || orden.nombre_invitado || 'Cliente'}
                      </p>
                      {(orden.email_contacto || orden.email_invitado) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {orden.email_contacto || orden.email_invitado}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Listado de Productos */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold text-[#283655] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#4D648D]" />
                  Productos en esta orden ({orden.productos ? orden.productos.length : 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-100">
                {orden.productos && orden.productos.length > 0 ? (
                  orden.productos.map((item, index) => (
                    <div key={item.id || index} className="p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[#4D648D] font-bold">
                          {item.cantidad}x
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 text-base">
                            {item.nombre_producto}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Precio unitario: {formatPrice(item.precio_producto)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 text-base">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No se encontraron productos registrados en esta orden.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de Totales y Pagos */}
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="border-b border-gray-100 pb-3">
                <CardTitle className="text-lg font-bold text-[#283655] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#4D648D]" />
                  Resumen del Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 max-w-sm ml-auto text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal de productos:</span>
                    <span className="font-medium text-gray-800">
                      {formatPrice(
                        orden.productos?.reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0) || (Number(orden.total) - Number(orden.costo_envio || 0))
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Costo de envío:</span>
                    <span className="font-medium text-gray-800">
                      {Number(orden.costo_envio) > 0 ? formatPrice(orden.costo_envio) : 'Gratis'}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-base">
                    <span className="font-bold text-[#283655]">Total Pagado:</span>
                    <span className="text-xl font-extrabold text-[#283655]">
                      {formatPrice(orden.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
