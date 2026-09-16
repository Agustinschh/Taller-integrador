import { useState, useEffect, useRef } from "react";
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { ImageWithFallback } from './figma/ImageWithFallback';
import blkImge from '../img/banner/lego_star_wars.jpg';
import pnkImg from '../img/banner/lego_collector.jpg';
import blImg from '../img/banner/lego_technic.jpg';
import heroBg from '../img/hero_bg_gsap.jpg';
import { Sparkles, ChevronLeft, ChevronRight, Compass, ShoppingBag, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const slides = [
  {
    badge: "Nuevos Lanzamientos",
    badgeColor: "#FFCF00",
    badgeTextColor: "#000000",
    title: (
      <>
        <span className="block font-extrabold text-white drop-shadow-md">Construye tu</span>
        <span className="block font-black text-[#FFCF00] drop-shadow-lg">Propia Aventura</span>
      </>
    ),
    description: "Descubre los nuevos sets de Lego oficiales y dale rienda suelta a tu imaginación con personajes y piezas únicas.",
    image: blkImge,
    tag: "Colección 2026",
    ctaPrimary: "Explorar Sets",
    ctaPrimaryLink: "/TodosProductos",
    ctaSecondary: "Ver Ofertas",
    ctaSecondaryLink: "/TodasOfertas"
  },
  {
    badge: "Combos & Packs Especiales",
    badgeColor: "#E3000B",
    badgeTextColor: "#FFFFFF",
    title: (
      <>
        <span className="block font-extrabold text-white drop-shadow-md">Combos Exclusivos</span>
        <span className="block font-black text-[#FFCF00] drop-shadow-lg">Ahorra en Grande</span>
      </>
    ),
    description: "Lleva tus sets de castillos y sagas favoritas en paquetes especiales con descuentos de hasta el 30% OFF.",
    image: pnkImg,
    tag: "Hasta 30% OFF",
    ctaPrimary: "Ver Combos",
    ctaPrimaryLink: "/combos",
    ctaSecondary: "Explorar Packs",
    ctaSecondaryLink: "/combos"
  },
  {
    badge: "Desafío Technic & Icons",
    badgeColor: "#006CB7",
    badgeTextColor: "#FFFFFF",
    title: (
      <>
        <span className="block font-extrabold text-white drop-shadow-md">Retos para</span>
        <span className="block font-black text-[#FFCF00] drop-shadow-lg">Constructores Pro</span>
      </>
    ),
    description: "Modelos avanzados de ingeniería con miles de piezas, mecanismos funcionales y detalles hiperrealistas.",
    image: blImg,
    tag: "Nivel Experto",
    ctaPrimary: "Ver Technic",
    ctaPrimaryLink: "/categoria/technic",
    ctaSecondary: "Todos los Sets",
    ctaSecondaryLink: "/TodosProductos"
  }
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const contentCardRef = useRef(null);
  const imageContainerRef = useRef(null);
  const cursorFollowerRef = useRef(null);
  const floatingBlock1Ref = useRef(null);
  const floatingBlock2Ref = useRef(null);
  const floatingBlock3Ref = useRef(null);
  const titleRef = useRef(null);
  const badgeRef = useRef(null);
  const descRef = useRef(null);
  const buttonsRef = useRef(null);

  // quickTo setters for ultra-smooth 60fps cursor parallax
  const xQuickBg = useRef(null);
  const yQuickBg = useRef(null);
  const xQuickCard = useRef(null);
  const yQuickCard = useRef(null);
  const rotXQuick = useRef(null);
  const rotYQuick = useRef(null);
  const xQuickImg = useRef(null);
  const yQuickImg = useRef(null);
  const xQuickCursor = useRef(null);
  const yQuickCursor = useRef(null);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index) => setCurrent(index);

  // Initialize GSAP quickTo setters and continuous floating animations
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup quickTo for smooth physics lerping
    if (bgRef.current) {
      xQuickBg.current = gsap.quickTo(bgRef.current, "x", { duration: 0.8, ease: "power2.out" });
      yQuickBg.current = gsap.quickTo(bgRef.current, "y", { duration: 0.8, ease: "power2.out" });
    }
    if (contentCardRef.current) {
      xQuickCard.current = gsap.quickTo(contentCardRef.current, "x", { duration: 0.6, ease: "power2.out" });
      yQuickCard.current = gsap.quickTo(contentCardRef.current, "y", { duration: 0.6, ease: "power2.out" });
      rotXQuick.current = gsap.quickTo(contentCardRef.current, "rotationX", { duration: 0.6, ease: "power2.out" });
      rotYQuick.current = gsap.quickTo(contentCardRef.current, "rotationY", { duration: 0.6, ease: "power2.out" });
    }
    if (imageContainerRef.current) {
      xQuickImg.current = gsap.quickTo(imageContainerRef.current, "x", { duration: 0.7, ease: "power2.out" });
      yQuickImg.current = gsap.quickTo(imageContainerRef.current, "y", { duration: 0.7, ease: "power2.out" });
    }
    if (cursorFollowerRef.current) {
      xQuickCursor.current = gsap.quickTo(cursorFollowerRef.current, "x", { duration: 0.25, ease: "power2.out" });
      yQuickCursor.current = gsap.quickTo(cursorFollowerRef.current, "y", { duration: 0.25, ease: "power2.out" });
    }

    // Continuous floating animations for 3D Lego blocks
    const float1 = gsap.to(floatingBlock1Ref.current, {
      y: "-=18",
      rotation: "+=8",
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    const float2 = gsap.to(floatingBlock2Ref.current, {
      y: "+=15",
      rotation: "-=6",
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    const float3 = gsap.to(floatingBlock3Ref.current, {
      y: "-=12",
      x: "+=8",
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    return () => {
      float1.kill();
      float2.kill();
      float3.kill();
    };
  }, []);

  // Slide transition animation with GSAP
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: -20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5 }
      )
      .fromTo(
        titleRef.current,
        { opacity: 0, y: 30, skewY: 2 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.6 },
        "-=0.3"
      )
      .fromTo(
        descRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.3"
      )
      .fromTo(
        buttonsRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5 },
        "-=0.3"
      )
      .fromTo(
        imageContainerRef.current,
        { opacity: 0, scale: 0.88, rotateZ: -3 },
        { opacity: 1, scale: 1, rotateZ: 0, duration: 0.7, ease: "back.out(1.4)" },
        "-=0.5"
      );
    }, containerRef);

    return () => ctx.revert();
  }, [current]);

  // Autoplay timer
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [current, isAutoPlaying]);

  // Mouse move handler for interactive cursor following & 3D parallax
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Normalized coordinates (-1 to 1)
    const normX = (mouseX / rect.width - 0.5) * 2;
    const normY = (mouseY / rect.height - 0.5) * 2;

    // Update cursor follower position
    if (xQuickCursor.current && yQuickCursor.current) {
      xQuickCursor.current(mouseX);
      yQuickCursor.current(mouseY);
    }

    // Parallax background (moves opposite to cursor)
    if (xQuickBg.current && yQuickBg.current) {
      xQuickBg.current(-normX * 24);
      yQuickBg.current(-normY * 18);
    }

    // 3D Card tilt and shift
    if (xQuickCard.current && yQuickCard.current) {
      xQuickCard.current(normX * 14);
      yQuickCard.current(normY * 10);
      rotXQuick.current(-normY * 6);
      rotYQuick.current(normX * 8);
    }

    // Showcase image parallax (moves slightly more for depth)
    if (xQuickImg.current && yQuickImg.current) {
      xQuickImg.current(normX * 22);
      yQuickImg.current(normY * 16);
    }
  };

  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
    if (cursorFollowerRef.current) {
      gsap.to(cursorFollowerRef.current, { opacity: 1, scale: 1, duration: 0.3 });
    }
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
    if (cursorFollowerRef.current) {
      gsap.to(cursorFollowerRef.current, { opacity: 0, scale: 0.5, duration: 0.3 });
    }
    // Reset positions smoothly
    if (xQuickBg.current) xQuickBg.current(0);
    if (yQuickBg.current) yQuickBg.current(0);
    if (xQuickCard.current) {
      xQuickCard.current(0);
      yQuickCard.current(0);
      rotXQuick.current(0);
      rotYQuick.current(0);
    }
    if (xQuickImg.current) {
      xQuickImg.current(0);
      yQuickImg.current(0);
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden cursor-default select-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1200px',
        backgroundColor: '#006CB7'
      }}
    >
      {/* Interactive Cursor Spotlight Follower (GSAP powered) */}
      <div
        ref={cursorFollowerRef}
        className="pointer-events-none absolute -top-32 -left-32 w-64 h-64 rounded-full mix-blend-screen opacity-0 z-20 transition-opacity"
        style={{
          background: 'radial-gradient(circle, rgba(255, 207, 0, 0.45) 0%, rgba(227, 0, 11, 0.2) 45%, rgba(0, 108, 183, 0) 70%)',
          filter: 'blur(16px)',
          willChange: 'transform'
        }}
      />

      {/* Background layer with authentic Lego minifigures and bricks */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-[110%] h-[110%] -top-[5%] -left-[5%] bg-cover bg-center transition-transform"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundPosition: 'center 40%',
          willChange: 'transform'
        }}
      />

      {/* High-contrast multi-layer gradient overlays */}
      <div 
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(105deg, rgba(0, 108, 183, 0.94) 0%, rgba(0, 40, 80, 0.88) 50%, rgba(0, 0, 0, 0.75) 100%)'
        }}
      />
      
      {/* Top and bottom subtle Lego color accent strips */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-30 flex">
        <div className="w-1/3 bg-[#FFCF00]" />
        <div className="w-1/3 bg-[#E3000B]" />
        <div className="w-1/3 bg-[#006CB7]" />
      </div>

      {/* Floating 3D decorative Lego blocks (GSAP parallax + continuous floating) */}
      <div
        ref={floatingBlock1Ref}
        className="hidden lg:block absolute top-12 left-10 z-10 pointer-events-none"
      >
        <div className="w-12 h-12 rounded-lg bg-[#FFCF00] shadow-2xl border-2 border-yellow-300 flex items-center justify-center transform -rotate-12 opacity-85">
          <div className="w-4 h-4 rounded-full bg-yellow-600/30 shadow-inner" />
        </div>
      </div>

      <div
        ref={floatingBlock2Ref}
        className="hidden lg:block absolute bottom-16 left-1/3 z-10 pointer-events-none"
      >
        <div className="w-10 h-10 rounded-lg bg-[#E3000B] shadow-2xl border-2 border-red-400 flex items-center justify-center transform rotate-45 opacity-80">
          <div className="w-3.5 h-3.5 rounded-full bg-red-900/30 shadow-inner" />
        </div>
      </div>

      <div
        ref={floatingBlock3Ref}
        className="hidden lg:block absolute top-20 right-1/4 z-10 pointer-events-none"
      >
        <div className="w-11 h-11 rounded-lg bg-[#006CB7] shadow-2xl border-2 border-blue-400 flex items-center justify-center transform rotate-12 opacity-85">
          <div className="w-4 h-4 rounded-full bg-blue-900/40 shadow-inner" />
        </div>
      </div>

      {/* Main hero content container */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-16 relative z-10 min-h-[460px] sm:min-h-[520px] md:min-h-[560px] flex items-center">
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center w-full">
          
          {/* Left Text and CTA Column (Interactive 3D tilt with GSAP) */}
          <div
            ref={contentCardRef}
            className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 sm:space-y-6"
            style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
          >
            {/* Badge */}
            <div ref={badgeRef}>
              <div 
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-md border"
                style={{
                  backgroundColor: slides[current].badgeColor,
                  color: slides[current].badgeTextColor,
                  borderColor: 'rgba(255, 255, 255, 0.4)'
                }}
              >
                <Sparkles className="h-4 w-4" />
                <span>{slides[current].badge}</span>
                <span className="opacity-60 text-xs">• {slides[current].tag}</span>
              </div>
            </div>

            {/* Title */}
            <div ref={titleRef}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                {slides[current].title}
              </h1>
            </div>

            {/* Description */}
            <div ref={descRef}>
              <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-xl font-normal leading-relaxed drop-shadow">
                {slides[current].description}
              </p>
            </div>

            {/* Action Buttons */}
            <div
              ref={buttonsRef}
              className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto pt-2"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto font-bold px-7 py-3.5 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-base"
                style={{
                  backgroundColor: '#FFCF00',
                  color: '#000000',
                  border: '2px solid #FFCF00'
                }}
                onClick={() => window.location.href = (slides[current].ctaPrimaryLink || '/TodosProductos')}
              >
                <ShoppingBag className="h-5 w-5" />
                {slides[current].ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                className="w-full sm:w-auto font-bold px-7 py-3.5 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-base cursor-pointer"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  border: '2px solid #FFFFFF'
                }}
                onClick={() => window.location.href = (slides[current].ctaSecondaryLink || '/TodasOfertas')}
              >
                <Compass className="h-5 w-5 text-[#E3000B]" />
                {slides[current].ctaSecondary}
              </Button>
            </div>

            {/* Carousel navigation dots */}
            <div className="flex items-center gap-2.5 pt-4">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    current === idx 
                      ? 'w-8 bg-[#FFCF00] shadow-md' 
                      : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Ir al slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Showcase Column (Product with interactive depth & 3D card) */}
          <div className="lg:col-span-5 hidden lg:flex justify-center items-center">
            <div
              ref={imageContainerRef}
              className="relative w-full max-w-md"
              style={{ willChange: 'transform' }}
            >
              {/* Glowing backdrop card */}
              <div 
                className="absolute inset-0 rounded-3xl transform rotate-3 scale-95 opacity-50 blur-xl"
                style={{
                  background: 'radial-gradient(circle, #FFCF00 0%, #E3000B 60%, transparent 80%)'
                }}
              />

              {/* Glassmorphic showcase container */}
              <div className="relative rounded-3xl p-6 backdrop-blur-md bg-white/10 border border-white/25 shadow-2xl overflow-hidden group">
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-[#E3000B] text-white font-bold px-3 py-1 text-xs shadow-md border-0">
                    Oficial Lego®
                  </Badge>
                </div>

                <div className="w-full h-80 sm:h-96 flex items-center justify-center p-4">
                  <ImageWithFallback
                    src={slides[current].image}
                    alt={`Set ${current + 1}`}
                    className="w-full h-full object-contain filter drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Bottom interactive indicator */}
                <div className="mt-2 flex items-center justify-between text-xs text-white/80 font-medium px-2">
                  <span>Desliza o haz clic para explorar</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevSlide}
                      className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}