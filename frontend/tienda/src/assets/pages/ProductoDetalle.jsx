import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Heart, ShoppingCart, ArrowLeft, Star, Plus, Minus, Flame, AlertTriangle, ShieldCheck, User, Film, Baby } from 'lucide-react';
import { useCarrito } from '../../context/CarritoContext.jsx';
import { useDeseos } from '../../context/DeseosContext.jsx';
import API_BASE_URL from '../../config';

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [oferta, setOferta] = useState(null);
  const [reseñas, setReseñas] = useState([]);
  const [nuevaReseña, setNuevaReseña] = useState({ calificacion: 5, comentario: '' });
  const [loadingReseña, setLoadingReseña] = useState(false);
  const [reseñaError, setReseñaError] = useState('');

  const { agregarProducto } = useCarrito();
  const { toggleProducto, items: deseosItems } = useDeseos();

  
  const isWishlisted = deseosItems.some(item => item.producto.id === parseInt(id));

  // Helper extraction
  const getPeliculaSaga = (prod) => {
    if (!prod) return 'Colección';
    if (prod.pelicula_saga) return prod.pelicula_saga;
    const cats = Array.isArray(prod.categorias) ? prod.categorias.map(c => typeof c === 'string' ? c : c.nombre) : [];
    const nonAge = cats.filter(c => !c.toLowerCase().includes('año') && !c.toLowerCase().includes('adulto'));
    return nonAge[0] || prod.categoria || 'Colección';
  };

  const getEdad = (prod) => {
    if (!prod) return 'Todas las edades';
    if (prod.edad && prod.edad !== 'Todas las edades') return prod.edad;
    const cats = Array.isArray(prod.categorias) ? prod.categorias.map(c => typeof c === 'string' ? c : c.nombre) : [];
    const age = cats.find(c => c.toLowerCase().includes('año') || c.toLowerCase().includes('adulto'));
    return age || 'Todas las edades';
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        
        const productResponse = await fetch(`${API_BASE_URL}/productos/${id}/`);
        if (productResponse.ok) {
          const productData = await productResponse.json();
          setProduct(productData);
          
          
          try {
            const ofertasResponse = await fetch(`${API_BASE_URL}/ofertas/`);
            if (ofertasResponse.ok) {
              const ofertasData = await ofertasResponse.json();
              const ofertaActiva = ofertasData.find(o => 
                o.producto.id === productData.id && 
                o.activo && 
                new Date(o.fecha_fin) > new Date()
              );
              if (ofertaActiva) {
                setOferta(ofertaActiva);
              }
            }
          } catch (ofertaError) {
                      }
          
          // Fetch reseñas
          try {
            const reseñasResponse = await fetch(`${API_BASE_URL}/reseñas/?producto=${productData.id}`);
            if (reseñasResponse.ok) {
              const reseñasData = await reseñasResponse.json();
              const listaReseñas = Array.isArray(reseñasData) ? reseñasData : (reseñasData.results || []);
              setReseñas(listaReseñas);
            }
          } catch (error) {
            console.error('Error loading reseñas:', error);
          }
        } else {
          navigate('/productos');
        }
      } catch (error) {
        navigate('/productos');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

 const handleAddToCart = async () => {
  setIsAddingToCart(true);
  try {
    await agregarProducto(product.id, quantity);
  } catch (error) {
    
  } finally {
    setIsAddingToCart(false);
  }
};

  const handleWishlistToggle = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }

    setIsTogglingWishlist(true);
    try {
      await toggleProducto(product.id);
    } catch (error) {
      
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleReseñaSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      setReseñaError('Debes iniciar sesión para dejar una reseña.');
      return;
    }

    setLoadingReseña(true);
    setReseñaError('');

    try {
      const response = await fetch(`${API_BASE_URL}/reseñas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          producto: product.id,
          calificacion: nuevaReseña.calificacion,
          comentario: nuevaReseña.comentario
        })
      });

      const data = await response.json();

      if (response.ok) {
        setReseñas((prev) => [data, ...(Array.isArray(prev) ? prev : [])]);
        setNuevaReseña({ calificacion: 5, comentario: '' });
      } else {
        const errorMsg = data.non_field_errors?.[0] || 
                         data.detail || 
                         (data.producto ? 'Ya has dejado una reseña para este producto.' : null) ||
                         (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Error al enviar la reseña.');
        setReseñaError(errorMsg);
      }
    } catch (error) {
      setReseñaError('Error de conexión al enviar la reseña.');
    } finally {
      setLoadingReseña(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
  <div className="text-center" style={{ color: '#283655' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <div className="text-lg">Cargando producto...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
  <div className="text-center" style={{ color: '#283655' }}>
          <div className="text-lg">Producto no encontrado</div>
          <Button 
            onClick={() => navigate('/productos')}
            className="mt-4"
            style={{ backgroundColor: '#283655', color: '#D0E1F9' }}
          >
            Volver a productos
          </Button>
        </div>
      </div>
    );
  };

  const hasStock = product.stock && product.stock > 0;
  const isActive = product.activo !== false;

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 mb-0">

        <div className="flex flex-col gap-8 bg-white rounded-lg shadow-lg p-6">
         
          <div className="relative max-w-md mx-auto w-full bg-white p-4 flex items-center justify-center rounded-lg shadow-sm border">
            <img
              src={product.imagen}
              alt={product.nombre}
              className="w-full h-80 sm:h-96 object-contain rounded-lg"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMzAwQzI1NS4yMjggMzAwIDMwMCAyNTUuMjI4IDMwMCAyMDBDMzAwIDE0NC43NzIgMjU1LjIyOCAxMDAgMjAwIDEwMEMxNDQuNzcyIDEwMCAxMDAgMTQ0Ljc3MiAxMDAgMjAwQzEwMCAyNTUuMjI4IDE0NC43NzIgMzAwIDIwMCAzMDBaIiBmaWxsPSIjZTFlNWU5Ii8+Cjwvc3ZnPgo=';
              }}
            />
            
            {oferta && (
              <div 
                className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: '#4D648D' }}
              >
                -{oferta.porcentaje_descuento}% OFF
              </div>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-4 right-4 h-10 w-10 p-0 rounded-full bg-white/90 hover:bg-white border border-red-200"
              onClick={handleWishlistToggle}
              disabled={isTogglingWishlist}
              style={{ opacity: isTogglingWishlist ? 0.6 : 1 }}
            >
              <Heart
                className="h-5 w-5"
                style={{
                  fill: isWishlisted ? '#8c000f' : 'none',
                  color: isWishlisted ? '#8c000f' : '#f83258',
                }}
              />
            </Button>
          </div>

          
          <div className="space-y-6 max-w-lg mx-auto">
            <div>
              {/* Badges Duales: Película / Saga y Rango de Edad */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                  <Film className="h-3.5 w-3.5 text-amber-600" />
                  <span>Saga: {getPeliculaSaga(product)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                  <Baby className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Edad: {getEdad(product)}</span>
                </span>
              </div>

              <h1 className="display text-2xl sm:text-3xl font-bold mb-4 text-center" style={{ color: '#283655' }}>
                {product.nombre}
              </h1>
              
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mb-6">
                {oferta ? (
                  <>
                    <span className="display text-2xl sm:text-3xl font-bold" style={{ color: '#4D648D' }}>
                      {formatPrice(oferta.precio_con_descuento)}
                    </span>
                    <span className="display text-lg sm:text-xl line-through text-gray-500">
                      {formatPrice(product.precio)}
                    </span>
                    <span className="display text-xs sm:text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: '#4D648D', color: '#D0E1F9' }}>
                      Ahorra {formatPrice(product.precio - oferta.precio_con_descuento)}
                    </span>
                  </>
                ) : (
                  <span className="display text-2xl sm:text-3xl font-bold" style={{ color: '#283655' }}>
                    {formatPrice(product.precio)}
                  </span>
                )}
              </div>

              
              {/* Indicador de Stock Dinámico */}
              <div className="mb-6 flex justify-center">
                {product.stock === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Sin stock / Agotado
                  </span>
                ) : product.stock < 5 ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
                    <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                    ¡Pocas unidades! Solo quedan {product.stock} {product.stock === 1 ? 'disponible' : 'disponibles'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    En stock ({product.stock} disponibles)
                  </span>
                )}
              </div>
            </div>

            
            <div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#283655' }}>
                Descripción
              </h3>
              <p style={{ color: '#4D648D' }}>
                {product.descripcion}
              </p>
            </div>

           
            {hasStock && isActive && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <label className="display text-sm font-medium" style={{ color: '#283655' }}>
                    Cantidad:
                  </label>
                  <div className="display flex items-center border-2 rounded-lg overflow-hidden bg-white shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-16 w-16 p-0 rounded-none hover:bg-gray-100 border-r flex items-center justify-center text-gray-600 hover:text-gray-900"
                    >
                      <Minus className="h-8 w-8" />
                    </Button>
                    <span className="px-8 py-3 min-w-[80px] text-center font-bold text-xl text-gray-800">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="h-16 w-16 p-0 rounded-none hover:bg-gray-100 border-l flex items-center justify-center text-gray-600 hover:text-gray-900"
                    >
                      <Plus className="h-8 w-8" />
                    </Button>
                  </div>
                </div>

                <div className="display flex flex-col sm:flex-row gap-4">
                  <Button
                    className="flex-1 w-full"
                    style={{ 
                      backgroundColor: '#8c000f', 
                      color: '#fff',
                      opacity: isAddingToCart ? 0.6 : 1
                    }}
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isAddingToCart ? 'Agregando...' : 'Agregar al Carrito'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleWishlistToggle}
                    disabled={isTogglingWishlist}
                    style={{
                      borderColor: '#f83258',
                      color: isWishlisted ? '#8c000f' : '#f83258',
                      opacity: isTogglingWishlist ? 0.6 : 1
                    }}
                  >
                    <Heart
                      className="h-4 w-4"
                      style={{
                        fill: isWishlisted ? '#8c000f' : 'none',
                        color: isWishlisted ? '#8c000f' : '#f83258'
                      }}
                    />
                    {isTogglingWishlist 
                      ? '...' 
                      : isWishlisted 
                        ? 'En Deseados' 
                        : 'Agregar a Deseados'
                    }
                  </Button>
                </div>
              </div>
            )}

            {(!hasStock || !isActive) && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#D0E1F9' }}>
                <p style={{ color: '#283655' }}>
                  {!isActive ? 'Producto no disponible' : 'Producto sin stock'}
                </p>
                
                {!hasStock && isActive && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={handleWishlistToggle}
                    disabled={isTogglingWishlist}
                    style={{
                      borderColor: '#f83258',
                      color: isWishlisted ? '#8c000f' : '#f83258',
                      opacity: isTogglingWishlist ? 0.6 : 1
                    }}
                  >
                    <Heart
                      className="h-4 w-4 mr-2"
                      style={{
                        fill: isWishlisted ? '#8c000f' : 'none',
                        color: isWishlisted ? '#8c000f' : '#f83258'
                      }}
                    />
                    {isTogglingWishlist 
                      ? 'Procesando...' 
                      : isWishlisted 
                        ? 'Eliminar de Deseados' 
                        : 'Agregar a Deseados'
                    }
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-4 mt-8"
          style={{ color: '#283655' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        {/* Sección de Reseñas */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold" style={{ color: '#283655' }}>Reseñas del Producto</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Reseñas 100% Anónimas & Verificadas
            </span>
          </div>
          
          <div className="mb-8 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#4D648D' }}>Dejar una reseña</h3>
            <p className="text-xs text-slate-500 mb-4">
              🔒 Tu opinión se publicará de manera anónima para proteger tu privacidad. Solo se validará que hayas adquirido el producto.
            </p>
            <form onSubmit={handleReseñaSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calificación</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNuevaReseña({...nuevaReseña, calificacion: star})}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`h-6 w-6 ${star <= nuevaReseña.calificacion ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                <textarea 
                  className="w-full border rounded-lg p-3 bg-white focus:ring-2 focus:ring-slate-400 outline-none" 
                  rows="3"
                  placeholder="¿Qué te pareció el producto? Cuéntale a otros compradores tu experiencia..."
                  value={nuevaReseña.comentario}
                  onChange={(e) => setNuevaReseña({...nuevaReseña, comentario: e.target.value})}
                  required
                ></textarea>
              </div>
              {reseñaError && <p className="text-red-500 text-sm font-medium">{reseñaError}</p>}
              <Button 
                type="submit" 
                disabled={loadingReseña}
                style={{ backgroundColor: '#283655', color: '#fff' }}
              >
                {loadingReseña ? 'Enviando...' : 'Publicar reseña anónima'}
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            {reseñas.length > 0 ? (
              reseñas.map((reseña) => (
                <div key={reseña.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">{reseña.usuario_nombre || "Comprador Anónimo"}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Comprador Verificado
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(reseña.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="flex mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`h-4 w-4 ${star <= reseña.calificacion ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{reseña.comentario}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic text-center py-6">No hay reseñas todavía. ¡Sé el primero en opinar!</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}