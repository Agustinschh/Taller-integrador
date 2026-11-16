import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Baby, Smile, Compass, Cpu, Trophy } from 'lucide-react';

const AGE_RANGES = [
  {
    id: '0-3',
    range: '0 - 3 años',
    title: 'Primeros Pasos',
    desc: 'Piezas grandes y seguras para estimular la creatividad temprana',
    color: 'from-amber-400 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    icon: Baby,
    query: '0-3'
  },
  {
    id: '4-6',
    range: '4 - 6 años',
    title: 'Constructores Junior',
    desc: 'Sets temáticos sencillos, colores vivos y personajes divertidos',
    color: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
    icon: Smile,
    query: '4-6'
  },
  {
    id: '7-11',
    range: '7 - 11 años',
    title: 'Aventura & Acción',
    desc: 'Retos intermedios, sagas épicas, vehículos y mundos fantásticos',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    icon: Compass,
    query: '7-11'
  },
  {
    id: '12-17',
    range: '12 - 17 años',
    title: 'Técnico & Desafío',
    desc: 'Mecanismos complejos, ingeniería, réplicas a escala y electrónica',
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    icon: Cpu,
    query: '12-17'
  },
  {
    id: '18+',
    range: '18+ Adultos',
    title: 'Coleccionistas & Master',
    desc: 'Sets icónicos de exhibición, arquitectura y diseño de alta gama',
    color: 'from-slate-800 to-black',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-900',
    icon: Trophy,
    query: '18+'
  }
];

export default function AgeCategories() {
  const navigate = useNavigate();

  const handleSelectAge = (range) => {
    navigate(`/TodosProductos?categoria=${encodeURIComponent(range.range)}`);
  };

  return (
    <section className="py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Descubre por Etapa
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Comprar por Edad
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md">
          Encuentra el set perfecto diseñado específicamente para cada nivel de destreza y edad.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
        {AGE_RANGES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => handleSelectAge(item)}
              className={`group relative overflow-hidden rounded-2xl border ${item.borderColor} ${item.bgColor} p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer flex flex-col justify-between`}
            >
              {/* Decorative background blob */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/40 blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div>
                {/* Header Icon + Age badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full bg-white shadow-sm border ${item.borderColor} ${item.textColor}`}>
                    {item.range}
                  </span>
                </div>

                <h3 className={`text-lg font-bold mb-1.5 ${item.textColor} group-hover:text-blue-700 transition-colors`}>
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Action arrow */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                <span>Ver sets</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
