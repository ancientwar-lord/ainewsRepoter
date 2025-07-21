import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "./Experience";

export const UI = () => {

  return (
    <section className="flex flex-col-reverse lg:flex-row h-full w-full"> 
      <div className="flex-1 bg-gradient-to-br from-purple-950 via-blue-900 via-indigo-800 to-black relative transition-all duration-300">
        <div className="absolute top-0 left-0 flex items-center p-4">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="transition-all duration-300 w-12 h-12 object-contain"
          />
          <h2 className="ml-2 text-xl font-bold text-white tracking-wide">LotusAi</h2>
        </div>
        <Canvas shadows camera={{ position: [80, 80, 50], fov: 80 }} className="h-full">
          <Suspense>
            <Experience />
          </Suspense>
        </Canvas>
      </div>
    </section>
  );
};
