import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  CreditCard,
  Truck,
  Store,
  Building2,
  MapPin,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useCarrito } from "../../context/CarritoContext";
import ConfirmModal from "../components/ConfirmModal";
import { envioService } from "../../services/envioService";

export default function Carrito() {
  const {
    items,
    resumen,
    isLoading,
    actualizarCantidad,
    eliminarItem,
    limpiarCarrito,
    cargarCarrito,
  } = useCarrito();

  const [isUpdating, setIsUpdating] = useState({});
  const [isRemoving, setIsRemoving] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Estados para Correo Argentino
  const [codigoPostal, setCodigoPostal] = useState(() => localStorage.getItem("codigo_postal") || "");
  const [cotizacionEnvio, setCotizacionEnvio] = useState(null);
  const [cotizandoEnvio, setCotizandoEnvio] = useState(false);
  const [cotizacionError, setCotizacionError] = useState("");
  const [opcionEnvioSeleccionada, setOpcionEnvioSeleccionada] = useState("correo_domicilio");
  const [costoEnvioActual, setCostoEnvioActual] = useState(() => {
    const saved = localStorage.getItem("costo_envio");
    return saved !== null ? parseInt(saved) : 4850;
  });
  const [metodoEntrega, setMetodoEntrega] = useState(() => localStorage.getItem("metodo_entrega") || "delivery");

  useEffect(() => {
    cargarCarrito();
    // Si ya teníamos un código postal guardado, cotizar automáticamente
    const cpGuardado = localStorage.getItem("codigo_postal");
    if (cpGuardado) {
      cotizar(cpGuardado);
    }
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const cotizar = async (cpParaCotizar) => {
    const cp = (cpParaCotizar || codigoPostal || "").trim();
    if (!cp) {
      setCotizacionError("Ingresa un código postal válido.");
      return;
    }

    setCotizandoEnvio(true);
    setCotizacionError("");

    try {
      const data = await envioService.cotizarEnvio(cp, resumen.total_precio || 0);
      setCotizacionEnvio(data);
      localStorage.setItem("codigo_postal", cp);

      // Buscar si la opción actual existe en las opciones devueltas
      const opcionActual = data.opciones.find(o => o.id === opcionEnvioSeleccionada) || data.opciones[0];
      if (opcionActual) {
        setOpcionEnvioSeleccionada(opcionActual.id);
        setCostoEnvioActual(opcionActual.costo);
        setMetodoEntrega(opcionActual.tipo);
        localStorage.setItem("costo_envio", opcionActual.costo.toString());
        localStorage.setItem("metodo_entrega", opcionActual.tipo);
        localStorage.setItem("tipo_envio", opcionActual.id);
        localStorage.setItem("nombre_envio", opcionActual.nombre);
      }
    } catch (error) {
      setCotizacionError("No se pudo cotizar el envío para el código postal ingresado.");
    } finally {
      setCotizandoEnvio(false);
    }
  };

  const handleSeleccionarOpcionEnvio = (opcion) => {
    setOpcionEnvioSeleccionada(opcion.id);
    setCostoEnvioActual(opcion.costo);
    setMetodoEntrega(opcion.tipo);
    localStorage.setItem("costo_envio", opcion.costo.toString());
    localStorage.setItem("metodo_entrega", opcion.tipo);
    localStorage.setItem("tipo_envio", opcion.id);
    localStorage.setItem("nombre_envio", opcion.nombre);
  };

  const calcularCostoEnvio = () => {
    if (metodoEntrega === "retiro" || opcionEnvioSeleccionada === "retiro_tienda") return 0;
    if (estaEnvioGratis()) return 0;
    return costoEnvioActual;
  };

  const estaEnvioGratis = () => {
    const totalProductos = resumen.total_precio || 0;
    return totalProductos >= 50000 && metodoEntrega !== "retiro";
  };

  const calcularTotal = () => {
    return (resumen.total_precio || 0) + calcularCostoEnvio();
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setIsUpdating((prev) => ({ ...prev, [itemId]: true }));
    try {
      await actualizarCantidad(itemId, newQuantity);
    } catch (error) {
    } finally {
      setIsUpdating((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveItem = async (itemId) => {
    setIsRemoving(itemId);
    try {
      await eliminarItem(itemId);
    } catch (error) {
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClearCart = async () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = async () => {
    setShowClearConfirm(false);
    setIsClearing(true);
    try {
      await limpiarCarrito();
    } catch (error) {
    } finally {
      setIsClearing(false);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    localStorage.setItem("metodo_entrega", metodoEntrega);
    localStorage.setItem("costo_envio", calcularCostoEnvio().toString());
    window.location.href = "/checkout";
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleProductClick = (productId) => {
    window.location.href = `/producto/${productId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "#283655" }}
          ></div>
          <p style={{ color: "#283655" }}>Cargando carrito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#ffffff] shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="flex items-center gap-2 self-start"
                style={{ color: "#283655" }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="display hidden sm:inline">
                  Continuar Comprando
                </span>
                <span className="sm:hidden">Volver</span>
              </Button>
              <div>
                <h1
                  className="display text-2xl sm:text-3xl font-bold"
                  style={{ color: "#283655" }}
                >
                  Carrito de Compras
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {items.length} {items.length === 1 ? "producto" : "productos"}{" "}
                  en tu carrito
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={isClearing}
                className="flex items-center gap-2 w-full sm:w-auto padding-2 mb-4"
                style={{ borderColor: "#4D648D", color: "#4D648D" }}
              >
                {isClearing ? (
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-b-2 p-1"
                    style={{ borderColor: "#283655" }}
                  ></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="display hidden sm:inline">Vaciar Carrito</span>
                <span className="sm:hidden">Vaciar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="display max-w-7xl mx-auto px-4 py-6 sm:py-8 p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 sm:py-16 px-4">
            <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 mb-6 text-gray-300" />
            <h2
              className="text-xl sm:text-2xl font-semibold mb-4"
              style={{ color: "#283655" }}
            >
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6 sm:mb-8 max-w-md text-sm sm:text-base">
              Agrega algunos productos a tu carrito para continuar con tu compra
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="px-6 sm:px-8 py-3 text-white font-medium rounded-lg w-full sm:w-auto"
              style={{ backgroundColor: "#4D648D" }}
            >
              Explorar Productos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:hidden min-h-[400px]">
                      <div className="relative w-full h-68 mb-3 bg-white p-3 flex items-center justify-center">
                        <img
                          src={item.producto.imagen}
                          alt={item.producto.nombre}
                          className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleProductClick(item.producto.id)}
                          onError={(e) => {
                            e.target.src =
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTUwQzEyOC44NjcgMTUwIDE1MCAxMjguODY3IDE1MCAxMDBDMTUwIDcxLjEzMyAxMjguODY3IDUwIDEwMCA1MEM3MS4xMzMgNTAgNTAgNzEuMTMzIDUwIDEwMEM1MCAxMjguODY3IDcxLjEzMyAxNTAgMTAwIDE1MFoiIGZpbGw9IiNlMWU1ZTkiLz4KPC9zdmc+";
                          }}
                        />

                        <div className="absolute top-3 right-3 z-30">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            disabled={isRemoving === item.id}
                            className="w-16 h-16 hover:bg-[#D0E1F9] text-[#4D648D] hover:shadow-xl transition-all duration-200 flex items-center justify-center transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              minWidth: "74px",
                              minHeight: "74px",
                            }}
                          >
                            {isRemoving === item.id ? (
                              <svg
                                className="animate-spin h-8 w-8 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="h-8 w-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        <h3
                          className="font-semibold text-base leading-tight cursor-pointer hover:underline h-88 pt-4 sm:pt-0 pb-3 sm:pb-0"
                          style={{
                            color: "#283655",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: "1.3",
                            maxHeight: "4.6em",
                          }}
                          onClick={() => handleProductClick(item.producto.id)}
                        >
                          {item.producto.nombre}
                        </h3>

                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-gray-600">
                            Precio unitario:
                          </span>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <p
                              className="text-sm font-bold"
                              style={{
                                color: item.tiene_oferta
                                  ? "#4D648D"
                                  : "#283655",
                              }}
                            >
                              {formatPrice(
                                item.precio_unitario || item.producto.precio
                              )}
                            </p>
                            {item.tiene_oferta && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs line-through text-gray-500">
                                  {formatPrice(item.producto.precio)}
                                </span>
                                <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
                                  -{item.porcentaje_descuento}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">
                              Cantidad:
                            </span>
                            <div className="flex items-center border-2 rounded-lg overflow-hidden bg-white shadow-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.cantidad - 1
                                  )
                                }
                                disabled={
                                  item.cantidad <= 1 || isUpdating[item.id]
                                }
                                className="h-10 w-10 p-0 rounded-none hover:bg-gray-100 border-r-2 flex items-center justify-center text-gray-700 hover:text-black flex-shrink-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              <div className="px-3 py-2 min-w-[50px] text-center text-sm font-bold bg-gray-50 flex-shrink-0">
                                {item.cantidad}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.cantidad + 1
                                  )
                                }
                                disabled={
                                  item.cantidad >= item.producto.stock ||
                                  isUpdating[item.id]
                                }
                                className="h-10 w-10 p-0 rounded-none hover:bg-gray-100 border-l-2 flex items-center justify-center text-gray-700 hover:text-black flex-shrink-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {isUpdating[item.id] && (
                            <div className="flex justify-center">
                              <div
                                className="animate-spin rounded-full h-4 w-4 border-b-2"
                                style={{ borderColor: "#283655" }}
                              ></div>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 font-medium">
                              Subtotal:
                            </span>
                            <div className="flex flex-col items-end">
                              <p
                                className="text-lg font-bold"
                                style={{ color: "#283655" }}
                              >
                                {formatPrice(
                                  item.subtotal ||
                                    (item.precio_unitario ||
                                      item.producto.precio) * item.cantidad
                                )}
                              </p>
                              {item.tiene_oferta && (
                                <span className="text-xs text-green-600">
                                  Ahorras:{" "}
                                  {formatPrice(
                                    (item.producto.precio -
                                      (item.precio_unitario ||
                                        item.producto.precio)) *
                                      item.cantidad
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center">
                      <div className="w-36 h-32 flex-shrink-0 bg-white p-2 flex items-center justify-center rounded-md border">
                        <img
                          src={item.producto.imagen}
                          alt={item.producto.nombre}
                          className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleProductClick(item.producto.id)}
                          onError={(e) => {
                            e.target.src =
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTUwQzEyOC44NjcgMTUwIDE1MCAxMjguODY3IDE1MCAxMDBDMTUwIDcxLjEzMyAxMjguODY3IDUwIDEwMCA1MEM3MS4xMzMgNTAgNTAgNzEuMTMzIDUwIDEwMEM1MCAxMjguODY3IDcxLjEzMyAxNTAgMTAwIDE1MFoiIGZpbGw9IiNlMWU1ZTkiLz4KPC9zdmc+";
                          }}
                        />
                      </div>

                      <div className="flex-1 p-4 space-y-3">
                        <div className="flex justify-between items-start mb-2">
                          <h3
                            className="font-semibold text-lg cursor-pointer hover:underline line-clamp-2 flex-1 mr-2"
                            style={{ color: "#283655" }}
                            onClick={() => handleProductClick(item.producto.id)}
                          >
                            {item.producto.nombre}
                          </h3>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            disabled={isRemoving === item.id}
                            className="ml-3 p-3 text-color-#283655 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all duration-200 flex items-center justify-center transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 border-2 border-color-#283655 hover:border-red-300"
                            title="Eliminar producto"
                            style={{
                              minWidth: "44px",
                              minHeight: "44px",
                            }}
                          >
                            {isRemoving === item.id ? (
                              <svg
                                className="animate-spin h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <p
                            className="text-lg font-bold"
                            style={{
                              color: item.tiene_oferta ? "#283655" : "#283655",
                            }}
                          >
                            {formatPrice(
                              item.precio_unitario || item.producto.precio
                            )}
                          </p>
                          {item.tiene_oferta && (
                            <>
                              <span className="text-sm line-through text-gray-500">
                                {formatPrice(item.producto.precio)}
                              </span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                                -{item.porcentaje_descuento}% OFF
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="flex items-center gap-3 justify-center lg:justify-start">
                            <span className="text-sm text-gray-600 font-medium">
                              Cantidad:
                            </span>
                            <div className="flex items-center border-2 rounded-lg overflow-hidden bg-white shadow-sm w-fit">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.cantidad - 1
                                  )
                                }
                                disabled={
                                  item.cantidad <= 1 || isUpdating[item.id]
                                }
                                className="h-12 w-12 p-0 rounded-none hover:bg-gray-100 border-r-2 flex items-center justify-center text-gray-700 hover:text-black flex-shrink-0"
                              >
                                <Minus className="h-5 w-5" />
                              </Button>

                              <div className="px-4 py-3 min-w-[70px] text-center text-base font-bold bg-gray-50 flex-shrink-0">
                                {item.cantidad}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.cantidad + 1
                                  )
                                }
                                disabled={
                                  item.cantidad >= item.producto.stock ||
                                  isUpdating[item.id]
                                }
                                className="h-12 w-12 p-0 rounded-none hover:bg-gray-100 border-l-2 flex items-center justify-center text-gray-700 hover:text-black flex-shrink-0"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>

                            {isUpdating[item.id] && (
                              <div
                                className="animate-spin rounded-full h-5 w-5 border-b-2"
                                style={{ borderColor: "#f83258" }}
                              ></div>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">
                              Subtotal
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{ color: "#4D648D" }}
                            >
                              {formatPrice(
                                item.subtotal ||
                                  (item.precio_unitario ||
                                    item.producto.precio) * item.cantidad
                              )}
                            </p>
                            {item.tiene_oferta && (
                              <p className="text-xs text-green-600 mt-1">
                                Ahorras:{" "}
                                {formatPrice(
                                  (item.producto.precio -
                                    (item.precio_unitario ||
                                      item.producto.precio)) *
                                    item.cantidad
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1 mt-6 lg:mt-0 mb-10 lg:mb-0">
              <Card className="sticky top-4">
                <CardContent className="p-4 sm:p-6">
                  <h3
                    className="text-lg sm:text-xl font-bold mb-4 sm:mb-6"
                    style={{ color: "#283655" }}
                  >
                    Resumen del Pedido
                  </h3>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4
                        className="text-md font-semibold flex items-center gap-2"
                        style={{ color: "#283655" }}
                      >
                        <Truck className="h-5 w-5 text-blue-600" />
                        Envío por Correo Argentino
                      </h4>
                    </div>

                    {/* Widget Cotizador por Código Postal */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Ingresá tu Código Postal para calcular el envío:
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="Ej: 1425, 5000"
                            value={codigoPostal}
                            onChange={(e) => setCodigoPostal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") cotizar();
                            }}
                            className="pl-8 h-9 text-sm bg-white rounded-lg"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => cotizar()}
                          disabled={cotizandoEnvio}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 h-9 rounded-lg flex items-center gap-1.5"
                        >
                          {cotizandoEnvio ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Calcular"
                          )}
                        </Button>
                      </div>

                      {cotizacionError && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          {cotizacionError}
                        </p>
                      )}

                      {cotizacionEnvio && (
                        <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Tarifas para {cotizacionEnvio.region}
                        </p>
                      )}
                    </div>

                    {/* Opciones de Envío */}
                    <div className="space-y-2.5">
                      {(cotizacionEnvio ? cotizacionEnvio.opciones : [
                        {
                          id: 'correo_domicilio',
                          nombre: 'Correo Argentino - A Domicilio',
                          tipo: 'delivery',
                          costo: 4850,
                          tiempo_entrega: '2 a 4 días hábiles',
                          descripcion: 'Entrega en tu domicilio',
                          icono: 'truck'
                        },
                        {
                          id: 'correo_sucursal',
                          nombre: 'Correo Argentino - Retiro en Sucursal',
                          tipo: 'sucursal',
                          costo: 3600,
                          tiempo_entrega: '1 a 3 días hábiles',
                          descripcion: 'Retiro en sucursal oficial',
                          icono: 'building'
                        },
                        {
                          id: 'retiro_tienda',
                          nombre: 'Retiro en Tienda / Local',
                          tipo: 'retiro',
                          costo: 0,
                          tiempo_entrega: 'Inmediato',
                          descripcion: 'Coordinar con la tienda',
                          icono: 'store'
                        }
                      ]).map((opcion) => {
                        const isSelected = opcionEnvioSeleccionada === opcion.id;
                        const esGratis = estaEnvioGratis() || opcion.costo === 0;

                        return (
                          <div
                            key={opcion.id}
                            className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/70 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                            onClick={() => handleSeleccionarOpcionEnvio(opcion)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="opcion_envio"
                                  checked={isSelected}
                                  onChange={() => handleSeleccionarOpcionEnvio(opcion)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-semibold text-xs sm:text-sm text-slate-900">
                                    {opcion.nombre}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {opcion.tiempo_entrega}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {esGratis ? (
                                  <span className="font-bold text-emerald-600 text-xs sm:text-sm">
                                    ¡GRATIS!
                                  </span>
                                ) : (
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {formatPrice(opcion.costo)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

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

                  <div className="space-y-3 mb-4 sm:mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">
                        Productos ({resumen.total_items}):
                      </span>
                      <span className="font-medium text-sm sm:text-base">
                        {formatPrice(resumen.total_precio)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">
                        Envío (
                        {metodoEntrega === "delivery" ? "Delivery" : "Retiro"}):
                      </span>
                      <span className="font-medium text-green-600 text-sm sm:text-base">
                        {calcularCostoEnvio() === 0
                          ? "Gratis"
                          : formatPrice(calcularCostoEnvio())}
                      </span>
                    </div>

                    <hr className="my-4" />

                    <div className="flex justify-between text-base sm:text-lg font-bold">
                      <span style={{ color: "#283655" }}>Total:</span>
                      <span style={{ color: "#283655" }}>
                        {formatPrice(calcularTotal())}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full py-3 text-white font-medium rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
                    style={{ backgroundColor: "#4D648D" }}
                    disabled={items.length === 0}
                  >
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    Proceder al Pago
                  </Button>

                  <div className="text-xs text-gray-500 text-center mt-4 space-y-1">
                    <p>• Delivery disponible Lunes a Viernes ($3.500)</p>
                    <p>• Retiro en tienda Lunes a Sábado (Gratis)</p>
                    <p>• Los precios incluyen IVA</p>
                    <p>• Tiempo de entrega: 2-5 días hábiles</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearCart}
        title="Vaciar Carrito"
        message="¿Estás seguro de que quieres eliminar todos los productos del carrito? Esta acción no se puede deshacer."
        confirmText="Sí, vaciar carrito"
        cancelText="Cancelar"
        type="warning"
      />
    </div>
  );
}
