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
  DollarSign,
  BarChart3,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Download,
  Award,
  Gift,
  Boxes,
  Percent,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Pestaña Activa ('catalogo' | 'combos' | 'reportes')
  const [activeTab, setActiveTab] = useState('catalogo');

  // Estados de datos de catálogo
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Estados de Combos
  const [combos, setCombos] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [searchTermCombos, setSearchTermCombos] = useState('');
  const [selectedThemeCombos, setSelectedThemeCombos] = useState('todos');
  const [selectedStatusCombos, setSelectedStatusCombos] = useState('todos'); // todos, activos, inactivos, sin_stock, destacados

  // Estados de reporte de ventas
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Filtros de Catálogo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('todos'); // todos, activos, inactivos, sin_stock, destacados

  // Notificaciones
  const [notification, setNotification] = useState(null);

  // ===== MODAL PRODUCTOS =====
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ===== MODAL COMBOS =====
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalMode, setComboModalMode] = useState('create'); // 'create' | 'edit'
  const [editingComboId, setEditingComboId] = useState(null);
  const [savingCombo, setSavingCombo] = useState(false);
  const [comboFormError, setComboFormError] = useState('');
  const [comboFormData, setComboFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: 1,
    tema: 'Star Wars',
    activo: true,
    destacado: false,
    items: [], // [{ producto_id, cantidad, producto }]
    imagen: null
  });
  const [comboImagePreview, setComboImagePreview] = useState(null);
  const comboFileInputRef = useRef(null);
  const [searchProdInCombo, setSearchProdInCombo] = useState('');

  const [deleteComboModalOpen, setDeleteComboModalOpen] = useState(false);
  const [comboToDelete, setComboToDelete] = useState(null);
  const [deletingCombo, setDeletingCombo] = useState(false);

  // 1. Verificar si el usuario es Administrador
  useEffect(() => {
    const verificarPermisos = async () => {
      setAuthChecking(true);
      try {
        const perfil = await adminService.obtenerPerfil();
        if (perfil && (perfil.is_staff || perfil.is_superuser)) {
          setIsAdmin(true);
          cargarDatosIniciales();
          cargarCombos();
          cargarReporteVentas();
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
      mostrarNotificacion('Error al cargar datos del catálogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar combos
  const cargarCombos = async () => {
    setLoadingCombos(true);
    try {
      const data = await adminService.obtenerCombosAdmin();
      setCombos(Array.isArray(data) ? data : []);
    } catch (error) {
      mostrarNotificacion('Error al cargar combos', 'error');
    } finally {
      setLoadingCombos(false);
    }
  };

  // Cargar reporte de ventas
  const cargarReporteVentas = async () => {
    setLoadingReport(true);
    try {
      const data = await adminService.obtenerReporteVentas();
      setReportData(data);
    } catch (error) {
      console.error('Error al cargar reporte de ventas:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotification({ mensaje, tipo });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // ===== FUNCIONES DE PRODUCTOS =====
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

  const handleAbrirEditar = (prod) => {
    setModalMode('edit');
    setEditingId(prod.id);
    
    const catIds = prod.categorias ? prod.categorias.map(c => c.id) : [];
    const isActivo = prod.activo !== undefined ? prod.activo : true;
    
    setFormData({
      nombre: prod.nombre || '',
      descripcion: prod.descripcion || '',
      precio: prod.precio || '',
      stock: prod.stock || 0,
      activo: isActivo,
      destacado: isActivo ? (prod.destacado || false) : false,
      categoria_ids: catIds,
      imagen: null
    });
    setImagePreview(prod.imagen || null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'activo') {
      const isActivo = checked;
      setFormData(prev => ({
        ...prev,
        activo: isActivo,
        destacado: isActivo ? prev.destacado : false
      }));
    } else if (name === 'destacado') {
      if (!formData.activo && checked) {
        mostrarNotificacion('Un producto inactivo no puede estar destacado', 'error');
        return;
      }
      setFormData(prev => ({
        ...prev,
        destacado: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
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
      dataToSend.append('destacado', formData.activo ? formData.destacado : false);

      formData.categoria_ids.forEach(id => {
        dataToSend.append('categoria_ids', id);
      });

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

  // ===== FUNCIONES DE COMBOS =====
  const handleAbrirCrearCombo = () => {
    setComboModalMode('create');
    setEditingComboId(null);
    setComboFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: 1,
      tema: 'Star Wars',
      activo: true,
      destacado: false,
      items: [],
      imagen: null
    });
    setComboImagePreview(null);
    setComboFormError('');
    setSearchProdInCombo('');
    if (comboFileInputRef.current) comboFileInputRef.current.value = '';
    setComboModalOpen(true);
  };

  const handleAbrirEditarCombo = (combo) => {
    setComboModalMode('edit');
    setEditingComboId(combo.id);

    // Mapear items existentes
    const initialItems = (combo.items || []).map(item => ({
      producto_id: item.producto?.id || item.producto_id,
      cantidad: item.cantidad || 1,
      producto: item.producto || productos.find(p => p.id === (item.producto?.id || item.producto_id))
    }));

    setComboFormData({
      nombre: combo.nombre || '',
      descripcion: combo.descripcion || '',
      precio: combo.precio || '',
      stock: combo.stock || 0,
      tema: combo.tema || 'Especial',
      activo: combo.activo !== undefined ? combo.activo : true,
      destacado: combo.destacado || false,
      items: initialItems,
      imagen: null
    });
    setComboImagePreview(combo.imagen || null);
    setComboFormError('');
    setSearchProdInCombo('');
    if (comboFileInputRef.current) comboFileInputRef.current.value = '';
    setComboModalOpen(true);
  };

  const handleComboInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'activo') {
      const isActivo = checked;
      setComboFormData(prev => ({
        ...prev,
        activo: isActivo,
        destacado: isActivo ? prev.destacado : false
      }));
    } else if (name === 'destacado') {
      if (!comboFormData.activo && checked) {
        mostrarNotificacion('Un combo inactivo no puede estar destacado', 'error');
        return;
      }
      setComboFormData(prev => ({
        ...prev,
        destacado: checked
      }));
    } else {
      setComboFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleToggleProductoEnCombo = (prod) => {
    setComboFormData(prev => {
      const exists = prev.items.some(it => it.producto_id === prod.id);
      if (exists) {
        return {
          ...prev,
          items: prev.items.filter(it => it.producto_id !== prod.id)
        };
      } else {
        return {
          ...prev,
          items: [...prev.items, { producto_id: prod.id, cantidad: 1, producto: prod }]
        };
      }
    });
  };

  const handleCambiarCantidadItem = (prodId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setComboFormData(prev => ({
        ...prev,
        items: prev.items.filter(it => it.producto_id !== prodId)
      }));
      return;
    }
    setComboFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.producto_id === prodId ? { ...it, cantidad: nuevaCantidad } : it)
    }));
  };

  const handleComboImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setComboFormError('La imagen no puede superar los 5MB');
        return;
      }
      setComboFormData(prev => ({ ...prev, imagen: file }));
      setComboImagePreview(URL.createObjectURL(file));
      setComboFormError('');
    }
  };

  const handleQuitarComboImagen = () => {
    setComboFormData(prev => ({ ...prev, imagen: null }));
    setComboImagePreview(null);
    if (comboFileInputRef.current) comboFileInputRef.current.value = '';
  };

  // Cálculos dinámicos de combo
  const sumaOriginalCombo = comboFormData.items.reduce((acc, item) => {
    const prod = item.producto || productos.find(p => p.id === item.producto_id);
    const precio = Number(prod?.precio || 0);
    return acc + (precio * (item.cantidad || 1));
  }, 0);

  const ahorroMonto = sumaOriginalCombo > Number(comboFormData.precio) 
    ? sumaOriginalCombo - Number(comboFormData.precio) 
    : 0;

  const ahorroPorcentaje = sumaOriginalCombo > 0 && ahorroMonto > 0 
    ? Math.round((ahorroMonto / sumaOriginalCombo) * 100) 
    : 0;

  // Cálculo de stock máximo armable según el inventario de los productos seleccionados
  const maxArmable = comboFormData.items.length > 0
    ? Math.min(...comboFormData.items.map(item => {
        const prod = item.producto || productos.find(p => p.id === item.producto_id);
        const stockDisponible = Number(prod?.stock || 0);
        return Math.floor(stockDisponible / (item.cantidad || 1));
      }))
    : 0;

  const handleGuardarCombo = async (e) => {
    e.preventDefault();
    setComboFormError('');

    if (!comboFormData.nombre.trim()) {
      setComboFormError('El nombre del combo es obligatorio');
      return;
    }
    if (!comboFormData.precio || Number(comboFormData.precio) <= 0) {
      setComboFormError('Ingresa un precio válido mayor a 0');
      return;
    }
    if (comboFormData.items.length === 0) {
      setComboFormError('Debes incluir al menos 1 producto en el combo');
      return;
    }
    if (Number(comboFormData.stock) < 0) {
      setComboFormError('El stock de combos no puede ser negativo');
      return;
    }

    setSavingCombo(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append('nombre', comboFormData.nombre.trim());
      dataToSend.append('descripcion', comboFormData.descripcion.trim());
      dataToSend.append('precio', comboFormData.precio);
      dataToSend.append('stock', comboFormData.stock);
      dataToSend.append('tema', comboFormData.tema || 'Especial');
      dataToSend.append('activo', comboFormData.activo);
      dataToSend.append('destacado', comboFormData.activo ? comboFormData.destacado : false);

      // Pasar items_input como JSON string
      const itemsPayload = comboFormData.items.map(it => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad
      }));
      dataToSend.append('items_input', JSON.stringify(itemsPayload));

      if (comboFormData.imagen instanceof File) {
        dataToSend.append('imagen', comboFormData.imagen);
      }

      if (comboModalMode === 'create') {
        const nuevo = await adminService.crearCombo(dataToSend);
        setCombos(prev => [nuevo, ...prev]);
        mostrarNotificacion('¡Combo creado con éxito y stock descontado!');
      } else {
        const actualizado = await adminService.actualizarCombo(editingComboId, dataToSend);
        setCombos(prev => prev.map(c => c.id === editingComboId ? actualizado : c));
        mostrarNotificacion('¡Combo actualizado correctamente!');
      }

      // Recargar catálogo de productos para ver el stock actualizado descontado
      cargarDatosIniciales();
      setComboModalOpen(false);
    } catch (err) {
      console.error(err);
      setComboFormError(err.message || 'Error al guardar el combo. Revisa el stock disponible de los productos.');
    } finally {
      setSavingCombo(false);
    }
  };

  const handleConfirmarEliminarCombo = async () => {
    if (!comboToDelete) return;
    setDeletingCombo(true);
    try {
      await adminService.eliminarCombo(comboToDelete.id);
      setCombos(prev => prev.filter(c => c.id !== comboToDelete.id));
      mostrarNotificacion('Combo eliminado y stock devuelto a los productos');
      // Recargar catálogo de productos para ver el stock devuelto
      cargarDatosIniciales();
      setDeleteComboModalOpen(false);
    } catch (err) {
      mostrarNotificacion('No se pudo eliminar el combo', 'error');
    } finally {
      setDeletingCombo(false);
      setComboToDelete(null);
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

  // Exportar reporte a CSV
  const handleExportarCSV = () => {
    if (!reportData || !reportData.ordenes_recientes || reportData.ordenes_recientes.length === 0) {
      mostrarNotificacion('No hay datos suficientes para exportar', 'error');
      return;
    }

    const headers = ['ID Orden', 'Fecha', 'Cliente / Email', 'Método Entrega', 'Estado', 'Total ($)'];
    const rows = reportData.ordenes_recientes.map(ord => [
      ord.id,
      new Date(ord.fecha).toLocaleString('es-CL'),
      ord.email_contacto || ord.nombre_completo || 'Invitado',
      ord.metodo_entrega === 'delivery' ? 'Delivery' : 'Retiro en Tienda',
      ord.estado,
      ord.total
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarNotificacion('Reporte exportado en formato CSV');
  };

  // Filtrado de productos
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

  // Filtrado de combos
  const combosFiltrados = combos.filter(combo => {
    const matchSearch = combo.nombre.toLowerCase().includes(searchTermCombos.toLowerCase()) ||
      (combo.descripcion && combo.descripcion.toLowerCase().includes(searchTermCombos.toLowerCase())) ||
      (combo.tema && combo.tema.toLowerCase().includes(searchTermCombos.toLowerCase()));

    let matchTheme = true;
    if (selectedThemeCombos !== 'todos') {
      matchTheme = combo.tema?.toLowerCase() === selectedThemeCombos.toLowerCase();
    }

    let matchStatus = true;
    if (selectedStatusCombos === 'activos') matchStatus = combo.activo === true;
    if (selectedStatusCombos === 'inactivos') matchStatus = combo.activo === false;
    if (selectedStatusCombos === 'sin_stock') matchStatus = Number(combo.stock) === 0;
    if (selectedStatusCombos === 'destacados') matchStatus = combo.destacado === true;

    return matchSearch && matchTheme && matchStatus;
  });

  // Métricas
  const totalProds = productos.length;
  const totalActivos = productos.filter(p => p.activo).length;
  const totalSinStock = productos.filter(p => Number(p.stock) === 0).length;
  const totalDestacados = productos.filter(p => p.destacado && p.activo).length;

  const totalCombosCount = combos.length;
  const totalCombosActivos = combos.filter(c => c.activo).length;
  const totalCombosSinStock = combos.filter(c => Number(c.stock) === 0).length;
  const totalCombosDestacados = combos.filter(c => c.destacado && c.activo).length;

  // Temas/Sagas disponibles para combos
  const temasDisponibles = [
    'Star Wars',
    'Harry Potter',
    'Marvel',
    'DC Comics',
    'Ninjago',
    'Technic',
    'City',
    'Speed Champions',
    'Super Mario',
    'Especial'
  ];

  // Productos para el selector en Modal Combo
  const prodsParaSelectorCombo = productos.filter(p => {
    if (!searchProdInCombo) return true;
    return p.nombre.toLowerCase().includes(searchProdInCombo.toLowerCase()) ||
      p.categorias?.some(c => c.nombre?.toLowerCase().includes(searchProdInCombo.toLowerCase()));
  });

  // Estado de autenticación
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

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Encabezado del Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Layers className="h-4 w-4" />
              <span>Panel de Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Administración Central
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona productos, packs de combos, stock y analiza el rendimiento comercial de la tienda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'catalogo') cargarDatosIniciales();
                else if (activeTab === 'combos') cargarCombos();
                else cargarReporteVentas();
              }}
              disabled={loading || loadingCombos || loadingReport}
              className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || loadingCombos || loadingReport) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            {activeTab === 'catalogo' && (
              <Button
                onClick={handleAbrirCrear}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Nuevo Producto</span>
              </Button>
            )}

            {activeTab === 'combos' && (
              <Button
                onClick={handleAbrirCrearCombo}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Crear Nuevo Combo</span>
              </Button>
            )}

            {activeTab === 'reportes' && (
              <Button
                onClick={handleExportarCSV}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold px-5 py-2.5 rounded-xl"
              >
                <Download className="h-5 w-5" />
                <span>Exportar CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm overflow-x-auto">
          {/* Pestaña Catálogo */}
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'catalogo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Gestión de Catálogo</span>
            <Badge className={`ml-1 text-xs ${activeTab === 'catalogo' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {totalProds}
            </Badge>
          </button>

          {/* Pestaña Combos */}
          <button
            onClick={() => {
              setActiveTab('combos');
              if (combos.length === 0) cargarCombos();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'combos'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Gift className="h-4 w-4" />
            <span>Gestión de Combos</span>
            <Badge className={`ml-1 text-xs ${activeTab === 'combos' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {totalCombosCount}
            </Badge>
          </button>

          {/* Pestaña Reporte de Ventas */}
          <button
            onClick={() => {
              setActiveTab('reportes');
              if (!reportData) cargarReporteVentas();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === 'reportes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Reporte de Ventas</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: GESTIÓN DE CATÁLOGO */}
        {activeTab === 'catalogo' && (
          <div className="space-y-6">
            {/* Tarjetas de Métricas de Catálogo */}
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Destacados Activos</p>
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
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Buscar producto por nombre o descripción..."
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
                                  {prod.destacado && prod.activo && (
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" title="Producto Destacado" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                                  {prod.descripcion || 'Sin descripción'}
                                </p>
                              </div>
                            </div>
                          </td>

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
        )}

        {/* CONTENIDO PESTAÑA 2: GESTIÓN DE COMBOS */}
        {activeTab === 'combos' && (
          <div className="space-y-6">
            {/* Tarjetas de Métricas de Combos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Combos</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCombosCount}</h3>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Gift className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Combos Activos</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalCombosActivos}</h3>
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
                    <h3 className="text-2xl font-bold text-red-600 mt-1">{totalCombosSinStock}</h3>
                  </div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Destacados en Portada</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalCombosDestacados}</h3>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Star className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros de Combos */}
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Buscar combo por nombre, saga o temática..."
                      value={searchTermCombos}
                      onChange={(e) => setSearchTermCombos(e.target.value)}
                      className="pl-10 pr-4 h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                    />
                    {searchTermCombos && (
                      <button 
                        onClick={() => setSearchTermCombos('')} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="w-full md:w-56">
                    <select
                      value={selectedThemeCombos}
                      onChange={(e) => setSelectedThemeCombos(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="todos">Todas las Temáticas / Sagas</option>
                      {temasDisponibles.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-48">
                    <select
                      value={selectedStatusCombos}
                      onChange={(e) => setSelectedStatusCombos(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

            {/* Tabla de Combos */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Combo</th>
                      <th className="py-3.5 px-4">Productos Incluidos</th>
                      <th className="py-3.5 px-4">Precio & Ahorro</th>
                      <th className="py-3.5 px-4">Stock Armado</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loadingCombos ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-2" />
                          Cargando combos...
                        </td>
                      </tr>
                    ) : combosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <Gift className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="font-semibold text-slate-700">No hay combos registrados</p>
                          <p className="text-xs text-slate-400 mt-1">Crea tu primer combo temático con productos del catálogo.</p>
                          <Button
                            onClick={handleAbrirCrearCombo}
                            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Crear Combo Ahora</span>
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      combosFiltrados.map((combo) => (
                        <tr key={combo.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Combo Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {combo.imagen ? (
                                  <img 
                                    src={combo.imagen} 
                                    alt={combo.nombre} 
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Gift className="h-5 w-5 text-purple-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 truncate max-w-xs">{combo.nombre}</p>
                                  {combo.destacado && combo.activo && (
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" title="Combo Destacado" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                    {combo.tema || 'Especial'}
                                  </span>
                                  <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                    {combo.descripcion || 'Sin descripción'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Productos incluidos */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-xs">
                              {combo.items && combo.items.length > 0 ? (
                                combo.items.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/80 px-2 py-1 rounded-md">
                                    <span className="font-bold text-purple-700">{it.cantidad}x</span>
                                    <span className="truncate">{it.producto?.nombre || `Producto #${it.producto_id}`}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Sin productos asociados</span>
                              )}
                            </div>
                          </td>

                          {/* Precios & Ahorro */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 text-base">
                                {formatPrice(combo.precio)}
                              </span>
                              {combo.precio_original_total > Number(combo.precio) && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400 line-through">
                                    {formatPrice(combo.precio_original_total)}
                                  </span>
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                    -{combo.porcentaje_ahorro}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Stock Armado */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {Number(combo.stock) === 0 ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 font-semibold">
                                Agotado (0)
                              </Badge>
                            ) : Number(combo.stock) <= 3 ? (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold">
                                Pocos combos ({combo.stock})
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 font-semibold">
                                {combo.stock} armados
                              </Badge>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {combo.activo ? (
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
                                onClick={() => window.open(`/combos`, '_blank')}
                                title="Ver en la sección de Combos"
                                className="text-slate-500 hover:text-slate-800 p-2"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAbrirEditarCombo(combo)}
                                title="Editar combo"
                                className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setComboToDelete(combo);
                                  setDeleteComboModalOpen(true);
                                }}
                                title="Eliminar combo"
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
        )}

        {/* CONTENIDO PESTAÑA 3: REPORTE DE VENTAS */}
        {activeTab === 'reportes' && (
          <div className="space-y-6">
            {loadingReport ? (
              <div className="py-20 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Calculando estadísticas y métricas de ventas...</p>
              </div>
            ) : !reportData ? (
              <Card className="p-12 text-center border-slate-100 shadow-sm">
                <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No hay datos de reporte disponibles</h3>
                <p className="text-sm text-slate-500 mt-1">Verifica la conexión con el servidor o genera nuevas órdenes.</p>
              </Card>
            ) : (
              <>
                {/* Métricas Principales (KPIs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between opacity-80 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <h3 className="text-3xl font-extrabold">{formatPrice(reportData.total_ingresos)}</h3>
                      <p className="text-xs text-blue-100 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>De {reportData.total_pagadas} órdenes procesadas</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Total Órdenes</span>
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-900">{reportData.total_ordenes}</h3>
                      <p className="text-xs text-slate-500 mt-2">
                        <strong className="text-emerald-600 font-bold">{reportData.total_pagadas}</strong> pagadas con éxito
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Ticket Promedio</span>
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-900">{formatPrice(reportData.ticket_promedio)}</h3>
                      <p className="text-xs text-slate-500 mt-2">Promedio por orden completada</p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Unidades Vendidas</span>
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-900">{reportData.total_unidades}</h3>
                      <p className="text-xs text-slate-500 mt-2">Artículos despachados/pagados</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Grilla: Top Productos & Distribución de Estados */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 border-slate-100 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <span>Ranking: Productos Más Vendidos</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {reportData.top_productos && reportData.top_productos.length > 0 ? (
                        <div className="space-y-4">
                          {reportData.top_productos.map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  index === 0 ? 'bg-amber-100 text-amber-700' :
                                  index === 1 ? 'bg-slate-200 text-slate-700' :
                                  index === 2 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  #{index + 1}
                                </div>

                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {item.imagen ? (
                                    <img src={item.imagen} alt={item.nombre} className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-sm truncate">{item.nombre}</p>
                                  <p className="text-xs text-slate-500">{item.unidades} unidades vendidas</p>
                                </div>
                              </div>

                              <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {formatPrice(item.total_generado)}
                                </span>
                                <span className="block text-[11px] text-slate-400">Generado</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-sm">
                          Aún no hay registros de ventas por producto.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <span>Estado de Órdenes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {reportData.estados_count && Object.keys(reportData.estados_count).length > 0 ? (
                        Object.entries(reportData.estados_count).map(([estado, cant]) => {
                          const percent = reportData.total_ordenes > 0 
                            ? Math.round((cant / reportData.total_ordenes) * 100) 
                            : 0;

                          const configEstado = {
                            pagado: { label: 'Pagado', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                            pendiente: { label: 'Pendiente', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                            procesando: { label: 'Procesando', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                            enviado: { label: 'Enviado', color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
                            entregado: { label: 'Entregado', color: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-100' },
                            cancelado: { label: 'Cancelado', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                          }[estado] || { label: estado, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' };

                          return (
                            <div key={estado} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-semibold px-2 py-0.5 rounded-full ${configEstado.bg} ${configEstado.text}`}>
                                  {configEstado.label}
                                </span>
                                <span className="font-bold text-slate-700">{cant} ({percent}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${configEstado.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-6">Sin registros de estados</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de Órdenes Recientes */}
                <Card className="border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-slate-500" />
                      <span>Transacciones y Órdenes Recientes</span>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportarCSV}
                      className="text-xs font-semibold flex items-center gap-1.5 border-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Descargar CSV</span>
                    </Button>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">ID Orden</th>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Cliente / Contacto</th>
                          <th className="py-3 px-4">Método Entrega</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {reportData.ordenes_recientes && reportData.ordenes_recientes.length > 0 ? (
                          reportData.ordenes_recientes.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-bold text-blue-600">#{ord.id}</td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {new Date(ord.fecha).toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs">
                                  <p className="font-semibold text-slate-800">
                                    {ord.nombre_completo || 'Cliente Registrado'}
                                  </p>
                                  <p className="text-slate-400 truncate max-w-[200px]">
                                    {ord.email_contacto || ord.email_invitado || 'Sin email'}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                                  {ord.metodo_entrega === 'delivery' ? (
                                    <>
                                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                                      Delivery
                                    </>
                                  ) : (
                                    <>
                                      <Package className="h-3.5 w-3.5 text-slate-400" />
                                      Retiro
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={`text-xs font-semibold ${
                                  ord.estado === 'pagado' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                                  ord.estado === 'pendiente' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                                  ord.estado === 'enviado' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' :
                                  ord.estado === 'cancelado' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {ord.estado.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">
                                {formatPrice(ord.total)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                              No hay transacciones registradas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL DE CREAR / EDITAR PRODUCTO ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

            <form onSubmit={handleGuardarProducto} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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

                <label className={`flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl transition-colors ${
                  !formData.activo ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    name="destacado"
                    disabled={!formData.activo}
                    checked={formData.activo ? formData.destacado : false}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Producto Destacado</span>
                    <span className="text-[11px] text-slate-500">
                      {formData.activo ? 'Resaltar en portada / carrusel' : 'Inactivo: No puede destacarse'}
                    </span>
                  </div>
                </label>
              </div>

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

      {/* ===== MODAL DE CREAR / EDITAR COMBO ===== */}
      {comboModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {comboModalMode === 'create' ? 'Crear Nuevo Combo de Productos' : 'Editar Combo'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {comboModalMode === 'create' 
                      ? 'Elige los productos a combinar y define el precio con descuento.' 
                      : `Modificando combo #${editingComboId}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setComboModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario de Combo */}
            <form onSubmit={handleGuardarCombo} className="flex-1 overflow-y-auto p-6 space-y-5">
              {comboFormError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{comboFormError}</span>
                </div>
              )}

              {/* Nombre y Temática */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre del Combo *
                  </label>
                  <Input
                    type="text"
                    name="nombre"
                    placeholder="Ej: Mega Pack Star Wars: Batalla de Hoth"
                    value={comboFormData.nombre}
                    onChange={handleComboInputChange}
                    required
                    className="rounded-xl border-slate-200 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Saga / Temática *
                  </label>
                  <select
                    name="tema"
                    value={comboFormData.tema}
                    onChange={handleComboInputChange}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {temasDisponibles.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descripción del Combo
                </label>
                <textarea
                  name="descripcion"
                  rows={2}
                  placeholder="Explica qué incluye este pack, piezas especiales y ventajas del combo..."
                  value={comboFormData.descripcion}
                  onChange={handleComboInputChange}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* SELECCIONADOR DE PRODUCTOS */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-purple-600" />
                      <span>Productos que Componen el Combo ({comboFormData.items.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Al crear combos con stock, se descontará automáticamente el stock individual de cada producto.
                    </p>
                  </div>
                </div>

                {/* Lista de productos seleccionados */}
                {comboFormData.items.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-medium">
                    ⚠️ Aún no has seleccionado productos. Busca y agrega productos abajo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {comboFormData.items.map((it) => {
                      const prod = it.producto || productos.find(p => p.id === it.producto_id);
                      const unitPrice = Number(prod?.precio || 0);
                      const subtotal = unitPrice * (it.cantidad || 1);

                      return (
                        <div key={it.producto_id} className="flex items-center justify-between gap-3 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {prod?.imagen ? (
                                <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Package className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">{prod?.nombre}</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>Unitario: {formatPrice(unitPrice)}</span>
                                <span>• Stock indiv: <strong className={prod?.stock <= 5 ? 'text-red-600' : 'text-slate-700'}>{prod?.stock}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Control de Cantidad */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                              <button
                                type="button"
                                onClick={() => handleCambiarCantidadItem(it.producto_id, it.cantidad - 1)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-l-lg"
                                title="Reducir cantidad"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2.5 text-xs font-bold text-slate-800">{it.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => handleCambiarCantidadItem(it.producto_id, it.cantidad + 1)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-r-lg"
                                title="Aumentar cantidad"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="font-bold text-xs text-slate-900 w-20 text-right">
                              {formatPrice(subtotal)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCambiarCantidadItem(it.producto_id, 0)}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg"
                              title="Quitar producto del combo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Buscador de catálogo para añadir productos al combo */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Buscar set o producto del catálogo para agregar..."
                      value={searchProdInCombo}
                      onChange={(e) => setSearchProdInCombo(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl bg-white border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {prodsParaSelectorCombo.slice(0, 10).map((prod) => {
                      const isSelected = comboFormData.items.some(it => it.producto_id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleToggleProductoEnCombo(prod)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-purple-50 border-purple-300 text-purple-900' 
                              : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold truncate">{prod.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-500 font-medium">{formatPrice(prod.precio)}</span>
                            <Badge className={`text-[10px] ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              {isSelected ? '✓ Agregado' : '+ Añadir'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Precios, Descuentos y Stock a armar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
                {/* Suma Original */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Valor Original Sumado
                  </label>
                  <div className="h-10 px-3 bg-white border border-slate-200 rounded-xl flex items-center font-bold text-slate-500 text-sm">
                    {formatPrice(sumaOriginalCombo)}
                  </div>
                </div>

                {/* Precio Especial del Combo */}
                <div>
                  <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                    Precio Combo ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                    <Input
                      type="number"
                      name="precio"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 49990"
                      value={comboFormData.precio}
                      onChange={handleComboInputChange}
                      required
                      className="pl-8 font-bold text-purple-900 border-purple-200 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  {ahorroMonto > 0 && (
                    <span className="block text-[11px] text-emerald-700 font-bold mt-1">
                      Ahorro: {formatPrice(ahorroMonto)} (-{ahorroPorcentaje}%)
                    </span>
                  )}
                </div>

                {/* Stock Armado */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Combos a Armar (Stock) *
                  </label>
                  <Input
                    type="number"
                    name="stock"
                    min="0"
                    placeholder="Ej: 5"
                    value={comboFormData.stock}
                    onChange={handleComboInputChange}
                    required
                    className="font-bold text-slate-900 border-slate-200 bg-white"
                  />
                  <span className="block text-[10px] text-slate-500 mt-1">
                    Max armable según inventario: <strong>{maxArmable}</strong>
                  </span>
                </div>
              </div>

              {/* Imagen del Combo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Imagen del Combo
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50/30">
                  {comboImagePreview ? (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={comboImagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={handleQuitarComboImagen}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700"
                        title="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                      <Gift className="h-8 w-8 text-purple-400" />
                      <span className="text-[10px] mt-1">Sin imagen</span>
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    <input
                      type="file"
                      ref={comboFileInputRef}
                      onChange={handleComboImageChange}
                      accept="image/*"
                      className="hidden"
                      id="combo-image-upload"
                    />
                    <label
                      htmlFor="combo-image-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
                    >
                      <Upload className="h-4 w-4 text-purple-600" />
                      {comboImagePreview ? 'Cambiar archivo de imagen' : 'Subir foto del combo'}
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1.5">Formatos JPG, PNG o WEBP (máximo 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Switches: Activo y Destacado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={comboFormData.activo}
                    onChange={handleComboInputChange}
                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Combo Activo</span>
                    <span className="text-[11px] text-slate-500">Visible en la sección /combos de la tienda</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl transition-colors ${
                  !comboFormData.activo ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    name="destacado"
                    disabled={!comboFormData.activo}
                    checked={comboFormData.activo ? comboFormData.destacado : false}
                    onChange={handleComboInputChange}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Combo Destacado</span>
                    <span className="text-[11px] text-slate-500">
                      {comboFormData.activo ? 'Resaltar en portada / carrusel de combos' : 'Inactivo: No puede destacarse'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Botones de Guardar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setComboModalOpen(false)}
                  disabled={savingCombo}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingCombo}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl px-6 flex items-center gap-2"
                >
                  {savingCombo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando Combo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{comboModalMode === 'create' ? 'Crear y Armar Combo' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PRODUCTO ===== */}
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

      {/* ===== MODAL DE CONFIRMACIÓN DE ELIMINACIÓN COMBO ===== */}
      {deleteComboModalOpen && comboToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">¿Eliminar este combo?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Estás a punto de eliminar el combo <strong>"{comboToDelete.nombre}"</strong>.
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium mb-6">
              💡 El stock de {comboToDelete.stock} unidades de este combo será devuelto automáticamente al inventario de sus productos constitutivos.
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteComboModalOpen(false)}
                disabled={deletingCombo}
                className="rounded-xl flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEliminarCombo}
                disabled={deletingCombo}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex-1"
              >
                {deletingCombo ? 'Eliminando...' : 'Sí, Eliminar Combo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
