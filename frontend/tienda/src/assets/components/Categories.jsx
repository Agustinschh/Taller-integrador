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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap md:justify-center gap-2 sm:gap-3.5 md:gap-5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleCategoryClick(cat.slug)}
          className="group relative flex flex-col items-center justify-center 
                     w-full md:w-36 lg:w-40 xl:w-44 
                     aspect-square rounded-2xl 
                     p-2 sm:p-4
                     transition-all duration-300 
                     hover:scale-105 cursor-pointer
                     shadow-[0_2px_8px_0_#D0E1F9] 
                     hover:shadow-[0_12px_20px_0_#D0E1F9]"
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
                className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 
                           object-cover rounded-full mb-1 sm:mb-2 
                           transition-transform duration-300 group-hover:-translate-y-1"
              />
            )}
            
            <h3 className="text-xs sm:text-sm md:text-base font-bold 
                           text-center leading-tight px-1 text-[#D0E1F9] w-full truncate">
              {cat.alt}
            </h3>
          </div>
        </button>
      ))}
    </div>
  );
};

export default Categories;