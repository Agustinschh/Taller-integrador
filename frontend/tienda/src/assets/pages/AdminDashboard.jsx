import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Star, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  Upload, 
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Eye,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('todos'); // todos, activos, inactivos, sin_stock, destacados

  // Modal de Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notification, setNotification] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: 0,
    activo: true,
    destacado: false,
    categoria_ids: [],
    imagen: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Verificar si el usuario es Administrador
  useEffect(() => {
    const verificarPermisos = async () => {
      setAuthChecking(true);
      try {
        const perfil = await adminService.obtenerPerfil();
        if (perfil && (perfil.is_staff || perfil.is_superuser)) {
          setIsAdmin(true);
          cargarDatosIniciales();
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setAuthChecking(false);
      }
    };

    verificarPermisos();
  }, []);

  // 2. Cargar productos y categorías
  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        adminService.obtenerProductosAdmin(),
        adminService.obtenerCategorias()
      ]);
      setProductos(Array.isArray(prodsData) ? prodsData : []);
      setCategorias(Array.isArray(catsData) ? catsData : []);
    } catch (error) {
      mostrarNotificacion('Error al cargar datos del panel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotification({ mensaje, tipo });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 3. Abrir Modal de Creación
  const handleAbrirCrear = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: 0,
      activo: true,
      destacado: false,
      categoria_ids: [],
      imagen: null
    });
    setImagePreview(null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  // 4. Abrir Modal de Edición
  const handleAbrirEditar = (prod) => {
    setModalMode('edit');
    setEditingId(prod.id);
    
    // Obtener IDs de categorías asignadas
    const catIds = prod.categorias ? prod.categorias.map(c => c.id) : [];
    
    setFormData({
      nombre: prod.nombre || '',
      descripcion: prod.descripcion || '',
      precio: prod.precio || '',
      stock: prod.stock || 0,
      activo: prod.activo !== undefined ? prod.activo : true,
      destacado: prod.destacado || false,
      categoria_ids: catIds,
      imagen: null
    });
    setImagePreview(prod.imagen || null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  // Manejadores de cambios en formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoriaToggle = (catId) => {
    setFormData(prev => {
      const exists = prev.categoria_ids.includes(catId);
      const updated = exists 
        ? prev.categoria_ids.filter(id => id !== catId)
        : [...prev.categoria_ids, catId];
      return { ...prev, categoria_ids: updated };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('La imagen no puede superar los 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, imagen: file }));
      setImagePreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const handleQuitarImagen = () => {
    setFormData(prev => ({ ...prev, imagen: null }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 5. Guardar Producto (Crear o Editar)
  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nombre.trim()) {
      setFormError('El nombre del producto es obligatorio');
      return;
    }
    if (!formData.precio || Number(formData.precio) <= 0) {
      setFormError('Ingresa un precio válido mayor a 0');
      return;
    }

    setSaving(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append('nombre', formData.nombre.trim());
      dataToSend.append('descripcion', formData.descripcion.trim());
      dataToSend.append('precio', formData.precio);
      dataToSend.append('stock', formData.stock);
      dataToSend.append('activo', formData.activo);
      dataToSend.append('destacado', formData.destacado);

      // Categorías
      formData.categoria_ids.forEach(id => {
        dataToSend.append('categoria_ids', id);
      });

      // Imagen
      if (formData.imagen instanceof File) {
        dataToSend.append('imagen', formData.imagen);
      }

      if (modalMode === 'create') {
        const nuevo = await adminService.crearProducto(dataToSend);
        setProductos(prev => [nuevo, ...prev]);
        mostrarNotificacion('¡Producto creado con éxito!');
      } else {
        const actualizado = await adminService.actualizarProducto(editingId, dataToSend);
        setProductos(prev => prev.map(p => p.id === editingId ? actualizado : p));
        mostrarNotificacion('¡Producto actualizado correctamente!');
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Ocurrió un error al guardar el producto. Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  // 6. Eliminar Producto
  const handleConfirmarEliminar = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await adminService.eliminarProducto(productToDelete.id);
      setProductos(prev => prev.filter(p => p.id !== productToDelete.id));
      mostrarNotificacion('Producto eliminado del sistema');
      setDeleteModalOpen(false);
    } catch (err) {
      mostrarNotificacion('No se pudo eliminar el producto', 'error');
    } finally {
      setDeleting(false);
      setProductToDelete(null);
    }
  };

  // Formateador de precios
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  // Filtrado dinámico de productos
  const productosFiltrados = productos.filter(prod => {
    const matchSearch = prod.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.descripcion && prod.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchCat = true;
    if (selectedCategoria) {
      matchCat = prod.categorias && prod.categorias.some(c => c.id.toString() === selectedCategoria.toString());
    }

    let matchStatus = true;
    if (selectedStatus === 'activos') matchStatus = prod.activo === true;
    if (selectedStatus === 'inactivos') matchStatus = prod.activo === false;
    if (selectedStatus === 'sin_stock') matchStatus = Number(prod.stock) === 0;
    if (selectedStatus === 'destacados') matchStatus = prod.destacado === true;

    return matchSearch && matchCat && matchStatus;
  });

  // Métricas
  const totalProds = productos.length;
  const totalActivos = productos.filter(p => p.activo).length;
  const totalSinStock = productos.filter(p => Number(p.stock) === 0).length;
  const totalDestacados = productos.filter(p => p.destacado).length;

  // Estado de carga o sin permisos
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Verificando credenciales de administrador...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 shadow-lg border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600 mb-6">
            Esta sección es exclusiva para usuarios con privilegios de Administrador.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full bg-[#4D648D] hover:bg-[#283655] text-white"
            >
              Iniciar Sesión como Admin
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Volver a la Tienda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Notificación Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-white flex items-center gap-3 transition-all ${
          notification.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {notification.tipo === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          <span className="font-medium text-sm">{notification.mensaje}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Encabezado del Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Layers className="h-4 w-4" />
              <span>Panel de Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Administración de Productos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Crea, actualiza atributos, gestiona stock y visibilidad de tu catálogo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={cargarDatosIniciales}
              disabled={loading}
              className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            <Button
              onClick={handleAbrirCrear}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              <Plus className="h-5 w-5" />
              <span>Nuevo Producto</span>
            </Button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Catálogo</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalProds}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Activos en Tienda</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalActivos}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Agotados (Stock 0)</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{totalSinStock}</h3>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Destacados</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalDestacados}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Buscador */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o palabra clave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro de Categoría */}
              <div className="w-full md:w-56">
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las Categorías</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Estado */}
              <div className="w-full md:w-48">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="activos">Solo Activos</option>
                  <option value="inactivos">Solo Inactivos</option>
                  <option value="sin_stock">Sin Stock</option>
                  <option value="destacados">Destacados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Productos */}
        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Categorías</th>
                  <th className="py-3.5 px-4">Precio</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                      Cargando productos...
                    </td>
                  </tr>
                ) : productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-semibold text-slate-700">No se encontraron productos</p>
                      <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda o agrega un nuevo producto.</p>
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Imagen & Nombre */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {prod.imagen ? (
                              <img 
                                src={prod.imagen} 
                                alt={prod.nombre} 
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate max-w-xs">{prod.nombre}</p>
                              {prod.destacado && (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" title="Producto Destacado" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                              {prod.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categorías */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {prod.categorias && prod.categorias.length > 0 ? (
                            prod.categorias.map(cat => (
                              <span 
                                key={cat.id} 
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                              >
                                {cat.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin categoría</span>
                          )}
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {formatPrice(prod.precio)}
                        </span>
                        {prod.precio_oferta && (
                          <span className="block text-xs text-red-600 font-medium">
                            Oferta: {formatPrice(prod.precio_oferta)}
                          </span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {Number(prod.stock) === 0 ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 font-semibold">
                            Agotado (0)
                          </Badge>
                        ) : Number(prod.stock) <= 5 ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold">
                            Bajo stock ({prod.stock})
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold">
                            {prod.stock} unidades
                          </Badge>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {prod.activo ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/producto/${prod.id}`, '_blank')}
                            title="Ver en la tienda"
                            className="text-slate-500 hover:text-slate-800 p-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEditar(prod)}
                            title="Editar producto"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProductToDelete(prod);
                              setDeleteModalOpen(true);
                            }}
                            title="Eliminar producto"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal de Crear / Editar Producto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Agregar Nuevo Producto' : 'Editar Producto'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMode === 'create' ? 'Ingresa los atributos para publicarlo en la tienda' : `Modificando producto #${editingId}`}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarProducto} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre del Producto *
                </label>
                <Input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Set de Bloques Lego Star Wars X-Wing"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  className="rounded-xl border-slate-200 focus:ring-blue-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descripción Detallada
                </label>
                <textarea
                  name="descripcion"
                  rows={3}
                  placeholder="Escribe detalles del producto, dimensiones, especificaciones..."
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Precio y Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Precio ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      name="precio"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 29990"
                      value={formData.precio}
                      onChange={handleInputChange}
                      required
                      className="pl-9 rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Stock Disponible *
                  </label>
                  <Input
                    type="number"
                    name="stock"
                    min="0"
                    placeholder="Ej: 25"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Categorías */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categorías Asignadas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {categorias.map(cat => {
                    const isChecked = formData.categoria_ids.includes(cat.id);
                    return (
                      <label 
                        key={cat.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-medium transition-all ${
                          isChecked ? 'bg-blue-100/80 text-blue-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCategoriaToggle(cat.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{cat.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Imagen del Producto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Imagen del Producto
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50/30">
                  {imagePreview ? (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={handleQuitarImagen}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                        title="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-[10px] mt-1">Sin imagen</span>
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
                    >
                      <Upload className="h-4 w-4 text-blue-600" />
                      {imagePreview ? 'Cambiar archivo de imagen' : 'Subir archivo de imagen'}
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1.5">Formatos JPG, PNG o WEBP (máximo 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Switches: Activo y Destacado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Producto Activo</span>
                    <span className="text-[11px] text-slate-500">Visible en catálogo de la tienda</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    name="destacado"
                    checked={formData.destacado}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Producto Destacado</span>
                    <span className="text-[11px] text-slate-500">Resaltar en portada / ofertas</span>
                  </div>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{modalMode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">¿Eliminar este producto?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Estás a punto de eliminar <strong>"{productToDelete.nombre}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="rounded-xl flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEliminar}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex-1"
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
