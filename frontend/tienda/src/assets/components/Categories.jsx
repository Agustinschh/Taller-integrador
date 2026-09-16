import React from "react";
import { useNavigate } from "react-router-dom";


import bgImg from "../img/cat.png";  

const categories = [
  { id: 1, alt: "Star Wars", slug: "star-wars" },
  { id: 2, alt: "Technic", slug: "technic" },
  { id: 3, alt: "Harry Potter", slug: "harry-potter" },
  { id: 4, alt: "City", slug: "city" },
  { id: 5, alt: "Marvel", slug: "marvel" },
  { id: 6, alt: "Creator", slug: "creator" },
  { id: 7, alt: "Speed Champions", slug: "racers" },
];

const Categories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categorySlug) => {
    navigate(`/categoria/${categorySlug}`);
  };

 return (
  <div className="container mx-auto px-2 py-4">
     <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-4 md:gap-6 xl:gap-8">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleCategoryClick(cat.slug)}
            className="group relative flex flex-col items-center justify-center 
                     w-full sm:w-32 md:w-40 xl:w-48 
                     aspect-square rounded-xl 
                     p-1 sm:p-4
                     transition-all duration-300 
                     hover:scale-105 cursor-pointer
                     shadow-[0_2px_8px_0_#D0E1F9] 
                     hover:shadow-[0_15px_15px_0_#D0E1F9]"
          style={{
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="relative z-10 flex flex-col items-center w-full">
            {cat.img && (
              <img
                src={cat.img}
                alt={cat.alt}
                className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 xl:w-20 xl:h-20 
                           object-cover rounded-full mb-1 sm:mb-4 
                           transition-transform duration-300 group-hover:-translate-y-1"
              />
            )}
            
            {/* Texto ajustado para móvil */}
            <h3 className="text-xs sm:text-sm md:text-base xl:text-lg font-semibold 
                           text-center leading-tight px-1 text-[#D0E1F9] w-full truncate">
              {cat.alt}
            </h3>
          </div>
        </button>
      ))}
    </div>
  </div>
);
};

export default Categories;