import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Grid3X3, List, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import ProductCard from '../components/ProductCard';
import API_BASE_URL from '../../config';

const TodosProductos = () => {
  const [productos, setProductos] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('nombre');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters state
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloEnStock, setSoloEnStock] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  const [filteredProductos, setFilteredProductos] = useState({});

  const fetchProductos = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (precioMin) params.append('precio_min', precioMin);
      if (precioMax) params.append('precio_max', precioMax);
      if (soloEnStock) params.append('en_stock', 'true');
      if (categoriaSeleccionada) params.append('categorias__nombre', categoriaSeleccionada);

      const response = await fetch(`${API_BASE_URL}/productos/?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
        
        
        const productosAgrupados = {};
        
        data.forEach(producto => {
          let categoriasProducto = [];
          
          
          if (producto.categorias && Array.isArray(producto.categorias)) {
            categoriasProducto = producto.categorias.map(cat => cat.nombre);
          } else if (producto.categoria) {
            categoriasProducto = [producto.categoria];
          } else {
            categoriasProducto = ['Sin Categoría'];
          }
          
          
          categoriasProducto.forEach(categoria => {
            if (!productosAgrupados[categoria]) {
              productosAgrupados[categoria] = [];
            }
            productosAgrupados[categoria].push(producto);
          });
        });
        
        
        const categoriasOrdenadas = Object.keys(productosAgrupados).sort();
        const productosOrdenados = {};
        categoriasOrdenadas.forEach(categoria => {
          productosOrdenados[categoria] = productosAgrupados[categoria];
        });
        
        setProductosPorCategoria(productosOrdenados);
        setFilteredProductos(productosOrdenados);
      } else {
        setError('Error al cargar los productos');
      }
    } catch (error) {
      setError('Error de conexión al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, [searchQuery, precioMin, precioMax, soloEnStock, categoriaSeleccionada]);

  // Handle client-side search removed as we use API search now, keeping sort and view

  // Client-side search logic removed

 
  const sortProducts = (products) => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'precio_asc':
          return a.precio - b.precio;
        case 'precio_desc':
          return b.precio - a.precio;
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'stock':
          return b.stock - a.stock;
        default:
          return 0;
      }
    });
  };

  const handleBackClick = () => {
    window.history.back();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalProductos = Object.values(filteredProductos).reduce(
    (total, productos) => total + productos.length, 0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p style={{ color: '#4D648D' }}>Cargando todos los productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: '#283655' }}>Error al cargar productos</h2>
          <p className="mb-6 text-sm sm:text-base" style={{ color: '#4D648D' }}>{error}</p>
          <Button 
            onClick={() => window.location.href = '/'} 
            className="px-6 sm:px-8 py-3 w-full sm:w-auto"
            style={{ backgroundColor: '#283655', color: '#D0E1F9' }}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      <div className="display max-w-7xl mx-auto px-4 py-8">
       
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="mb-8 flex items-center gap-2 px-4 py-2 ml-4"
          style={{ color: '#D0E1F9', backgroundColor: '#283655' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

   
        <div className="mb-8">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#283655' }}>
                Todos los Productos
              </h1>
              <p className="text-sm sm:text-base" style={{ color: '#4D648D' }}>
                {totalProductos === 0 
                  ? 'No hay productos disponibles' 
                  : `${totalProductos} ${totalProductos === 1 ? 'producto encontrado' : 'productos encontrados'}`
                }
              </p>
            </div>

            {/* Advanced Filters Panel */}
            <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtros Avanzados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Buscar</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Categoría</label>
                  <select
                    value={categoriaSeleccionada}
                    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Todas las categorías</option>
                    <option value="Star Wars™">Star Wars™</option>
                    <option value="Technic">Technic</option>
                    <option value="Harry Potter™">Harry Potter™</option>
                    <option value="Novedades">Novedades</option>
                    <option value="Ofertas">Ofertas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Rango de Precio</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={precioMin}
                      onChange={(e) => setPrecioMin(e.target.value)}
                      className="w-full"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={precioMax}
                      onChange={(e) => setPrecioMax(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soloEnStock}
                      onChange={(e) => setSoloEnStock(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Solo en stock</span>
                  </label>
                </div>
              </div>
            </div>

            
            {totalProductos > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm font-medium" style={{ color: '#4D648D' }}>Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: '#283655', color: '#283655', backgroundColor: '#D0E1F9' }}
                  >
                    <option value="nombre">Nombre A-Z</option>
                    <option value="precio_asc">Precio: Menor a Mayor</option>
                    <option value="precio_desc">Precio: Mayor a Menor</option>
                    <option value="stock">Stock Disponible</option>
                  </select>
                </div>

           
                <div className="flex justify-center">
                  <div className="flex items-center border rounded-lg" style={{ borderColor: '#283655' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-4 py-2"
                      style={{
                        backgroundColor: viewMode === 'grid' ? '#283655' : 'transparent',
                        color: viewMode === 'grid' ? '#D0E1F9' : '#283655'
                      }}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-4 py-2"
                      style={{
                        backgroundColor: viewMode === 'list' ? '#283655' : 'transparent',
                        color: viewMode === 'list' ? '#D0E1F9' : '#283655'
                      }}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      
        {totalProductos === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🛍️</div>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: '#283655' }}>
              {searchQuery ? `No se encontraron productos para "${searchQuery}"` : 'No hay productos disponibles'}
            </h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color: '#4D648D' }}>
              {searchQuery 
                ? 'Intenta con otros términos de búsqueda o explora nuestras categorías.' 
                : 'Pronto tendremos productos disponibles para ti.'
              }
            </p>
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery('')}
                className="px-8 py-3 mr-4"
                style={{ backgroundColor: '#283655', color: '#D0E1F9' }}
              >
                Limpiar Búsqueda
              </Button>
            )}
            <Button
              onClick={() => window.location.href = '/'}
              className="px-8 py-3"
              style={{ backgroundColor: '#4D648D', color: '#D0E1F9' }}
            >
              Volver al Inicio
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(filteredProductos).map(categoria => {
              const productosCategoria = sortProducts(filteredProductos[categoria]);
              
              if (productosCategoria.length === 0) return null;

              return (
                <div key={categoria} className="space-y-6">
        
                    <div className="border-b-2 pb-4" style={{ borderColor: '#283655' }}>
                      <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: '#283655' }}>
                      {categoria}
                      <span className="text-base font-normal" style={{ color: '#4D648D' }}>
                        ({productosCategoria.length} {productosCategoria.length === 1 ? 'producto' : 'productos'})
                      </span>
                    </h2>
                  </div>

           
                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                      : 'space-y-5'
                  }>
                    {productosCategoria.map((producto) => (
                      viewMode === 'grid' ? (
              
                        <div key={producto.id} className="w-full max-w-md mx-auto">
                          <ProductCard product={producto} />
                        </div>
                      ) : (
                        <Card key={producto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            <div className="flex items-center gap-4 p-4">
                              <div className="w-24 h-24 bg-white p-1 rounded-lg border flex items-center justify-center flex-shrink-0">
                                <img
                                  src={producto.imagen}
                                  alt={producto.nombre}
                                  className="w-full h-full object-contain rounded-lg cursor-pointer"
                                  onClick={() => window.location.href = `/producto/${producto.id}`}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTUwQzEyOC44NjcgMTUwIDE1MCAxMjguODY3IDE1MCAxMDBDMTUwIDcxLjEzMyAxMjguODY3IDUwIDEwMCA1MEM3MS4xMzMgNTAgNTAgNzEuMTMzIDUwIDEwMEM1MCAxMjguODY3IDcxLjEzMyAxNTAgMTAwIDE1MFoiIGZpbGw9IiNlMWU1ZTkiLz4KPC9zdmc+';
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <h3 
                                  className="font-semibold text-lg mb-1 cursor-pointer hover:underline" 
                                  style={{ color: '#1E1F26' }}
                                  onClick={() => window.location.href = `/producto/${producto.id}`}
                                >
                                  {producto.nombre}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {producto.descripcion}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xl font-bold" style={{ color: '#283655' }}>
                                    {formatPrice(producto.precio)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
                                    </span>
                                    <Button
                                      onClick={() => window.location.href = `/producto/${producto.id}`}
                                      className="px-4 py-2"
                                      style={{ backgroundColor: '#283655', color: '#D0E1F9' }}
                                    >
                                      Ver Detalles
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodosProductos;