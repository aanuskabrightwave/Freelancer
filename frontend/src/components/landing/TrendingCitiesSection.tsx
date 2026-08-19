"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const CITIES = [
  {
    name: "Mumbai",
    code: "MUMBAI",
    num: "01",
    image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Delhi",
    code: "DELHI",
    num: "02",
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Bengaluru",
    code: "BENGALURU",
    num: "03",
    image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Hyderabad",
    code: "HYDERABAD",
    num: "04",
    image: "https://images.unsplash.com/photo-1608958415712-4cf012d91986?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Pune",
    code: "PUNE",
    num: "05",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Chennai",
    code: "CHENNAI",
    num: "06",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Kolkata",
    code: "KOLKATA",
    num: "07",
    image: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Ahmedabad",
    code: "AHMEDABAD",
    num: "08",
    image: "https://images.unsplash.com/photo-1601999109332-542b18dbec57?auto=format&fit=crop&w=1200&q=80"
  }
];

export default function TrendingCitiesSection() {
  const [activeCityIdx, setActiveCityIdx] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const moveX = (clientX - innerWidth / 2) / (innerWidth / 2) * 15; // max 15px drift
    const moveY = (clientY - innerHeight / 2) / (innerHeight / 2) * 15;
    setMouseOffset({ x: moveX, y: moveY });
  };

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="py-32 bg-[#0B0C0E] text-white border-t border-white/5 relative z-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        
        {/* Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block">
            05 / CREATIVE HOTSPOTS
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Talent doesn't live<br />in one place.
          </h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Discover editors, filmmakers, photographers and creators working from India's most active creative hubs.
          </p>
        </div>

        {/* Desktop Layout (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-12 items-center pt-8">
          
          {/* Left Column: Cities List */}
          <div className="col-span-6 flex flex-col space-y-3">
            {CITIES.map((city, idx) => (
              <div
                key={city.code}
                onMouseEnter={() => setActiveCityIdx(idx)}
                className={`py-3 border-b border-white/5 flex items-center justify-between group transition-all duration-300 ${
                  activeCityIdx === idx 
                    ? "border-primary pl-4" 
                    : "opacity-45 hover:opacity-80"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-bold tracking-widest">{city.num}</span>
                  <Link
                    href={`/freelancers?city=${city.name}`}
                    className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase transition-all duration-300 ${
                      activeCityIdx === idx ? "text-primary scale-102" : "text-white"
                    }`}
                  >
                    {city.name}
                  </Link>
                </div>
                <Link
                  href={`/freelancers?city=${city.name}`}
                  className={`text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 transition-all duration-300 ${
                    activeCityIdx === idx ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  }`}
                >
                  <span>Explore</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Right Column: Dynamic Background Frame with Parallax */}
          <div className="col-span-6 h-[550px] relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            {CITIES.map((city, idx) => (
              <div
                key={city.code}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out-quint ${
                  activeCityIdx === idx ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
                style={{
                  transform: `translate(${activeCityIdx === idx ? mouseOffset.x : 0}px, ${activeCityIdx === idx ? mouseOffset.y : 0}px) scale(1.05)`,
                  transition: activeCityIdx === idx ? "none" : "opacity 1000ms ease-out"
                }}
              >
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover filter brightness-[0.8] saturate-[0.85] contrast-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 space-y-1">
                  <span className="text-[10px] font-black tracking-[0.25em] text-primary uppercase block">
                    FEATURED CITY
                  </span>
                  <h4 className="text-3xl font-black uppercase tracking-tight text-white">{city.name}</h4>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Mobile Swipeable City Cards (Hidden on Desktop) */}
        <div className="md:hidden flex gap-6 overflow-x-auto pb-6 scrollbar-hide select-none snap-x snap-mandatory pr-6">
          {CITIES.map((city) => (
            <Link
              key={city.code}
              href={`/freelancers?city=${city.name}`}
              className="flex-shrink-0 w-[80vw] aspect-[4/5] relative bg-slate-900 rounded-2xl overflow-hidden border border-white/5 snap-start shadow-xl"
            >
              <img
                src={city.image}
                alt={city.name}
                className="absolute inset-0 w-full h-full object-cover filter brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/95 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 space-y-1">
                <span className="text-[9px] font-black tracking-widest text-primary uppercase block">{city.num}</span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-white">{city.name}</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">EXPLORE CITY &rarr;</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
