import React, { FC, useEffect } from 'react';
const logoImg = '/images/logo.png';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: FC<SplashScreenProps> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="mobile-screen flex flex-col items-center justify-center bg-[#1a4228] select-none">
      {/* Arka plan parlaması */}
      <div className="absolute w-72 h-72 rounded-full bg-[rgba(0,212,196,0.06)] blur-3xl pointer-events-none" />

      {/* Logo + Başlık */}
      <div className="flex flex-col items-center gap-5 animate-mobile-fadein relative z-10">
        <img
          src={logoImg}
          alt="Timur Satrancı Logo"
          className="w-52 h-52 object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] animate-float"
        />
        <h1 className="font-batangas text-4xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          Timur&nbsp; Satrancı
        </h1>
      </div>

      {/* Yükleme noktaları */}
      <div className="absolute bottom-16 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#00d4c4]"
            style={{ animation: `mobilePulse 1.2s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
};
