import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Clock, Truck, AlertCircle, Eye, ShoppingBag } from 'lucide-react';
import { ordenesService } from '../../services/ordenesServices';

export default function HistorialCompras() {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const data = await ordenesService.obtenerHistorial();
      setOrdenes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const getBadge = (estado) => {
    const est = (estado || '').toLowerCase();
    switch (est) {
      case 'pagado':
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {(estado || '').toUpperCase()}
          </span>
        );
      case 'enviado':
      case 'procesando':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" />
            {(estado || '').toUpperCase()}
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            {(estado || '').toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            {(estado || 'PENDIENTE').toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="display text-3xl font-bold mb-8" style={{ color: '#283655' }}>
          Historial de Compras
        </h1>

        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100" style={{ color: '#283655' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
                 style={{ borderColor: '#4D648D' }}></div>
            <p className="font-medium">Cargando historial de compras...</p>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100" style={{ color: '#283655' }}>
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-[#4D648D] opacity-60" />
            <h3 className="text-lg font-semibold text-[#283655] mb-2">No tienes compras registradas aún</h3>
            <p className="text-[#4D648D] mb-6 max-w-sm mx-auto">Explora nuestro catálogo y realiza tu primer pedido con nosotros.</p>
            <Button 
              onClick={() => navigate('/')} 
              style={{ backgroundColor: '#283655', color: '#D0E1F9' }}
              className="hover:opacity-90"
            >
              Explorar Productos
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ordenes.map((orden) => (
              <Card key={orden.id} className="hover:shadow-md transition-shadow border-gray-200 bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-[#283655]">Orden #{orden.id}</h3>
                        {getBadge(orden.estado)}
                      </div>
                      <p className="text-sm text-[#4D648D] mt-1">
                        {orden.fecha_formateada || (orden.fecha ? new Date(orden.fecha).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '')}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xl font-bold" style={{ color: '#283655' }}>
                        {formatPrice(orden.total)}
                      </p>
                      {orden.productos && (
                        <p className="text-xs text-gray-500">
                          {orden.productos.length} producto{orden.productos.length === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/orden/${orden.id}`)}
                      className="border-[#283655] text-[#283655] hover:bg-[#283655] hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}