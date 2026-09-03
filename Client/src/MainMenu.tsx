import React, { FC, useEffect, useState } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';

interface MainMenuProps {
  onNavigate?: (page: string) => void;
}

export const MainMenu: FC<MainMenuProps> = ({ onNavigate }) => {
  // Yüksek DPI (Retina/Mobil) ekranlarda canvas bulanıklığını ve boyut kaymasını önlemek için devicePixelRatio takibi
  const [dpr, setDpr] = useState<number>(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDpr(window.devicePixelRatio || 1);
    }
  }, []);

  const { unityProvider, sendMessage, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl: '/unity/Build.loader.js',
    dataUrl: '/unity/Build.data',
    frameworkUrl: '/unity/Build.framework.js',
    codeUrl: '/unity/Build.wasm',
  });

  const handleStartGame = (mode: string): void => {
    if (isLoaded) {
      // Unity tarafındaki GameManager objesine bağlı StartGameMode metodunu çağırır
      sendMessage('GameManager', 'StartGameMode', mode);
      if (onNavigate) onNavigate('GAME_HUD');
    } else {
      console.warn('Unity motoru henüz yüklenmedi.');
    }
  };

  return (
    /* 1. Dış Arka Plan (Masaüstünde ve geniş ekranlarda boşlukları şık kapatmak için) */
    <div className="w-screen h-screen bg-[#0a1710] flex items-center justify-center overflow-hidden select-none">

      {/* 2. 9:16 Sabit Oranlı Ana Kapsayıcı */}
      <div className="relative h-full w-auto aspect-[9/16] max-w-full max-h-full bg-[#173325] shadow-2xl flex flex-col justify-between overflow-hidden">

        {/* Katman 1: Unity WebGL Canvas */}
        <div className="absolute inset-0 z-0 flex items-center justify-center w-full h-full">
          <Unity
            unityProvider={unityProvider}
            style={{ width: '100%', height: '100%' }}
            devicePixelRatio={dpr}
          />
        </div>

        {/* Katman 2: Unity Yükleniyor (Loading) Ekranı */}
        {!isLoaded && (
          <div className="absolute inset-0 z-20 bg-[#173325] flex flex-col items-center justify-center gap-4 p-6">
            <div className="text-white text-xl font-bold">Yükleniyor...</div>
            <div className="w-48 h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-[#00E5FF] rounded-full transition-all duration-200"
                style={{ width: `${Math.round(loadingProgression * 100)}%` }}
              />
            </div>
            <span className="text-white/70 text-sm">{Math.round(loadingProgression * 100)}%</span>
          </div>
        )}

        {/* Katman 3: UI Overlay (9:16 Kutu İçerisinde Hizalı) */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 pointer-events-none">

          {/* Üst İkonlar ve Başlık */}
          <div className="w-full flex justify-between items-start pt-4 pointer-events-auto">
            <button
              aria-label="Market"
              className="w-14 h-14 bg-white/90 text-black text-2xl rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              🛒
            </button>

            <div className="text-center drop-shadow-md">
              <h1 className="font-batangas text-4xl font-bold text-white tracking-widest text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Timur</h1>
              <h1 className="text-white text-3xl font-extrabold leading-tight">Satrancı</h1>
            </div>

            <button
              aria-label="Ayarlar"
              className="w-14 h-14 bg-white/90 text-black text-2xl rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              ⚙️
            </button>
          </div>

          {/* Alt Butonlar */}
          <div className="w-full flex flex-col gap-4 mb-4 pointer-events-auto">
            <button
              onClick={() => handleStartGame('vsBot')}
              disabled={!isLoaded}
              className="w-full py-4 bg-[#00E5FF] hover:bg-[#00b8cc] text-black font-extrabold text-2xl rounded-2xl shadow-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Oyna
            </button>
            <button
              onClick={() => handleStartGame('learn')}
              disabled={!isLoaded}
              className="w-full py-4 bg-[#00E5FF] hover:bg-[#00b8cc] text-black font-extrabold text-2xl rounded-2xl shadow-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Öğren
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};