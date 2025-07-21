import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "./Experience";
import { ChatInterface } from "./ChatInterface";
import MenuBar from "./layout/MenuBar";

export const UI = () => {
  const [isMicAlwaysOn, setIsMicAlwaysOn] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);

  useEffect(() => {
    const savedMicSetting = localStorage.getItem('micAlwaysOn');
    if (savedMicSetting) {
      setIsMicAlwaysOn(JSON.parse(savedMicSetting));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('micAlwaysOn', JSON.stringify(isMicAlwaysOn));
  }, [isMicAlwaysOn]);

  const toggleChatMaximize = () => {
    setIsChatMaximized((prev) => !prev);
  };

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
        <div className="absolute top-0 right-0 p-6 z-20 ">
          <MenuBar />
        </div>
        <Canvas shadows camera={{ position: [80, 80, 50], fov: 80 }} className="h-full">
          <Suspense>
            <Experience />
          </Suspense>
        </Canvas>
        <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-purple-900/90 via-blue-900/80 to-indigo-800/70 backdrop-blur-md rounded-t-lg shadow-2xl border-t border-purple-500/30 transition-all duration-300 ${
          isChatMaximized ? 'p-4 h-auto max-h-[80vh] overflow-hidden' : 'p-0 h-16 overflow-hidden'
        }`}>
          <ChatInterface 
            micAlwaysOn={isMicAlwaysOn} 
            minimized={!isChatMaximized}
            onMaximize={toggleChatMaximize}
          />
          {isChatMaximized && (
            <button 
              onClick={toggleChatMaximize} 
              className="absolute top-2 right-2 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              title="Minimize Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 10l-5 5-5-5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
