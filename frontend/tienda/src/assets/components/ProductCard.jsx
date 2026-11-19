import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { Heart, ShoppingCart, Eye, Star, Tag, Film, Baby, Sparkles } from "lucide-react";
import { useCarrito } from "../../context/CarritoContext.jsx";
import { useDeseos } from "../../context/DeseosContext.jsx";
import AuthModal from "./AuthModal.jsx";
import WishlistButton from "./WishlistButton.jsx";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const { agregarProducto, isAuthenticated } = useCarrito();
  const { toggleProducto, items: deseosItems } = useDeseos();

  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDeviceSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 640);
      setIsTablet(width > 640 && width <= 1024);
    };

    checkDeviceSize();
    window.addEventListener("resize", checkDeviceSize);

    return () => window.removeEventListener("resize", checkDeviceSize);
  }, []);

  const truncateToWords = (text, wordCount = 4) => {
    if (!text) return "";
    const words = text.split(" ");
    return words.length > wordCount
      ? words.slice(0, wordCount).join(" ") + "..."
      : text;
  };

  if (!product) {
    return <div>Producto no disponible</div>;
  }

  // Extracción robusta de Película / Saga
  const getPeliculaSaga = () => {
    if (product.pelicula_saga) return product.pelicula_saga;
    
    let cats = [];
    if (Array.isArray(product.categorias)) {
      cats = product.categorias.map(c => typeof c === 'string' ? c : c.nombre).filter(Boolean);
    } else if (product.categoria) {
      cats = [product.categoria];
    }

    const nonAgeCats = cats.filter(c => !c.toLowerCase().includes('año') && !c.toLowerCase().includes('adulto'));
    const allText = (nonAgeCats.join(' ') + ' ' + (product.nombre || '')).toLowerCase();

    if (allText.includes('star wars')) return 'Star Wars';
    if (allText.includes('harry potter') || allText.includes('fantastic beasts') || allText.includes('hogwarts')) return 'Harry Potter';
    if (allText.includes('marvel') || allText.includes('infinity saga') || allText.includes('spider-man') || allText.includes('spiderman') || allText.includes('iron man') || allText.includes('avengers')) return 'Marvel';
    if (allText.includes('batman') || allText.includes('dc comics') || allText.includes('super heroes dc') || allText.includes('superman')) return 'DC / Batman';
    if (allText.includes('jurassic')) return 'Jurassic World';
    if (allText.includes('mario')) return 'Super Mario';
    if (allText.includes('lord of the rings') || allText.includes('hobbit')) return 'El Señor de los Anillos';
    if (allText.includes('disney') || allText.includes('frozen') || allText.includes('toy story') || allText.includes('mickey')) return 'Disney';
    if (allText.includes('minecraft')) return 'Minecraft';
    if (allText.includes('ninjago')) return 'Ninjago';
    if (allText.includes('pok')) return 'Pokémon';
    if (allText.includes('fortnite')) return 'Fortnite';
    if (allText.includes('speed champions')) return 'Speed Champions';
    if (allText.includes('technic')) return 'Technic';
    if (allText.includes('friends')) return 'Friends';
    if (allText.includes('city') || allText.includes('police') || allText.includes('town')) return 'City';
    
    if (nonAgeCats.length > 0) return nonAgeCats[0];
    return 'Colección';
  };

  // Extracción robusta de Rango de Edad
  const getEdad = () => {
    if (product.edad && product.edad !== 'Todas las edades') return product.edad;
    
    let cats = [];
    if (Array.isArray(product.categorias)) {
      cats = product.categorias.map(c => typeof c === 'string' ? c : c.nombre).filter(Boolean);
    } else if (product.categoria) {
      cats = [product.categoria];
    }

    const ageCat = cats.find(c => c.toLowerCase().includes('año') || c.toLowerCase().includes('adulto'));
    return ageCat || 'Todas las edades';
  };

  const peliculaSaga = getPeliculaSaga();
  const edad = getEdad();

  const isWishlisted = deseosItems.some(
    (item) =>
      (item.producto && item.producto.id === product.id) ||
      item.id === product.id
  );

  const isOnSale = product.en_oferta || product.precio_oferta;
  const displayPrice = isOnSale ? product.precio_oferta : product.precio;
  const originalPrice = isOnSale
    ? product.precio_original || product.precio
    : null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const showAuthMessage = (message) => {
    setAuthModalMessage(message);
    setShowAuthModal(true);
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();

    const token = localStorage.getItem("access_token");
    if (!token) {
      showAuthMessage(
        "Debes iniciar sesión para agregar productos a tu lista de deseos"
      );
      return;
    }

    setIsTogglingWishlist(true);
    try {
      const result = await toggleProducto(product.id);
      if (!result.success) {
      }
    } catch (error) {
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    setIsAddingToCart(true);
    try {
      const result = await agregarProducto(product.id, 1);
      if (result.success) {
      } else {
        if (result.error?.detail) {
          alert(result.error.detail);
        }
      }
    } catch (error) {
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
  };

  const handleProductClick = () => {
    navigate(`/producto/${product.id}`);
  };

  const hasStock = product.stock && product.stock > 0;
  const isActive = product.activo !== false;

  return (
    <>
      <Card
        className="group relative overflow-hidden border-0 shadow-md transition-all duration-300 cursor-pointer flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleProductClick}
        style={{
          background: "#fff",
          boxShadow: isHovered
            ? "0 8px 32px 0 rgba(77, 100, 141, 0.18)"
            : "0 2px 8px 0 rgba(40, 54, 85, 0.08)",
          height: "100%",
          width: "100%",
        }}
      >
        {isOnSale && (
          <div className="display absolute top-2 left-2 z-20">
            <div
              className="rounded-full text-white font-bold flex items-center gap-1 shadow-lg"
              style={{
                backgroundColor: "var(--color-life-blueberry)",
                color: "#FFFFFF",
                padding: isMobile ? "4px 8px" : "6px 12px",
                fontSize: isMobile ? "10px" : "12px",
              }}
            >
              <Tag className={isMobile ? "h-2 w-2" : "h-3 w-3"} />
              🔥 -
              {product.porcentaje_descuento ||
                Math.round(
                  ((originalPrice - displayPrice) / originalPrice) * 100
                )}
              %
            </div>
          </div>
        )}

        <CardContent className="p-0 flex flex-col h-full">
          <div
            className="relative overflow-hidden bg-white p-3 flex items-center justify-center"
            style={{
              height: isMobile ? "170px" : isTablet ? "190px" : "210px",
            }}
          >
            <img
              src={product.imagen || "/placeholder-product.jpg"}
              alt={product.nombre || "Producto"}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.src = "/placeholder-product.jpg";
              }}
            />

            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
                !isMobile && isHovered ? "opacity-100" : "opacity-0"
              } ${isMobile ? "hidden" : ""}`}
            >
              <div className="absolute bottom-4 left-4 right-4">
                <Button
                  className="w-full font-bold"
                  style={{
                    background: hasStock && isActive ? "var(--color-life-accent)" : "var(--color-life-blueberry)",
                    color: "#000000",
                    opacity: isAddingToCart ? 0.6 : 1,
                  }}
                  onClick={handleAddToCart}
                  disabled={!hasStock || !isActive || isAddingToCart}
                >
                  <ShoppingCart
                    className="h-4 w-4 mr-2"
                    style={{ color: "#000000" }}
                  />
                  {isAddingToCart
                    ? "Agregando..."
                    : hasStock && isActive
                    ? "Agregar al Carrito"
                    : "Agotado"}
                </Button>
              </div>
            </div>

            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
              <WishlistButton
                isWishlisted={isWishlisted}
                isToggling={isTogglingWishlist}
                onClick={handleWishlistToggle}
                disabled={isTogglingWishlist}
                isMobile={isMobile}
                color={isWishlisted ? "var(--color-life-blueberry)" : "var(--color-life-indigo)"}
                iconColor={isWishlisted ? "var(--color-life-blueberry)" : "var(--color-life-indigo)"}
              />
            </div>
          </div>

          <div
            className="flex flex-col flex-1 justify-between"
            style={{
              padding: isMobile ? "10px" : "12px",
              color: "#283655",
            }}
          >
            <div>
              {/* Etiquetas Duales: Película / Saga y Rango de Edad */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5 min-h-[22px]">
                {/* Etiqueta Película / Saga */}
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 shadow-xs max-w-[150px] truncate"
                  title={`Película / Saga: ${peliculaSaga}`}
                >
                  <Film className="h-3 w-3 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{peliculaSaga}</span>
                </span>

                {/* Etiqueta Rango de Edad */}
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs flex-shrink-0"
                  title={`Rango de edad: ${edad}`}
                >
                  <Baby className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                  <span>{edad}</span>
                </span>
              </div>

              {/* Título del producto con altura estandarizada y line-clamp */}
              <h3
                className="font-bold group-hover:text-blue-700 transition-colors mb-2 text-slate-900 line-clamp-2"
                style={{
                  minHeight: isMobile ? "34px" : "38px",
                  maxHeight: isMobile ? "34px" : "38px",
                  lineHeight: "1.25",
                  fontSize: isMobile ? "13px" : isTablet ? "13.5px" : "14px",
                }}
                title={product.nombre}
              >
                {product.nombre}
              </h3>
            </div>

            {/* Bloque Inferior: Stock, Precio y Botón alineados */}
            <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col justify-end">
              {/* Stock Badge */}
              <div className="flex items-center justify-center mb-2 min-h-[22px]">
                {product.stock === 0 ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                    Sin stock
                  </span>
                ) : product.stock < 5 ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center gap-1">
                    🔥 ¡Pocas unidades! ({product.stock})
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Disponible
                  </span>
                )}
              </div>

              {/* Precio */}
              <div className="flex flex-col items-center justify-center gap-0.5 mb-2 min-h-[42px]">
                <span
                  className="font-extrabold text-center leading-tight text-slate-900"
                  style={{
                    fontSize: isMobile ? "16px" : isTablet ? "17px" : "18px",
                  }}
                >
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && originalPrice && (
                  <span className="line-through text-slate-400 text-xs text-center">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </div>

              {/* Botón de compra en móvil/tablet */}
              <div
                className="lg:hidden w-full"
                style={{ height: isMobile ? "36px" : "40px" }}
              >
                <Button
                  className="w-full h-full font-bold shadow-sm"
                  style={{
                    background: hasStock && isActive ? "var(--color-life-accent)" : "#cbd5e1",
                    color: hasStock && isActive ? "#000000" : "#64748b",
                    opacity: isAddingToCart ? 0.6 : 1,
                    padding: isMobile ? "6px 12px" : "8px 14px",
                    fontSize: isMobile ? "12px" : "13px",
                  }}
                  onClick={handleAddToCart}
                  disabled={!hasStock || !isActive || isAddingToCart}
                >
                  <ShoppingCart
                    className={isMobile ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"}
                  />
                  {isAddingToCart
                    ? "Agregando..."
                    : hasStock && isActive
                    ? "Agregar"
                    : "Agotado"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message={authModalMessage}
      />
    </>
  );
};

export default ProductCard;
