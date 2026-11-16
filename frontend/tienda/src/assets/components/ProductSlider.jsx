import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button.jsx';
import ProductCard from './ProductCard.jsx';

const ProductSlider = ({ 
  products = [], 
  title, 
  maxVisible = 4, 
  maxTotal = 8,
  viewMoreLink = null,
  viewMoreText = "Ver todos"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(maxVisible);
  const navigate = useNavigate();

  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 500) {
        setVisibleCount(1);
      } else if (width < 768) {
        setVisibleCount(2);
      } else if (width < 1100) {
        setVisibleCount(3);
      } else if (width < 1500) {
        setVisibleCount(4);
      } else {
        setVisibleCount(5);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, [maxVisible]);

  const limitedProducts = products.slice(0, maxTotal);
  const totalItemsCount = viewMoreLink ? limitedProducts.length + 1 : limitedProducts.length;
  const totalSlides = Math.ceil(totalItemsCount / visibleCount);

  // Asegurar que currentIndex no se pase si cambia totalSlides
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(totalSlides - 1);
    }
  }, [totalSlides, currentIndex]);

  const nextSlide = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (limitedProducts.length === 0) {
    return (
      <section className="py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4" style={{ color: '#f83258' }}>
          {title}
        </h2>
        <div className="text-center py-6 text-slate-500 text-sm">
          No hay productos disponibles.
        </div>
      </section>
    );
  }

  // Ancho dinámico por tarjeta considerando el gap de 1rem (16px)
  const gapRem = 1;
  const cardWidth = visibleCount === 1 
    ? '100%' 
    : `calc(${100 / visibleCount}% - ${(visibleCount - 1) * gapRem / visibleCount}rem)`;

  return (
    <section className="py-4 sm:py-6 lg:py-8">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>
          {viewMoreLink && (
            <Link
              to={viewMoreLink}
              className="hidden sm:inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors ml-2"
            >
              {viewMoreText}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMoreLink && (
            <Link
              to={viewMoreLink}
              className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              {viewMoreText}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          {totalSlides > 1 && (
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white transition-colors shadow-xs rounded-xl"
                style={{
                  borderColor: currentIndex === 0 ? '#E2E8F0' : '#283655',
                  color: currentIndex === 0 ? '#94A3B8' : '#283655'
                }}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                disabled={currentIndex === totalSlides - 1}
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 bg-white transition-colors shadow-xs rounded-xl"
                style={{
                  borderColor: currentIndex === totalSlides - 1 ? '#E2E8F0' : '#283655',
                  color: currentIndex === totalSlides - 1 ? '#94A3B8' : '#283655'
                }}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden py-1">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            gap: `${gapRem}rem`
          }}
        >
          {limitedProducts.map((product) => (
            <div 
              key={product.id}
              className="flex-shrink-0"
              style={{
                width: cardWidth
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}

          {/* Tarjeta de 'Ver Más' al final del slider */}
          {viewMoreLink && (
            <div 
              className="flex-shrink-0"
              style={{
                width: cardWidth
              }}
            >
              <div 
                onClick={() => navigate(viewMoreLink)}
                className="group h-full min-h-[300px] sm:min-h-[340px] rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-500 bg-gradient-to-b from-blue-50/60 to-indigo-50/50 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:bg-blue-700 transition-all">
                  <Sparkles className="h-7 w-7 animate-pulse" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                  {viewMoreText}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-[200px]">
                  Explora toda la colección completa de {title.toLowerCase()} disponibles.
                </p>
                <span className="inline-flex items-center gap-2 font-bold text-xs sm:text-sm text-white bg-blue-600 px-4 py-2 rounded-xl shadow-xs group-hover:bg-blue-700 transition-all">
                  Ver Colección
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalSlides > 1 && (
        <div className="flex justify-center mt-4 sm:mt-6 gap-1.5">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-6 bg-blue-600' 
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Ir a la página ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductSlider;