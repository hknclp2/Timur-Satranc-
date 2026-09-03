import React, { useState, useEffect } from 'react';
import { Unity } from 'react-unity-webgl';
import { useUnityBridge } from './hooks/useUnityBridge';
import { PageState, GameMode, Notification, NotificationType } from './types';

// Bileşenler
import { SplashScreen } from './components/SplashScreen';
import { MainMenuPage } from './components/MainMenuPage';
import { PlayMenuPage } from './components/PlayMenuPage';
import { BotSelectPage } from './components/BotSelectPage';
import { LearnMenuPage } from './components/LearnMenuPage';
import { RoadmapPage } from './components/RoadmapPage';
import { Lesson1Page } from './components/Lesson1Page';
import { RulesPage, PieceData } from './components/RulesPage';
import { GameHUD } from './components/GameHUD';
import { LoadingScreen } from './components/LoadingScreen';
import { ToastNotification } from './components/ToastNotification';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageState>('SPLASH');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dpr, setDpr] = useState<number>(1);

  // Öğren & Kurallar alt durumları
  const [slideIdx, setSlideIdx] = useState<number>(0);
  const [rulesTab, setRulesTab] = useState<'pieces' | 'rules'>('pieces');
  const [selectedPiece, setSelectedPiece] = useState<PieceData | null>(null);

  // Unity Bridge Hook
  const {
    unityProvider,
    sendMessage,
    isLoaded,
    loadingProgression,
    isDemoMode,
    startGame,
    exitGame,
  } = useUnityBridge();

  // DPI takibi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDpr(window.devicePixelRatio || 1);
    }
  }, []);

  // Bildirim tetikleyici
  const showNotification = (message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3800);
  };

  // Oyuna başlama akışı
  const handleStartGameMode = (mode: GameMode) => {
    setActiveGameMode(mode);
    setCurrentPage('GAME_UNITY');

    if (mode) {
      startGame(mode);
      sendMessage('GameManager', 'StartGameMode', mode);
      
      let msg = 'Karşılaşma başlatılıyor...';
      if (mode.startsWith('bot')) {
        msg = 'Yapay zeka (Bot) ile karşılaşma başlatılıyor...';
      } else if (mode.startsWith('coach')) {
        msg = 'Koç eşliğinde antrenman karşılaşması başlatılıyor...';
      } else if (mode === 'local_pass_and_play') {
        msg = 'Ekranda (Yerel) karşılaşma başlatıldı.';
      } else if (mode === 'custom') {
        msg = 'Özel ayarlı karşılaşma başlatılıyor...';
      } else {
        msg = 'Çevrimiçi karşılaşma başlatılıyor...';
      }
      showNotification(msg, 'info');
    }
  };

  // Oyundan çıkış / Ana menüye dönüş
  const handleExitGame = () => {
    exitGame();
    sendMessage('GameManager', 'ResetToMenu', '');
    setActiveGameMode(null);
    setCurrentPage('MAIN_MENU');
    showNotification('Ana menüye dönüldü.', 'info');
  };

  // Yeniden başlatma
  const handleResetGame = () => {
    if (activeGameMode) {
      sendMessage('GameManager', 'ResetGame', activeGameMode);
      showNotification('Karşılaşma yeniden başlatıldı.', 'info');
    }
  };

  return (
    /* 1. Dış Kapsayıcı (Masaüstünde sağ/sol koyu arka plan) */
    <div className="w-screen h-screen bg-[#0a1710] flex items-center justify-center overflow-hidden select-none relative font-primary text-white">
      
      {/* 2. 9:16 Sabit Oranlı Ana Mobil Çerçeve */}
      <div className="relative h-full w-auto aspect-[9/16] max-w-full max-h-full bg-[#173325] shadow-2xl overflow-hidden flex flex-col justify-between">
        
        {/* KATMAN 1: Unity WebGL Canvas (z-0, Arka planda sabit çalışır) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center w-full h-full">
          {unityProvider ? (
            <Unity
              unityProvider={unityProvider as any}
              style={{ width: '100%', height: '100%' }}
              devicePixelRatio={dpr}
            />
          ) : (
            <div className="w-full h-full bg-[#173325] flex items-center justify-center text-white/30 text-xs">
              Unity Canvas Alanı
            </div>
          )}
        </div>

        {/* KATMAN 2: Unity Yükleniyor Göstergesi (İlk açılışta veya demo modda) */}
        {!isLoaded && currentPage !== 'SPLASH' && (
          <LoadingScreen progress={loadingProgression} />
        )}

        {/* KATMAN 3: React UI Overlay (z-10, Sayfa Durumuna Göre Değişir) */}
        <div className="relative z-10 w-full h-full pointer-events-none">
          {currentPage === 'SPLASH' && (
            <div className="pointer-events-auto w-full h-full">
              <SplashScreen onDone={() => setCurrentPage('MAIN_MENU')} />
            </div>
          )}

          {currentPage === 'MAIN_MENU' && (
            <div className="pointer-events-auto w-full h-full">
              <MainMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
              />
            </div>
          )}

          {currentPage === 'PLAY_MENU' && (
            <div className="pointer-events-auto w-full h-full">
              <PlayMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                onStartGame={(mode) => handleStartGameMode(mode)}
              />
            </div>
          )}

          {currentPage === 'BOT_SELECT' && (
            <div className="pointer-events-auto w-full h-full">
              <BotSelectPage
                onNavigate={setCurrentPage}
                onStartGame={(mode) => handleStartGameMode(mode as GameMode)}
              />
            </div>
          )}

          {currentPage === 'LEARN_MENU' && (
            <div className="pointer-events-auto w-full h-full">
              <LearnMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
              />
            </div>
          )}

          {currentPage === 'ROADMAP' && (
            <div className="pointer-events-auto w-full h-full">
              <RoadmapPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
              />
            </div>
          )}

          {currentPage === 'LESSON_1' && (
            <div className="pointer-events-auto w-full h-full">
              <Lesson1Page
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                slideIdx={slideIdx}
                setSlideIdx={setSlideIdx}
              />
            </div>
          )}

          {currentPage === 'RULES' && (
            <div className="pointer-events-auto w-full h-full">
              <RulesPage
                onNavigate={setCurrentPage}
                rulesTab={rulesTab}
                setRulesTab={setRulesTab}
                selectedPiece={selectedPiece}
                setSelectedPiece={setSelectedPiece}
              />
            </div>
          )}

          {currentPage === 'GAME_UNITY' && (
            <GameHUD
              gameMode={activeGameMode}
              onExitGame={handleExitGame}
              onResetGame={handleResetGame}
            />
          )}
        </div>

        {/* Global Toast Bildirimleri (Her zaman üstte z-50) */}
        <ToastNotification notifications={notifications} />
      </div>
    </div>
  );
};

export default App;
