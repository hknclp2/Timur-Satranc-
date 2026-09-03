import React, { FC } from 'react';
import { ShoppingCart, User, Settings } from 'lucide-react';
import { PageState, NotificationType } from '../types';
import logoImg from '../assets/logo.png';
import okulLogo from '../assets/okulLogo.png';
import chessboardImg from '../assets/Board.png';

interface MainMenuPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const MainMenuPage: FC<MainMenuPageProps> = ({ onNavigate, showNotification }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#1a4228] relative overflow-hidden select-none">
      {/* Arka plan gradyanları */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(0,229,255,0.05)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0d2818]/80 to-transparent pointer-events-none" />

      {/* Üst satır: Mağaza & Profil */}
      <div className="flex justify-between items-center px-5 pt-8 relative z-10">
        <button
          id="mobile-shop-btn"
          onClick={() => showNotification('Mağaza yakında açılıyor!', 'info')}
          className="mobile-icon-btn"
          aria-label="Mağaza"
        >
          <ShoppingCart size={24} strokeWidth={2} />
        </button>
        <button
          id="mobile-profile-btn"
          onClick={() => showNotification('Profil yakında açılıyor!', 'info')}
          className="mobile-icon-btn"
          aria-label="Profil"
        >
          <User size={24} strokeWidth={2} />
        </button>
      </div>

      {/* İkinci satır: Logo + Başlık + Ayarlar */}
      <div className="flex items-center justify-between px-5 mt-4 relative z-10">
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-white/20 bg-black/20 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <img src={okulLogo} alt="Logo" className="w-[52px] h-[52px] object-contain" />
        </div>

        <h1 className="font-batangas text-4xl font-extrabold text-white text-center leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] tracking-wide">
          Timur
          <br />
          Satrancı
        </h1>

        <button
          id="mobile-settings-btn"
          onClick={() => showNotification('Ayarlar yakında açılıyor!', 'info')}
          className="mobile-icon-btn"
          aria-label="Ayarlar"
        >
          <Settings size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Satranç tahtası görseli */}
      <div className="flex-1 flex items-center justify-center px-6 py-2 relative z-10">
        <div className="relative w-full max-w-[330px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(0,229,255,0.1)_0%,_transparent_70%)] blur-2xl pointer-events-none" />
          <img
            src={chessboardImg}
            alt="3D Timur Satranç Tahtası"
            className="w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] animate-float relative z-10"
          />
        </div>
      </div>

      {/* Oyna & Öğren butonları */}
      <div className="flex flex-col gap-4 px-7 pb-12 relative z-10">
        <button
          id="mobile-play-btn"
          onClick={() => onNavigate('PLAY_MENU')}
          className="mobile-main-btn"
        >
          <span className="font-batangas text-2xl font-bold">Oyna</span>
        </button>
        <button
          id="mobile-learn-btn"
          onClick={() => onNavigate('LEARN_MENU')}
          className="mobile-main-btn"
        >
          <span className="font-batangas text-2xl font-bold">Öğren</span>
        </button>
      </div>
    </div>
  );
};
