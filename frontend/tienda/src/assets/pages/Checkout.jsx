import { useState, useEffect } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import { ordenService, carritoService, mercadoPagoService } from '../../services/carritoService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, CreditCard, User, Mail, Phone, MapPin, ShoppingBag, Check, Truck, Store, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { envioService } from '../../services/envioService';

const Checkout = () => {
  const { items, resumen, isAuthenticated, isLoading } = useCarrito();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [redirigiendoMP, setRedirigiendoMP] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    telefono: '',
    direccion: '',
    codigo_postal: localStorage.getItem('codigo_postal') || '',
    metodo_entrega: localStorage.getItem('metodo_entrega') || 'delivery' 
  });
  
  const [cotizacionEnvio, setCotizacionEnvio] = useState(null);
  const [cotizandoEnvio, setCotizandoEnvio] = useState(false);
  const [opcionEnvioSeleccionada, setOpcionEnvioSeleccionada] = useState(() => localStorage.getItem('tipo_envio') || 'correo_domicilio');
  const [nombreEnvioSeleccionado, setNombreEnvioSeleccionado] = useState(() => localStorage.getItem('nombre_envio') || 'Correo Argentino - Envío a Domicilio');
  
  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [cuponError, setCuponError] = useState('');
  const [validandoCupon, setValidandoCupon] = useState(false);
  
  const [errors, setErrors] = useState({});

  
  useEffect(() => {
    const metodoEntregaGuardado = localStorage.getItem('metodo_entrega');
    if (metodoEntregaGuardado) {
      setFormData(prev => ({
        ...prev,
        metodo_entrega: metodoEntregaGuardado
      }));
    }
  }, []);

  useEffect(() => {
    
    const timer = setTimeout(() => {
      
      if (!isLoading && items.length === 0) {
        window.location.href = '/carrito';
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [items, isLoading]);

  
  useEffect(() => {
    const cargarPerfilUsuario = async () => {
      if (isAuthenticated && !userProfile) {
        try {
          const perfil = await carritoService.obtenerPerfilUsuario();
          setUserProfile(perfil);
        } catch (error) {
          console.error('Error al cargar perfil:', error);
        }
      }
    };

    cargarPerfilUsuario();
  }, [isAuthenticated, userProfile]);

  
  useEffect(() => {
    
    const ordenPendiente = localStorage.getItem('orden_pendiente');
    if (ordenPendiente) {
      localStorage.removeItem('orden_pendiente');
    }
    
   
    setOrdenCreada(null);
    setProcessing(false);
    setErrors({});
  }, []); 

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };


  const calcularCostoEnvio = () => {
    const totalProductos = resumen.total_precio || 0;
    const envioGratisDesbloqueado = totalProductos >= 50000;
    
    if (formData.metodo_entrega === 'retiro' || opcionEnvioSeleccionada === 'retiro_tienda') return 0;
    if (envioGratisDesbloqueado) return 0;
    
    const costoGuardado = localStorage.getItem('costo_envio');
    if (costoGuardado) {
      return parseInt(costoGuardado);
    }
    return 4850;
  };

  const estaEnvioGratis = () => {
    const totalProductos = resumen.total_precio || 0;
    return totalProductos >= 50000 && formData.metodo_entrega !== 'retiro';
  };


  const calcularTotal = () => {
    let total = resumen.total_precio + calcularCostoEnvio();
    if (cuponAplicado) {
        total -= (resumen.total_precio * cuponAplicado.porcentaje_descuento) / 100;
    }
    return Math.max(0, total);
  };

  const handleAplicarCupon = async () => {
    if (!cuponCodigo.trim()) return;
    
    setValidandoCupon(true);
    setCuponError('');
    
    try {
        const response = await fetch('http://127.0.0.1:8000/api/cupones/validar/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codigo: cuponCodigo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setCuponAplicado(data);
            setCuponError('');
        } else {
            setCuponError(data.error || 'Cupón inválido');
            setCuponAplicado(null);
        }
    } catch (error) {
        setCuponError('Error al validar el cupón');
        setCuponAplicado(null);
    } finally {
        setValidandoCupon(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }
    

    if (formData.metodo_entrega === 'delivery' && !formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida para delivery';
    }
    
    if (!formData.metodo_entrega) {
      newErrors.metodo_entrega = 'Debe seleccionar un método de entrega';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !isAuthenticated) {
      if (!validateForm()) {
        return;
      }
    }
    
  
    if (step === 1) {
      setStep(2);
     
      setTimeout(() => {
        handleFinalizarCompra();
      }, 100);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(prev => prev - 1);
  };


  const irAMercadoPago = () => {
    const initPoint = ordenCreada?.init_point || ordenCreada?.sandbox_init_point;
    if (initPoint) {
      setRedirigiendoMP(true);
      window.location.href = initPoint;
    } else {
      setErrors({ general: 'No se encontró el enlace de pago de MercadoPago' });
    }
  };

  const handleFinalizarCompra = async () => {
    setProcessing(true);
    
    try {
      let result;
      
    
      const metodoEntregaGuardado = localStorage.getItem('metodo_entrega') || 'delivery';
      const costoEnvioCalculado = calcularCostoEnvio();
      const datosParaEnvio = {
        ...formData,
        metodo_entrega: metodoEntregaGuardado,
        costo_envio: costoEnvioCalculado
      };
      
      if (isAuthenticated) {
        result = await ordenService.crearOrdenUsuario({ 
          metodo_entrega: metodoEntregaGuardado,
          costo_envio: costoEnvioCalculado,
          cupon_codigo: cuponAplicado?.codigo
        });
        
        
        const ordenId = result.orden_id || result.orden?.id;
        if (ordenId) {
          const preferenciaResponse = await mercadoPagoService.crearPreferencia(ordenId);
          
          if (preferenciaResponse.preference_id) {
            const ordenCompleta = {
              id: ordenId,
              orden_id: ordenId,
              total: result.total || result.orden?.total,
              preference_id: preferenciaResponse.preference_id,
              init_point: preferenciaResponse.init_point,
              sandbox_init_point: preferenciaResponse.sandbox_init_point,
              mercadopago_ready: true,
              ...result
            };
            
            setOrdenCreada(ordenCompleta);
          } else {
            throw new Error('No se recibió el preference_id de MercadoPago');
          }
        }
      } else {
        
        result = await ordenService.prepararPagoInvitado({
          ...datosParaEnvio,
          cupon_codigo: cuponAplicado?.codigo
        });
        
        
        const sessionKey = result.session_key;
        if (sessionKey) {
          const preferenciaResponse = await mercadoPagoService.crearPreferenciaDesdeCarrito(sessionKey);
          
          if (preferenciaResponse.preference_id) {
            const ordenCompleta = {
              session_key: sessionKey,
              total: result.total,
              preference_id: preferenciaResponse.preference_id,
              init_point: preferenciaResponse.init_point,
              sandbox_init_point: preferenciaResponse.sandbox_init_point,
              mercadopago_ready: true,
              metodo_entrega: result.metodo_entrega,
              costo_envio: result.costo_envio,
              es_invitado: true 
            };
            
            setOrdenCreada(ordenCompleta);
          } else {
            throw new Error('No se recibió el preference_id de MercadoPago');
          }
        } else {
          throw new Error('No se pudo obtener el session_key');
        }
      }
      
    } catch (error) {
      
      
     
      let errorMessage = 'Error al procesar la orden';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#283655' }}></div>
          <p style={{ color: '#283655' }}>Cargando checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="display min-h-screen bg-gray-50">
 
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/carrito'}
              className="flex items-center gap-2"
              style={{ color: '#283655' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Carrito
            </Button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#283655' }}>
                Finalizar Compra
              </h1>
              <p className="text-gray-600 mt-1">
                {!isAuthenticated ? 'Checkout como invitado' : 'Checkout'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
    
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
    
            <div className={`flex items-center ${step >= 1 ? 'text-[#283655]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-[#283655] text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="ml-2 hidden sm:inline">
                {isAuthenticated ? 'Información' : 'Datos Personales'}
              </span>
            </div>
            
            <div className="w-12 h-px bg-gray-300"></div>
            
    
            <div className={`flex items-center ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200'
              }`}>
                {step > 2 ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="ml-2 hidden sm:inline">Resumen</span>
            </div>
            
            <div className="w-12 h-px bg-gray-300"></div>
            

            <div className={`flex items-center ${step >= 3 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 hidden sm:inline">Confirmación</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: '#283655' }}>
                    <User className="h-5 w-5" />
                    {isAuthenticated ? 'Confirmar Información' : 'Información de Contacto'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isAuthenticated && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="tu@email.com"
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre Completo *
                        </label>
                        <Input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          placeholder="Tu nombre completo"
                          className={errors.nombre ? 'border-red-500' : ''}
                        />
                        {errors.nombre && (
                          <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono *
                        </label>
                        <Input
                          type="tel"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          placeholder="+56 9 1234 5678"
                          className={errors.telefono ? 'border-red-500' : ''}
                        />
                        {errors.telefono && (
                          <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Código Postal *
                        </label>
                        <Input
                          type="text"
                          name="codigo_postal"
                          value={formData.codigo_postal}
                          onChange={handleInputChange}
                          placeholder="Ej: 1425"
                          className={errors.codigo_postal ? 'border-red-500' : ''}
                        />
                        {errors.codigo_postal && (
                          <p className="text-red-500 text-sm mt-1">{errors.codigo_postal}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección de Envío {formData.metodo_entrega === 'delivery' ? '*' : '(Opcional)'}
                        </label>
                        <textarea
                          name="direccion"
                          value={formData.direccion}
                          onChange={handleInputChange}
                          placeholder={formData.metodo_entrega === 'delivery' 
                            ? "Calle, número, piso/depto, localidad" 
                            : "Dirección opcional para referencia"
                          }
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            errors.direccion ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.direccion && (
                          <p className="text-red-500 text-sm mt-1">{errors.direccion}</p>
                        )}
                      </div>

                      <div className="bg-[#D0E1F9] border border-[#4D648D] rounded-lg p-4 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-[#4D648D]" />
                          <span className="text-sm font-medium text-[#4D648D]">
                            Información Importante
                          </span>
                        </div>
                        <p className="text-sm text-[#4D648D]">
                          Como invitado, recibirás la confirmación de tu pedido en el email proporcionado. 
                          Si deseas crear una cuenta para hacer seguimiento de tus pedidos, puedes hacerlo después de completar la compra.
                        </p>
                      </div>
                    </>
                  )}

                  {isAuthenticated && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Datos para la compra
                          </span>
                        </div>
                        
                        {userProfile ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">
                                  <strong>Nombre:</strong> {userProfile.first_name} {userProfile.last_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">
                                  <strong>Email:</strong> {userProfile.email}
                                </span>
                              </div>
                              {userProfile.telefono && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-green-600" />
                                  <span className="text-green-700">
                                    <strong>Teléfono:</strong> {userProfile.telefono}
                                  </span>
                                </div>
                              )}
                              {userProfile.direccion && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <span className="text-green-700">
                                    <strong>Dirección:</strong> {userProfile.direccion}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-green-600 mt-2">
                              Esta información será utilizada para procesar tu orden.
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-green-700">
                            Cargando información del usuario...
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleNextStep}
                      className="px-6 py-2 text-white"
                      style={{ backgroundColor: '#4D648D' }}
                    >
                      Continuar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: '#D0E1F9' }}>
                    <ShoppingBag className="h-5 w-5" />
                    Resumen del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 py-4 border-b">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white p-1 border flex items-center justify-center flex-shrink-0">
                          {item.producto.imagen ? (
                            <img 
                              src={item.producto.imagen} 
                              alt={item.producto.nombre} 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.producto.nombre}</h4>
                          <p className="text-sm text-gray-500">
                            Cantidad: {item.cantidad}
                          </p>
                          <p className="text-sm font-medium" style={{ color: '#8c000f' }}>
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isAuthenticated && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Información de Envío:</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Nombre:</strong> {formData.nombre}</p>
                        <p><strong>Email:</strong> {formData.email}</p>
                        <p><strong>Teléfono:</strong> {formData.telefono}</p>
                        <p><strong>Dirección:</strong> {formData.direccion}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-6">

                    {ordenCreada?.init_point ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            Tu orden está lista para el pago
                          </p>
                          <p className="text-xs text-blue-700">
                            Serás redirigido a la pasarela segura de MercadoPago para pagar con tarjeta, débito o dinero en cuenta.
                          </p>
                        </div>

                        <Button
                          onClick={irAMercadoPago}
                          disabled={redirigiendoMP}
                          className="w-full py-4 text-base font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#009ee3' }}
                        >
                          <CreditCard className="h-5 w-5" />
                          {redirigiendoMP ? 'Redirigiendo a MercadoPago...' : 'Pagar con Mercado Pago'}
                        </Button>
                        
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            onClick={handlePreviousStep}
                            className="w-full"
                          >
                            ← Volver a Datos
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-700 font-medium">Generando orden de pago...</p>
                        <p className="text-sm text-gray-500 mt-1">Por favor espera un momento</p>
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            onClick={handlePreviousStep}
                          >
                            ← Volver
                          </Button>
                        </div>
                      </div>
                    )}
                    

                    {errors.general && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{errors.general}</p>
                        <div className="mt-3 flex justify-center">
                          <Button
                            onClick={() => {
                              setErrors({});
                              handleFinalizarCompra();
                            }}
                            className="px-4 py-2 text-white text-sm"
                            style={{ backgroundColor: '#f83258' }}
                          >
                            Reintentar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && ordenCreada && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Check className="h-6 w-6" />
                    ¡Pago Completado!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      ¡Gracias por tu compra!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Tu pago ha sido procesado exitosamente.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600">Número de Orden:</p>
                      <p className="text-xl font-bold" style={{ color: '#8c000f' }}>
                        #{ordenCreada.id || ordenCreada.orden_id}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">Total:</p>
                      <p className="text-xl font-bold" style={{ color: '#8c000f' }}>
                        {formatPrice(ordenCreada.total || total)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="w-full py-2 text-white"
                      style={{ backgroundColor: '#f83258' }}
                    >
                      Continuar Comprando
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                      className="w-full"
                    >
                      Imprimir Confirmación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>


          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#4D648D' }}>
                  Resumen
                </h3>


                {estaEnvioGratis() && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-bold text-sm">
                        ¡FELICITACIONES!
                      </span>
                    </div>
                    <p className="text-green-700 text-sm font-medium">
                      HAS DESBLOQUEADO EL ENVÍO GRATIS
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      Compras sobre $50.000 tienen envío gratuito
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">¿Tienes un código de descuento?</h4>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ingresa tu cupón" 
                      value={cuponCodigo}
                      onChange={(e) => setCuponCodigo(e.target.value)}
                      disabled={cuponAplicado || validandoCupon || step > 1}
                    />
                    <Button 
                      onClick={handleAplicarCupon}
                      disabled={!cuponCodigo.trim() || cuponAplicado || validandoCupon || step > 1}
                      style={{ backgroundColor: '#4D648D' }}
                    >
                      {validandoCupon ? '...' : cuponAplicado ? 'Aplicado' : 'Aplicar'}
                    </Button>
                  </div>
                  {cuponError && <p className="text-red-500 text-xs mt-1">{cuponError}</p>}
                  {cuponAplicado && (
                    <div className="mt-2 text-sm text-green-600 flex justify-between items-center bg-green-50 p-2 rounded">
                      <span>Cupón aplicado: {cuponAplicado.codigo}</span>
                      <button onClick={() => { setCuponAplicado(null); setCuponCodigo(''); }} disabled={step > 1} className="text-red-500 hover:text-red-700 text-xs px-2">
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Productos ({resumen.total_items}):</span>
                    <span className="font-medium">{formatPrice(resumen.total_precio)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Envío ({formData.metodo_entrega === 'delivery' ? 'Delivery' : 'Retiro en tienda'}):
                    </span>
                    <span className={`font-medium ${calcularCostoEnvio() === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {calcularCostoEnvio() === 0 ? 'Gratis' : formatPrice(calcularCostoEnvio())}
                    </span>
                  </div>
                  
                  {cuponAplicado && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({cuponAplicado.porcentaje_descuento}%):</span>
                      <span>-{formatPrice((resumen.total_precio * cuponAplicado.porcentaje_descuento) / 100)}</span>
                    </div>
                  )}
                  
                  <hr className="my-4" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span style={{ color: '#4D648D' }}>Total:</span>
                    <span style={{ color: '#4D648D' }}>
                      {formatPrice(calcularTotal())}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Delivery disponible Lunes a Viernes ($3.500)</p>
                  <p>• Retiro en tienda Lunes a Sábado (Gratis)</p>
                  <p>• Los precios incluyen IVA</p>
                  <p>• Tiempo de entrega: 2-5 días hábiles</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;