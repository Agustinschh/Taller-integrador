import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Sparkles, ShoppingBag, Check, ShieldCheck, Tag, Zap, Filter, Search, Grid3X3, List } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useCarrito } from '../../context/CarritoContext';
import API_BASE_URL from '../../config';

const Combos = () => {
  const [products, setProducts] = useState([]);
  const [apiCombos, setApiCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('todos');
  const [sortBy, setSortBy] = useState('ahorro_desc');
  const [viewMode, setViewMode] = useState('grid');
  const [addingComboId, setAddingComboId] = useState(null);
  const [addedSuccessId, setAddedSuccessId] = useState(null);

  const { agregarProducto } = useCarrito();

  useEffect(() => {
    const fetchCombosAndProducts = async () => {
      setLoading(true);
      try {
        const [prodsRes, combosRes] = await Promise.all([
          fetch(`${API_BASE_URL}/productos/`),
          fetch(`${API_BASE_URL}/ofertas/combos/`).catch(() => null)
        ]);
        if (prodsRes && prodsRes.ok) {
          const data = await prodsRes.json();
          setProducts(Array.isArray(data) ? data : []);
        }
        if (combosRes && combosRes.ok) {
          const combosData = await combosRes.json();
          setApiCombos(Array.isArray(combosData) ? combosData : []);
        }
      } catch (error) {
        console.error('Error fetching products/combos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCombosAndProducts();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Generate curated dynamic combo bundles from the catalog
  const generateCombos = () => {
    if (!products.length) return [];

    const getProd = (id) => products.find(p => p.id === id);
    const getProdsByCategory = (catName) => 
      products.filter(p => p.categorias?.some(c => c.nombre?.toLowerCase().includes(catName.toLowerCase())));

    const comboTemplates = [
      {
        id: 'combo-hogwarts-castle',
        nombre: 'Mega Pack Castillo de Hogwarts & Criaturas Mágicas',
        tema: 'harry-potter',
        badge: 'Pack Castillo',
        badgeColor: '#740001',
        descuentoPorcentaje: 25,
        descripcion: 'Vive la magia completa de Hogwarts con el gran castillo y sus sets complementarios exclusivos.',
        itemIds: [11, 265, 46], // Castillo de Hogwarts, Hogwarts Crest and Dobby Collector's Set, Thestral Family
        destacado: true
      },
      {
        id: 'combo-star-wars-battle',
        nombre: 'Super Combo Galáctico: Star Wars Collector Pack',
        tema: 'star-wars',
        badge: 'Más Vendido',
        badgeColor: '#006CB7',
        descuentoPorcentaje: 20,
        descripcion: 'El escuadrón definitivo: incluye droides coleccionables, speeder bike y pack de batalla de Mandalore.',
        itemIds: [197, 36, 212], // R2-D2/C-3PO, Speeder Bike, Siege of Mandalore Battle Pack
        destacado: true
      },
      {
        id: 'combo-technic-master',
        nombre: 'Dúo de Ingeniería: Technic Power & Motors Pack',
        tema: 'technic',
        badge: 'Para Expertos',
        badgeColor: '#D97706',
        descuentoPorcentaje: 22,
        descripcion: 'Combina sets de mecanismos motorizados y energía renovable para proyectos de alto nivel.',
        itemIds: [329, 323, 60], // Motorized Mechanisms Set, Renewable Energy, E-Motor
        destacado: false
      },
      {
        id: 'combo-ninjago-warrior',
        nombre: 'Pack Maestro Ninja: Spinjitzu & Mini Packs',
        tema: 'ninjago',
        badge: 'Edición Especial',
        badgeColor: '#DC2626',
        descuentoPorcentaje: 30,
        descripcion: 'Domina el arte del Spinjitzu con este super pack de combate y minifiguras Ninjago.',
        itemIds: [41, 44, 50], // Spinjitzu Master, Zane 5 Pack, Cole 5 Pack
        destacado: false
      },
      {
        id: 'combo-speed-racers',
        nombre: 'Combo Pista Extrema: Aston Martin & Dodge Charger',
        tema: 'vehiculos',
        badge: 'Velocidad Pura',
        badgeColor: '#2563EB',
        descuentoPorcentaje: 18,
        descripcion: 'Dos íconos del automovilismo deportivo listos para la pista en un combo a precio insuperable.',
        itemIds: [32, 34], // Aston Martin F1, Dodge Charger Fast & Furious
        destacado: false
      },
      {
        id: 'combo-collectors-series',
        nombre: 'Bóveda de Coleccionista: Complete Series & Stars',
        tema: 'coleccion',
        badge: 'Exclusivo VIP',
        badgeColor: '#7C3AED',
        descuentoPorcentaje: 28,
        descripcion: 'Packs completos de minifiguras y sets de edición limitada para auténticos coleccionistas.',
        itemIds: [97, 113, 24], // Series 29 Complete, CR7 Collectors Set, CR7
        destacado: true
      }
    ];

    // Build combo objects with real product details
    const builtCombos = comboTemplates.map(template => {
      let items = template.itemIds.map(id => getProd(id)).filter(Boolean);
      
      // Fallback if specific products not found
      if (items.length < 2) {
        const matchingProds = getProdsByCategory(template.tema);
        items = matchingProds.slice(0, 3);
      }

      if (items.length === 0) return null;

      const precioOriginalTotal = items.reduce((acc, item) => acc + Number(item.precio || 0), 0);
      const precioCombo = Math.round(precioOriginalTotal * (1 - template.descuentoPorcentaje / 100));
      const ahorroTotal = precioOriginalTotal - precioCombo;

      const stockIndividuales = items.map(item => Number(item.stock || 0));
      const comboStockCalculado = stockIndividuales.length ? Math.min(...stockIndividuales) : 0;
      const stockFinal = template.stock !== undefined ? template.stock : comboStockCalculado;

      return {
        ...template,
        items,
        imagenPrincipal: items[0]?.imagen || '/secreto_lego.jpg',
        precioOriginalTotal,
        precioCombo,
        ahorroTotal,
        stock: stockFinal,
        stockDisponible: stockFinal > 0
      };
    }).filter(Boolean);

    // Also identify any natural standalone pack/set products in the database
    const standalonePacks = products
      .filter(p => p.nombre && /pack|bundle|collectors set|complete/i.test(p.nombre) && !comboTemplates.some(t => t.itemIds.includes(p.id)))
      .slice(0, 8)
      .map(prod => ({
        id: `pack-${prod.id}`,
        nombre: prod.nombre,
        tema: prod.categorias?.[0]?.nombre?.toLowerCase() || 'general',
        badge: 'Pack Individual',
        badgeColor: '#059669',
        descuentoPorcentaje: prod.porcentaje_descuento || 15,
        descripcion: prod.descripcion || 'Set especial en formato pack con piezas exclusivas.',
        items: [prod],
        imagenPrincipal: prod.imagen,
        precioOriginalTotal: prod.precio_original || Math.round(prod.precio * 1.15),
        precioCombo: prod.precio,
        ahorroTotal: (prod.precio_original || Math.round(prod.precio * 1.15)) - prod.precio,
        stockDisponible: (prod.stock || 0) > 0,
        destacado: false
      }));

    // Also map real database combos created by admin
    const dbCombosFormatted = apiCombos.map(combo => {
      const items = (combo.items || []).map(it => it.producto || getProd(it.producto_id)).filter(Boolean);
      const precioOriginalTotal = Number(combo.precio_original_total) || items.reduce((acc, item) => acc + Number(item.precio || 0), 0);
      const precioCombo = Number(combo.precio);
      const ahorroTotal = Math.max(0, precioOriginalTotal - precioCombo);
      const descuentoPorcentaje = combo.porcentaje_ahorro || (precioOriginalTotal > 0 ? Math.round((ahorroTotal / precioOriginalTotal) * 100) : 0);

      return {
        id: `db-combo-${combo.id}`,
        dbId: combo.id,
        nombre: combo.nombre,
        tema: combo.tema?.toLowerCase().replace(/\s+/g, '-') || 'especial',
        badge: combo.destacado ? '⭐ Destacado' : (combo.tema || 'Combo Especial'),
        badgeColor: combo.destacado ? '#D97706' : '#7C3AED',
        descuentoPorcentaje,
        descripcion: combo.descripcion || 'Pack temático exclusivo armado por la tienda.',
        items,
        imagenPrincipal: combo.imagen || items[0]?.imagen || '/secreto_lego.jpg',
        precioOriginalTotal,
        precioCombo,
        ahorroTotal,
        stock: combo.stock,
        stockDisponible: Number(combo.stock) > 0,
        destacado: combo.destacado
      };
    });

    return dbCombosFormatted.length > 0 
      ? [...dbCombosFormatted, ...standalonePacks] 
      : [...builtCombos, ...standalonePacks];
  };

  const allCombos = generateCombos();

  // Filter combos
  const filteredCombos = allCombos.filter(combo => {
    const matchesSearch = 
      combo.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      combo.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      combo.items.some(item => item.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTheme = selectedTheme === 'todos' || combo.tema === selectedTheme;

    return matchesSearch && matchesTheme;
  });

  // Sort combos
  const sortedCombos = [...filteredCombos].sort((a, b) => {
    switch (sortBy) {
      case 'ahorro_desc':
        return b.ahorroTotal - a.ahorroTotal;
      case 'precio_asc':
        return a.precioCombo - b.precioCombo;
      case 'precio_desc':
        return b.precioCombo - a.precioCombo;
      case 'descuento_desc':
        return b.descuentoPorcentaje - a.descuentoPorcentaje;
      case 'nombre':
        return a.nombre.localeCompare(b.nombre);
      default:
        return 0;
    }
  });

  // Handle adding combo to cart
  const handleAddComboToCart = async (combo) => {
    setAddingComboId(combo.id);
    try {
      // Add each item of the combo
      for (const item of combo.items) {
        await agregarProducto(item.id, 1);
      }
      setAddedSuccessId(combo.id);
      setTimeout(() => {
        setAddedSuccessId(null);
      }, 3000);
    } catch (err) {
      console.error('Error adding combo to cart:', err);
    } finally {
      setAddingComboId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Banner de Combos */}
      <div 
        className="relative overflow-hidden text-white py-12 px-4 sm:px-6 lg:px-8 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #0284C7 100%)'
        }}
      >
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6 inline-flex items-center gap-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400 text-black font-extrabold text-xs tracking-wide shadow-md">
                <Sparkles className="h-4 w-4" />
                <span>COMBOS & PACKS ESPECIALES</span>
                <span className="opacity-75">• HASTA 30% OFF</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                Combina tus Sets Favoritos y <span className="text-yellow-400">Ahorra Más</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Descubre nuestros packs temáticos prediseñados: lleva el set principal junto a sus expansiones y minifiguras con descuentos automáticos.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 justify-center md:justify-start text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>100% Original LEGO®</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>Descuento Directo al Carrito</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Package className="h-4 w-4 text-blue-400" />
                  <span>Envío Gratis sobre $50.000</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="relative p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <img 
                  src="/secreto_lego.jpg" 
                  alt="Combos Lego" 
                  className="w-full h-48 object-cover rounded-xl shadow-inner"
                  onError={(e) => {
                    e.target.src = '/descuentos_lego.jpg';
                  }}
                />
                <div className="mt-3 text-center">
                  <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Pack Castillo & Sagas</span>
                  <p className="text-sm font-semibold text-white">Lleva 2 o más sets con mega descuento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls Bar: Themes, Search, Sort */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-8">
          
          {/* Themes Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-slate-100 no-scrollbar">
            {[
              { id: 'todos', label: 'Todos los Combos' },
              { id: 'harry-potter', label: '🏰 Hogwarts & Castillos' },
              { id: 'star-wars', label: '🚀 Star Wars™' },
              { id: 'technic', label: '⚙️ Technic & Ingeniería' },
              { id: 'ninjago', label: '⚔️ Ninjago' },
              { id: 'vehiculos', label: '🏎️ Autos & Velocidad' },
              { id: 'coleccion', label: '💎 Coleccionistas VIP' }
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por set, temática o combo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white text-sm"
              />
            </div>

            {/* Sort Dropdown & View Mode */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ahorro_desc">Mayor Ahorro ($)</option>
                  <option value="descuento_desc">Mayor % Descuento</option>
                  <option value="precio_asc">Precio: Menor a Mayor</option>
                  <option value="precio_desc">Precio: Mayor a Menor</option>
                  <option value="nombre">Nombre A-Z</option>
                </select>
              </div>

              <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Vista cuadrícula"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Vista lista"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Combos Grid / List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Cargando combos especiales...</p>
          </div>
        ) : sortedCombos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No se encontraron combos</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              No hay combos que coincidan con tus criterios de búsqueda. Intenta con otra temática o término.
            </p>
            <Button
              onClick={() => { setSearchQuery(''); setSelectedTheme('todos'); }}
              className="bg-slate-900 text-white font-bold rounded-xl px-6 py-2.5"
            >
              Restablecer Filtros
            </Button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-6"
          }>
            {sortedCombos.map((combo) => {
              const isAdding = addingComboId === combo.id;
              const isAdded = addedSuccessId === combo.id;

              return (
                <Card 
                  key={combo.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  {/* Card Top: Badges */}
                  <div className="p-5 pb-3 flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-2">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
                        style={{ backgroundColor: combo.badgeColor || '#0284C7' }}
                      >
                        {combo.badge}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        -{combo.descuentoPorcentaje}% OFF
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {combo.items.length} {combo.items.length === 1 ? 'Set' : 'Sets incluidos'}
                    </span>
                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Combo Title & Desc */}
                      <h3 className="font-extrabold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                        {combo.nombre}
                      </h3>
                      <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                        {combo.descripcion}
                      </p>

                      {/* Included Items Carousel/List */}
                      <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Incluye en este pack:
                        </span>
                        
                        <div className="space-y-2">
                          {combo.items.map((item, idx) => (
                            <div 
                              key={item.id || idx}
                              className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
                              onClick={() => window.location.href = `/producto/${item.id}`}
                            >
                              <div className="w-12 h-12 bg-slate-50 p-1 rounded-md border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <img 
                                  src={item.imagen} 
                                  alt={item.nombre} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBmaWxsPSIjZTFlNWU5Ii8+Cjwvc3ZnPgo=';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate hover:underline">
                                  {item.nombre}
                                </p>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Precio individual: {formatPrice(item.precio)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <span className="text-xs text-slate-400 line-through font-semibold block">
                            {formatPrice(combo.precioOriginalTotal)}
                          </span>
                          <span className="text-2xl font-black text-slate-900 tracking-tight">
                            {formatPrice(combo.precioCombo)}
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            Ahorras {formatPrice(combo.ahorroTotal)}
                          </span>
                          {/* Badge de Stock del Combo */}
                          {!combo.stockDisponible || combo.stock === 0 ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              Combo Agotado
                            </span>
                          ) : combo.stock < 5 ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                              🔥 ¡Pocas unidades! ({combo.stock})
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500">
                              {combo.stock} combos disponibles
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleAddComboToCart(combo)}
                        disabled={isAdding || !combo.stockDisponible || combo.stock === 0}
                        className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-300 ${
                          !combo.stockDisponible || combo.stock === 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : isAdded 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 hover:shadow-lg'
                        }`}
                      >
                        {isAdding ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                            <span>Añadiendo combo...</span>
                          </>
                        ) : !combo.stockDisponible || combo.stock === 0 ? (
                          <span>Combo sin stock disponible</span>
                        ) : isAdded ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>¡Combo añadido al carrito!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" />
                            <span>Comprar Combo</span>
                          </>
                        )}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Combos;
