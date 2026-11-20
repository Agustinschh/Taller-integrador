import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Grid3X3, List, Search, Star, Sparkles, Film, Baby, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import ProductCard from '../components/ProductCard';
import API_BASE_URL from '../../config';

const SAGAS_POPULARES = [
  { id: 'Star Wars', label: 'Star Wars™' },
  { id: 'Harry Potter', label: 'Harry Potter™' },
  { id: 'Marvel', label: 'Marvel Super Heroes' },
  { id: 'DC / Batman', label: 'DC Comics / Batman' },
  { id: 'Super Mario', label: 'Super Mario™' },
  { id: 'Jurassic World', label: 'Jurassic World' },
  { id: 'Disney', label: 'Disney / Pixar' },
  { id: 'El Señor de los Anillos', label: 'El Señor de los Anillos' },
  { id: 'Minecraft', label: 'Minecraft' },
  { id: 'Ninjago', label: 'Ninjago' },
  { id: 'Technic', label: 'Technic' },
  { id: 'Speed Champions', label: 'Speed Champions' },
  { id: 'City', label: 'City / Urban' },
  { id: 'Friends', label: 'Friends' },
  { id: 'Pokémon', label: 'Pokémon' },
  { id: 'Fortnite', label: 'Fortnite' },
];

const EDADES_POPULARES = [
  { id: '0 - 3 años', label: '0 - 3 años (Primeros Pasos / Duplo)' },
  { id: '4 - 6 años', label: '4 - 6 años (Constructores Junior)' },
  { id: '7 - 11 años', label: '7 - 11 años (Aventura & Acción)' },
  { id: '12 - 17 años', label: '12 - 17 años (Técnico & Desafío)' },
  { id: '18+ Adultos', label: '18+ Adultos (Coleccionistas & Master)' },
];

const TodosProductos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productos, setProductos] = useState([]);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('nombre');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Advanced filters state
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloEnStock, setSoloEnStock] = useState(false);
  const [soloDestacados, setSoloDestacados] = useState(searchParams.get('destacados') === 'true');
  const [sagaFiltro, setSagaFiltro] = useState(searchParams.get('saga') || searchParams.get('pelicula') || '');
  const [edadFiltro, setEdadFiltro] = useState(searchParams.get('edad') || '');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(searchParams.get('categoria') || '');

  const [filteredProductos, setFilteredProductos] = useState({});

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSoloDestacados(searchParams.get('destacados') === 'true');
    setSagaFiltro(searchParams.get('saga') || searchParams.get('pelicula') || '');
    setEdadFiltro(searchParams.get('edad') || '');
    setCategoriaSeleccionada(searchParams.get('categoria') || '');
  }, [searchParams]);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (precioMin) params.append('precio_min', precioMin);
      if (precioMax) params.append('precio_max', precioMax);
      if (soloEnStock) params.append('en_stock', 'true');
      if (soloDestacados) params.append('destacado', 'true');
      if (sagaFiltro) params.append('saga', sagaFiltro);
      if (edadFiltro) params.append('edad', edadFiltro);
      if (categoriaSeleccionada) params.append('categorias__nombre', categoriaSeleccionada);

      const response = await fetch(`${API_BASE_URL}/productos/?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
        
        const productosAgrupados = {};
        
        data.forEach(producto => {
          let categoriasProducto = [];
          
          if (producto.categorias && Array.isArray(producto.categorias)) {
            // Filtrar solo categorías temáticas para no duplicar por edad en la agrupación
            const nonAge = producto.categorias
              .map(cat => typeof cat === 'string' ? cat : cat.nombre)
              .filter(catName => !catName.toLowerCase().includes('año') && !catName.toLowerCase().includes('adulto'));
            
            categoriasProducto = nonAge.length > 0 ? nonAge : [producto.categoria || 'Colección General'];
          } else if (producto.categoria) {
            categoriasProducto = [producto.categoria];
          } else {
            categoriasProducto = ['Colección General'];
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
  }, [searchQuery, precioMin, precioMax, soloEnStock, soloDestacados, sagaFiltro, edadFiltro, categoriaSeleccionada]);

  const sortProducts = (products) => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'precio_asc':
          return Number(a.precio) - Number(b.precio);
        case 'precio_desc':
          return Number(b.precio) - Number(a.precio);
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'stock':
          return Number(b.stock) - Number(a.stock);
        default:
          return 0;
      }
    });
  };

  const handleBackClick = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const limpiarFiltros = () => {
    setSearchQuery('');
    setPrecioMin('');
    setPrecioMax('');
    setSoloEnStock(false);
    setSoloDestacados(false);
    setSagaFiltro('');
    setEdadFiltro('');
    setCategoriaSeleccionada('');
    setSearchParams({});
  };

  const hayFiltrosActivos = Boolean(
    searchQuery || precioMin || precioMax || soloEnStock || soloDestacados || sagaFiltro || edadFiltro || categoriaSeleccionada
  );

  const totalProductos = Object.values(filteredProductos).reduce(
    (total, productos) => total + productos.length, 0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p style={{ color: '#4D648D' }}>Cargando catálogo de productos...</p>
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
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Botón Volver */}
        <div>
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </div>

        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Catálogo Completo
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {totalProductos === 0 
                ? 'No hay productos disponibles' 
                : `${totalProductos} ${totalProductos === 1 ? 'producto encontrado' : 'productos encontrados'}`
              }
            </p>
          </div>

          {hayFiltrosActivos && (
            <Button
              variant="outline"
              size="sm"
              onClick={limpiarFiltros}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-xl flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpiar Todos los Filtros</span>
            </Button>
          )}
        </div>

        {/* Panel de Filtros Avanzados */}
        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span>Filtros de Búsqueda</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Buscador de texto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Buscar por Nombre
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Ej: Halcón, Hogwarts, Mario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* FILTRO: Película o Saga */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Film className="h-3.5 w-3.5 text-amber-600" />
                  <span>Película o Saga</span>
                </label>
                <select
                  value={sagaFiltro}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSagaFiltro(val);
                    if (val) searchParams.set('saga', val);
                    else searchParams.delete('saga');
                    setSearchParams(searchParams);
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">Todas las Películas & Sagas</option>
                  {SAGAS_POPULARES.map((s) => (
                    <option key={s.id} value={s.id}>
                      🎬 {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO: Rango de Edad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Baby className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Rango de Edad</span>
                </label>
                <select
                  value={edadFiltro}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEdadFiltro(val);
                    if (val) searchParams.set('edad', val);
                    else searchParams.delete('edad');
                    setSearchParams(searchParams);
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Todas las Edades</option>
                  {EDADES_POPULARES.map((e) => (
                    <option key={e.id} value={e.id}>
                      👶 {e.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de Precio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Rango de Precio ($)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Mín"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Checkboxes y Filtros Rápidos */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={soloEnStock}
                  onChange={(e) => setSoloEnStock(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">Solo en stock</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl border border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={soloDestacados}
                  onChange={(e) => {
                    setSoloDestacados(e.target.checked);
                    if (e.target.checked) {
                      searchParams.set('destacados', 'true');
                    } else {
                      searchParams.delete('destacados');
                    }
                    setSearchParams(searchParams);
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  Solo Destacados
                </span>
              </label>
            </div>

            {/* Chips de Filtros Activos */}
            {hayFiltrosActivos && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros Activos:</span>
                {sagaFiltro && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    🎬 Saga: {sagaFiltro}
                    <button onClick={() => { setSagaFiltro(''); searchParams.delete('saga'); setSearchParams(searchParams); }}>
                      <X className="h-3.5 w-3.5 hover:text-amber-700" />
                    </button>
                  </span>
                )}
                {edadFiltro && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                    👶 Edad: {edadFiltro}
                    <button onClick={() => { setEdadFiltro(''); searchParams.delete('edad'); setSearchParams(searchParams); }}>
                      <X className="h-3.5 w-3.5 hover:text-indigo-700" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    🔍 "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}>
                      <X className="h-3.5 w-3.5 hover:text-blue-700" />
                    </button>
                  </span>
                )}
                {soloDestacados && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ⭐ Solo Destacados
                    <button onClick={() => { setSoloDestacados(false); searchParams.delete('destacados'); setSearchParams(searchParams); }}>
                      <X className="h-3.5 w-3.5 hover:text-amber-700" />
                    </button>
                  </span>
                )}
                {soloEnStock && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ✓ En Stock
                    <button onClick={() => setSoloEnStock(false)}>
                      <X className="h-3.5 w-3.5 hover:text-emerald-700" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barra de Ordenamiento y Cambio de Vista */}
        {totalProductos > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nombre">Nombre A-Z</option>
                <option value="precio_asc">Precio: Menor a Mayor</option>
                <option value="precio_desc">Precio: Mayor a Menor</option>
                <option value="stock">Stock Disponible</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        )}

        {/* Listado de Productos */}
        {totalProductos === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              No hay artículos que coincidan con la saga, rango de edad o filtros seleccionados.
            </p>
            {hayFiltrosActivos && (
              <Button
                onClick={limpiarFiltros}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm"
              >
                Limpiar Filtros y Ver Todo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(filteredProductos).map(categoria => {
              const productosCategoria = sortProducts(filteredProductos[categoria]);
              if (productosCategoria.length === 0) return null;

              return (
                <div key={categoria} className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                      <span>{categoria}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {productosCategoria.length} {productosCategoria.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </h2>
                  </div>

                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                      : 'space-y-4'
                  }>
                    {productosCategoria.map((producto) => (
                      viewMode === 'grid' ? (
                        <div key={producto.id} className="w-full max-w-md mx-auto">
                          <ProductCard product={producto} />
                        </div>
                      ) : (
                        <Card key={producto.id} className="overflow-hidden hover:shadow-md transition-shadow border-slate-100 rounded-2xl bg-white">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              <div className="w-28 h-28 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0">
                                <img
                                  src={producto.imagen || "/placeholder-product.jpg"}
                                  alt={producto.nombre}
                                  className="w-full h-full object-contain cursor-pointer"
                                  onClick={() => window.location.href = `/producto/${producto.id}`}
                                  onError={(e) => {
                                    e.target.src = "/placeholder-product.jpg";
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0 text-center sm:text-left">
                                {/* Badges Duales en Vista Lista */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                                    <Film className="h-3 w-3 text-amber-600" />
                                    <span>{producto.pelicula_saga || 'Colección'}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Baby className="h-3 w-3 text-indigo-500" />
                                    <span>{producto.edad || 'Todas las edades'}</span>
                                  </span>
                                </div>

                                <h3 
                                  className="font-bold text-base text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate" 
                                  onClick={() => window.location.href = `/producto/${producto.id}`}
                                >
                                  {producto.nombre}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                  {producto.descripcion || 'Sin descripción'}
                                </p>
                              </div>

                              <div className="flex flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
                                <div className="text-right">
                                  <span className="text-lg font-extrabold text-slate-900">
                                    {formatPrice(producto.precio_oferta || producto.precio)}
                                  </span>
                                </div>
                                <Button
                                  onClick={() => window.location.href = `/producto/${producto.id}`}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs"
                                >
                                  Ver Detalles
                                </Button>
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