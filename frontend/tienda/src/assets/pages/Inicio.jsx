import AgeCategories from "../components/AgeCategories";
import ProductSlider from "../components/ProductSlider";
import AdvertisementBanner from "../components/AdversisementBanner";
import AdvertisementBanner2 from "../components/AdversisementBanner2";
import ProductCard from "../components/ProductCard";
import React, { useEffect, useState } from "react";
import { HeroSection } from "../components/HeroSection";
import API_BASE_URL from '../../config';

const Inicio = () => {
  const [products, setProducts] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [ofertas, setOfertas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [loadingOfertas, setLoadingOfertas] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/productos/`);
        if (response.ok) {
          const data = await response.json();
          
          const sortedProducts = data.sort((a, b) => 
            new Date(b.creado) - new Date(a.creado)
          );
          setProducts(sortedProducts);
          setDestacados(data.filter(p => p.destacado));
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    const fetchOfertas = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ofertas/`);
        if (response.ok) {
          const data = await response.json();
          const ofertasTransformadas = data.map(oferta => ({
            ...oferta.producto,
            precio_oferta: oferta.precio_con_descuento,
            precio_original: oferta.producto.precio,
            porcentaje_descuento: oferta.porcentaje_descuento,
            en_oferta: true
          }));
          setOfertas(ofertasTransformadas);
        }
      } catch (error) {
      } finally {
        setLoadingOfertas(false);
      }
    };
    
    fetchProducts();
    fetchOfertas();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* HeroSection */}
      <div className="bg-white shadow-xs">
        <HeroSection />
      </div>

      {/* Contenido principal con contenedor responsivo dinámico */}
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-10 space-y-8 sm:space-y-12">
        
        {/* Productos en oferta */}
        {loadingOfertas ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Cargando ofertas especiales...
          </div>
        ) : ofertas.length > 0 ? (
          <div>
            <ProductSlider
              products={ofertas}
              title="🔥 Productos en Oferta"
              maxVisible={4}
              maxTotal={8}
              viewMoreLink="/TodasOfertas"
              viewMoreText="Ver todas las ofertas"
            />
          </div>
        ) : null}

        {/* Productos Destacados */}
        {destacados.length > 0 && (
          <div>
            <ProductSlider
              products={destacados}
              title="⭐ Productos Destacados"
              maxVisible={4}
              maxTotal={8}
              viewMoreLink="/destacados?destacados=true"
              viewMoreText="Ver todos los destacados"
            />
          </div>
        )}

        {/* Banner publicitario */}
        <div className="my-6 sm:my-8 overflow-hidden rounded-2xl shadow-xs">
          <AdvertisementBanner />
        </div>

        {/* Nuevos productos con slider */}
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Cargando nuevos lanzamientos...
          </div>
        ) : (
          <div>
            <ProductSlider 
              products={products}
              title="✨ Nuevos Productos"
              maxVisible={4}
              maxTotal={8}
              viewMoreLink="/TodosProductos"
              viewMoreText="Ver todo el catálogo"
            />
          </div>
        )}

        {/* Apartado de Categoría por Edad */}
        <section className="py-2">
          <AgeCategories />
        </section>

        {/* Botón para ver todos los productos */}
        {products.length > 0 && (
          <div className="text-center pt-2 pb-4">
            <button
              onClick={() => window.location.href = '/TodosProductos'}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-95 shadow-md hover:shadow-lg cursor-pointer text-sm sm:text-base"
              style={{ backgroundColor: '#283655', border: '1px solid #D0E1F9' }}
            >
              Explorar Todo el Catálogo LEGO®
            </button>
          </div>
        )}

        {/* Banner publicitario 2 */}
        <div className="my-6 sm:my-8 overflow-hidden rounded-2xl shadow-xs">
          <AdvertisementBanner2 />
        </div>
        
      </div>
    </div>
  );
};

export default Inicio;