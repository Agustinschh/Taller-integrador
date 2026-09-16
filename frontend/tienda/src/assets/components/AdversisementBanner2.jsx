import React, { useState } from 'react';
import { Sparkles, ArrowRight, Package } from 'lucide-react';

const AdvertisementBanner2 = ({ 
  imagePath = "/secreto_lego.jpg",
  alt = "Combos y Packs Especiales Lego",
  link = "/combos",
  className = ""
}) => {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      window.location.href = link;
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const fallbackBanner = () => (
    <div 
      className="w-full h-64 md:h-80 flex items-center justify-center text-white cursor-pointer rounded-2xl shadow-xl p-8"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #0284C7 100%)'
      }}
      onClick={handleClick}
    >
      <div className="text-center max-w-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-slate-900 font-extrabold text-xs mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          PACKS EXCLUSIVOS
        </span>
        <h2 className="text-3xl md:text-5xl font-black mb-3 text-white">
          SUPER COMBOS LEGO®
        </h2>
        <p className="text-slate-200 text-sm md:text-base mb-6">
          Combina tus sagas favoritas y ahorra hasta un 30% en packs especiales.
        </p>
        <button className="px-6 py-3 bg-yellow-400 text-slate-950 font-black rounded-xl hover:bg-yellow-300 transition-colors shadow-lg">
          Ver Todos los Combos →
        </button>
      </div>
    </div>
  );

  return (
    <section className={`py-4 ${className}`}>
      <div 
        className="relative overflow-hidden rounded-2xl shadow-xl cursor-pointer group border border-slate-200"
        onClick={handleClick}
      >
        {imageError ? (
          fallbackBanner()
        ) : (
          <>
            <img
              src={imagePath}
              alt={alt}
              className="w-full h-64 md:h-80 object-cover transition-transform duration-500 group-hover:scale-105"
              onError={handleImageError}
            />

            {/* Dark & Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent flex items-center p-6 sm:p-10 md:p-12">
              <div className="max-w-xl space-y-3 transform transition-transform duration-300 group-hover:translate-x-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs shadow-md">
                  <Package className="h-3.5 w-3.5" />
                  <span>COMBOS & PACKS</span>
                  <span className="opacity-80">• HASTA 30% OFF</span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                  Packs de Castillo & Sagas Especiales
                </h2>

                <p className="text-slate-200 text-xs sm:text-sm md:text-base font-medium line-clamp-2 max-w-md">
                  Lleva sets emblemáticos juntos con descuento automático aplicado al carrito.
                </p>

                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl group-hover:bg-yellow-300 transition-all">
                    <span>Explorar Todos los Combos</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default AdvertisementBanner2;