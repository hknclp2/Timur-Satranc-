import React, { useState } from 'react';
import { PageState, GameMode, Notification, NotificationType } from './types';
import { BoardMatrix, CitadelState, PlayerColor } from './types/chess';

// Bileşenler
import { SplashScreen } from './components/SplashScreen';
import { MainMenuPage } from './components/MainMenuPage';
import { PlayMenuPage } from './components/PlayMenuPage';
import { BotSelectPage } from './components/BotSelectPage';
import { LearnMenuPage } from './components/LearnMenuPage';
import { RoadmapPage } from './components/RoadmapPage';
import { Lesson1Page } from './components/Lesson1Page';
import { LessonDetailPage } from './components/LessonDetailPage';
import { RulesPage, PieceData } from './components/RulesPage';
import { GameHUD } from './components/GameHUD';
import { ToastNotification } from './components/ToastNotification';
import { LearnShell } from './components/learn/LearnShell';
import { ScreenPlayView } from './views/ScreenPlayView';
import { SetupEditorView } from './views/SetupEditorView';

// ─── Custom Setup Config ─────────────────────────────────────────────────────
interface CustomSetupConfig {
  board: BoardMatrix;
  citadels: CitadelState;
  startingTurn: PlayerColor;
  whiteName: string;
  blackName: string;
  initialTimeSeconds: number;
  incrementSeconds: number;
  boardRotates: boolean;
}

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageState>('SPLASH');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [screenPlayConfig, setScreenPlayConfig] = useState({
    whiteName: 'Emir Timur',
    blackName: 'Yıldırım Bayezid',
    initialTimeSeconds: 600,
    incrementSeconds: 0,
    boardRotates: false,
  });

  // Custom Setup (Serbest Dizilim) config — null means use default board
  const [customSetupConfig, setCustomSetupConfig] = useState<CustomSetupConfig | null>(null);

  // Ekranda Oyna → Serbest Dizilim girişinden gelen ön ayar (isim, süre, döndürme)
  const [pendingSetupEntry, setPendingSetupEntry] = useState<{
    whiteName: string;
    blackName: string;
    initialTimeSeconds: number;
    incrementSeconds: number;
    boardRotates: boolean;
  } | null>(null);

  const parseTimeControl = (timeControl: string): { seconds: number; increment: number } => {
    if (timeControl === 'Süresiz') return { seconds: 0, increment: 0 };
    if (timeControl.includes('+')) {
      const parts = timeControl.split('+');
      const min = parseInt(parts[0].trim(), 10);
      const inc = parseInt(parts[1].trim(), 10);
      return {
        seconds: (isNaN(min) ? 10 : min) * 60,
        increment: isNaN(inc) ? 0 : inc,
      };
    }
    const min = parseInt(timeControl, 10);
    return { seconds: (isNaN(min) ? 10 : min) * 60, increment: 0 };
  };

  // Öğren & Kurallar alt durumları
  const [slideIdx, setSlideIdx] = useState<number>(0);
  const [rulesTab, setRulesTab] = useState<'pieces' | 'rules'>('pieces');
  const [selectedPiece, setSelectedPiece] = useState<PieceData | null>(null);
  // PDF müfredatı: seçili seviye/ders (LESSON_DETAIL)
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState<number>(0);

  const handleOpenLevel = (levelId: number) => {
    setSelectedLevelId(levelId);
    setSelectedLessonIdx(0);
    setSlideIdx(0);
    setCurrentPage('LESSON_DETAIL');
  };

  const handleLessonChange = (levelId: number, lessonIdx: number) => {
    setSelectedLevelId(levelId);
    setSelectedLessonIdx(lessonIdx);
    setSlideIdx(0);
  };

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
    setCurrentPage('GAME_PLAY');
  };

  // Oyundan çıkış / Ana menüye dönüş
  const handleExitGame = () => {
    setActiveGameMode(null);
    setCurrentPage('MAIN_MENU');
  };

  // Yeniden başlatma
  const handleResetGame = () => {
  };

  // Ekranda Oyna akışı (normal, zaman kontrolü seçilerek)
  const handleStartScreenPlay = (config: {
    whiteName: string;
    blackName: string;
    timeControl: string;
    boardRotates: boolean;
    gameType: string;
  }) => {
    // Serbest dizilim seçildiyse editöre yönlendir
    if (config.gameType === 'Serbest') {
      handleOpenSetupEditor(config);
      return;
    }
    const { seconds, increment } = parseTimeControl(config.timeControl);

    setCustomSetupConfig(null); // Normal oyun — custom board yok
    setPendingSetupEntry(null);
    setScreenPlayConfig({
      whiteName: config.whiteName || 'Emir Timur',
      blackName: config.blackName || 'Yıldırım Bayezid',
      initialTimeSeconds: seconds,
      incrementSeconds: increment,
      boardRotates: config.boardRotates,
    });
    setCurrentPage('SCREEN_PLAY');
  };

  // Ekranda Oyna → Oyun Türü = Serbest seçilirse editörü aç
  const handleOpenSetupEditor = (entry?: {
    whiteName: string;
    blackName: string;
    timeControl: string;
    boardRotates: boolean;
    gameType: string;
  }) => {
    if (entry) {
      const { seconds, increment } = parseTimeControl(entry.timeControl);
      setPendingSetupEntry({
        whiteName: entry.whiteName || 'Emir Timur',
        blackName: entry.blackName || 'Yıldırım Bayezid',
        initialTimeSeconds: seconds,
        incrementSeconds: increment,
        boardRotates: entry.boardRotates,
      });
    } else {
      setPendingSetupEntry(null);
    }
    setCurrentPage('CUSTOM_SETUP');
  };

  // Serbest Dizilim'den oyunu başlat (editör core/setup'tan ayrık snapshot verir)
  const handleStartFromSetup = (config: CustomSetupConfig) => {
    // Editörün kendi modalındaki isimler esas; süre/döndürme giriş ekranından geldiyse korunur
    const timeSeconds =
      pendingSetupEntry && config.initialTimeSeconds === 0
        ? pendingSetupEntry.initialTimeSeconds
        : config.initialTimeSeconds;
    const increment =
      pendingSetupEntry && config.incrementSeconds === 0
        ? pendingSetupEntry.incrementSeconds
        : config.incrementSeconds;
    const rotates = pendingSetupEntry ? pendingSetupEntry.boardRotates : config.boardRotates;
    setCustomSetupConfig(config);
    setScreenPlayConfig({
      whiteName: config.whiteName,
      blackName: config.blackName,
      initialTimeSeconds: timeSeconds,
      incrementSeconds: increment,
      boardRotates: rotates,
    });
    setPendingSetupEntry(null);
    setCurrentPage('SCREEN_PLAY');
  };

  return (
    /* 1. Tam ekran web kapsayıcı (mobile-first responsive) */
    <div className="w-full min-h-screen bg-[#0a1710] text-white select-none relative font-primary">

      {/* 2. Akışkan İçerik Alanı */}
      <div className="w-full min-h-screen flex flex-col bg-[#1a4228]">

        {/* React UI (Sayfa Durumuna Göre Değişir) */}
        <div className="relative z-10 w-full flex-1 flex flex-col">
          {currentPage === 'SPLASH' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <SplashScreen onDone={() => setCurrentPage('MAIN_MENU')} />
            </div>
          )}

          {currentPage === 'MAIN_MENU' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <MainMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
              />
            </div>
          )}

          {currentPage === 'PLAY_MENU' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <PlayMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                onStartGame={(mode) => handleStartGameMode(mode)}
                onStartScreenPlay={handleStartScreenPlay}
                onOpenSetupEditor={handleOpenSetupEditor}
              />
            </div>
          )}

          {currentPage === 'CUSTOM_SETUP' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <SetupEditorView
                onExit={() => {
                  setPendingSetupEntry(null);
                  setCurrentPage('PLAY_MENU');
                }}
                onStartGame={handleStartFromSetup}
                initialWhiteName={pendingSetupEntry?.whiteName}
                initialBlackName={pendingSetupEntry?.blackName}
                initialTimeSeconds={pendingSetupEntry?.initialTimeSeconds}
                initialIncrementSeconds={pendingSetupEntry?.incrementSeconds}
                initialBoardRotates={pendingSetupEntry?.boardRotates}
              />
            </div>
          )}

          {currentPage === 'SCREEN_PLAY' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <ScreenPlayView
                whiteName={screenPlayConfig.whiteName}
                blackName={screenPlayConfig.blackName}
                initialTimeSeconds={screenPlayConfig.initialTimeSeconds}
                incrementSeconds={screenPlayConfig.incrementSeconds}
                boardRotates={screenPlayConfig.boardRotates}
                initialBoard={customSetupConfig?.board}
                initialCitadels={customSetupConfig?.citadels}
                initialTurn={customSetupConfig?.startingTurn}
                onExit={() => {
                  setCustomSetupConfig(null);
                  setCurrentPage('PLAY_MENU');
                }}
                showNotification={showNotification}
              />
            </div>
          )}

          {currentPage === 'BOT_SELECT' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <BotSelectPage
                onNavigate={setCurrentPage}
                onStartGame={(mode) => handleStartGameMode(mode as GameMode)}
              />
            </div>
          )}

          {currentPage === 'LEARN_MENU' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <LearnShell>
                <LearnMenuPage
                  onNavigate={setCurrentPage}
                  showNotification={showNotification}
                />
              </LearnShell>
            </div>
          )}

          {currentPage === 'ROADMAP' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <LearnShell>
              <RoadmapPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                onOpenLevel={handleOpenLevel}
                onOpenLesson={(levelId, lessonIdx) => {
                  handleLessonChange(levelId, lessonIdx);
                  setCurrentPage('LESSON_DETAIL');
                }}
              />
              </LearnShell>
            </div>
          )}

          {currentPage === 'LESSON_1' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <Lesson1Page
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                slideIdx={slideIdx}
                setSlideIdx={setSlideIdx}
              />
            </div>
          )}

          {currentPage === 'LESSON_DETAIL' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <LearnShell>
                <LessonDetailPage
                  levelId={selectedLevelId}
                  lessonIdx={selectedLessonIdx}
                  onNavigate={setCurrentPage}
                  onLessonChange={handleLessonChange}
                  showNotification={showNotification}
                />
              </LearnShell>
            </div>
          )}

          {currentPage === 'RULES' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <LearnShell>
                <RulesPage
                  onNavigate={setCurrentPage}
                  rulesTab={rulesTab}
                  setRulesTab={setRulesTab}
                  selectedPiece={selectedPiece}
                  setSelectedPiece={setSelectedPiece}
                />
              </LearnShell>
            </div>
          )}

          {currentPage === 'GAME_PLAY' && (
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
