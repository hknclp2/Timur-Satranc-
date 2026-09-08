import React, { useState } from 'react';
import { PageState, GameMode, Notification, NotificationType } from './types';
import { BoardMatrix, CitadelState, PlayerColor } from './types/chess';

// Bileşenler
import { SplashScreen } from './components/SplashScreen';
import { MainMenuPage } from './components/MainMenuPage';
import { PlayMenuPage } from './components/PlayMenuPage';
import { BotSelectPage, type PlayerSideChoice } from './components/BotSelectPage';
import { LearnMenuPage } from './components/LearnMenuPage';
import { RoadmapPage } from './components/RoadmapPage';
import { Lesson1Page } from './components/Lesson1Page';
import { LessonDetailPage } from './components/LessonDetailPage';
import { RulesPage, PieceData } from './components/RulesPage';
import { GameHUD } from './components/GameHUD';
import { ToastNotification } from './components/ToastNotification';
import { LearnShell } from './components/learn/LearnShell';
import { CreditsModal } from './components/CreditsModal';
import { PlayInPersonModal } from './components/PlayInPersonModal';
import { DesktopSidebar } from './components/desktop/DesktopSidebar';
import { DesktopMainMenu } from './components/desktop/DesktopMainMenu';
import { ScreenPlayView } from './views/ScreenPlayView';
import { BotPlayView } from './views/BotPlayView';
import { SetupEditorView } from './views/SetupEditorView';
import { OnlinePlayView } from './views/OnlinePlayView';
import type { OnlineGame } from './core/online/roomService';
import { useResponsive } from './hooks/useResponsive';
import { BOT_PROFILES, type BotProfileId } from './bot/profiles';

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
  const { isDesktop } = useResponsive(1024);
  const [currentPage, setCurrentPage] = useState<PageState>('SPLASH');
  const [activeGameMode, setActiveGameMode] = useState<GameMode>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isInPersonModalOpen, setIsInPersonModalOpen] = useState(false);
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

  // Bota karşı oyun yapılandırması (yalnızca bot_* kipinde dolar)
  const [botGameConfig, setBotGameConfig] = useState<{
    mode: GameMode;
    timeSeconds: number;
    profileId: BotProfileId;
    incrementSeconds: number;
    botSide: PlayerColor;
  } | null>(null);

  // Online arkadaş oyunu (PlayAFriendModal → ONLINE_PLAY)
  const [onlineGameData, setOnlineGameData] = useState<OnlineGame | null>(null);
  const [onlineMyColor, setOnlineMyColor] = useState<PlayerColor>('white');
  const [onlineGameCode, setOnlineGameCode] = useState<string>('');

  // Oyuna başlama akışı
  const handleStartGameMode = (mode: GameMode) => {
    setActiveGameMode(mode);
    setBotGameConfig(null);
    setCurrentPage('GAME_PLAY');
  };

  // Bot oyunu başlatma (BotSelectPage: kart+taç → I–V profili, süre saniye, artış, taraf)
  const handleStartBotGame = (
    mode: GameMode,
    timeSeconds: number,
    profileId: BotProfileId,
    incrementSeconds: number = 0,
    playerColor: PlayerSideChoice = 'white'
  ) => {
    let botSide: PlayerColor = 'black';
    if (playerColor === 'black') {
      botSide = 'white';
    } else if (playerColor === 'random') {
      botSide = Math.random() < 0.5 ? 'black' : 'white';
    }
    setActiveGameMode(mode);
    setBotGameConfig({ mode, timeSeconds, profileId, incrementSeconds, botSide });
    setCurrentPage('GAME_PLAY');
  };

  // Online arkadaş oyunu başlatma (PlayAFriendModal → ONLINE_PLAY)
  const handleStartOnlineGame = (gameData: OnlineGame, myColor: PlayerColor, gameCode: string) => {
    setOnlineGameData(gameData);
    setOnlineMyColor(myColor);
    setOnlineGameCode(gameCode);
    setCurrentPage('ONLINE_PLAY');
  };

  // Oyundan çıkış / Ana menüye dönüş
  const handleExitGame = () => {
    setActiveGameMode(null);
    setBotGameConfig(null);
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
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <DesktopMainMenu
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    onOpenInPersonModal={() => setIsInPersonModalOpen(true)}
                    showNotification={showNotification}
                  />
                </div>
              ) : (
                <MainMenuPage
                  onNavigate={setCurrentPage}
                  onOpenCredits={() => setIsCreditsOpen(true)}
                  showNotification={showNotification}
                />
              )}
            </div>
          )}

          {currentPage === 'PLAY_MENU' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              <PlayMenuPage
                onNavigate={setCurrentPage}
                showNotification={showNotification}
                onStartGame={(mode) => handleStartGameMode(mode)}
                onStartOnlineGame={handleStartOnlineGame}
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
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <div className="flex-1 ml-[110px] overflow-y-auto custom-scrollbar">
                    <BotSelectPage
                      onNavigate={setCurrentPage}
                      onStartGame={(mode, seconds, profileId, inc, side) =>
                        handleStartBotGame(mode as GameMode, seconds, profileId, inc ?? 0, side ?? 'white')
                      }
                    />
                  </div>
                </div>
              ) : (
                <BotSelectPage
                  onNavigate={setCurrentPage}
                  onStartGame={(mode, seconds, profileId, inc, side) =>
                    handleStartBotGame(mode as GameMode, seconds, profileId, inc ?? 0, side ?? 'white')
                  }
                />
              )}
            </div>
          )}

          {currentPage === 'LEARN_MENU' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <div className="flex-1 ml-[110px] overflow-y-auto custom-scrollbar">
                    <LearnMenuPage
                      onNavigate={setCurrentPage}
                      showNotification={showNotification}
                    />
                  </div>
                </div>
              ) : (
                <LearnMenuPage
                  onNavigate={setCurrentPage}
                  showNotification={showNotification}
                />
              )}
            </div>
          )}

          {currentPage === 'ROADMAP' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <div className="flex-1 ml-[110px] overflow-y-auto custom-scrollbar">
                    <RoadmapPage
                      onNavigate={setCurrentPage}
                      showNotification={showNotification}
                      onOpenLevel={handleOpenLevel}
                      onOpenLesson={(levelId, lessonIdx) => {
                        handleLessonChange(levelId, lessonIdx);
                        setCurrentPage('LESSON_DETAIL');
                      }}
                    />
                  </div>
                </div>
              ) : (
                <RoadmapPage
                  onNavigate={setCurrentPage}
                  showNotification={showNotification}
                  onOpenLevel={handleOpenLevel}
                  onOpenLesson={(levelId, lessonIdx) => {
                    handleLessonChange(levelId, lessonIdx);
                    setCurrentPage('LESSON_DETAIL');
                  }}
                />
              )}
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
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <div className="flex-1 ml-[110px] overflow-y-auto custom-scrollbar">
                    <LessonDetailPage
                      levelId={selectedLevelId}
                      lessonIdx={selectedLessonIdx}
                      onNavigate={setCurrentPage}
                      onLessonChange={handleLessonChange}
                      showNotification={showNotification}
                    />
                  </div>
                </div>
              ) : (
                <LessonDetailPage
                  levelId={selectedLevelId}
                  lessonIdx={selectedLessonIdx}
                  onNavigate={setCurrentPage}
                  onLessonChange={handleLessonChange}
                  showNotification={showNotification}
                />
              )}
            </div>
          )}

          {currentPage === 'RULES' && (
            <div className="pointer-events-auto w-full flex-1 flex flex-col">
              {isDesktop ? (
                <div className="flex w-full min-h-screen">
                  <DesktopSidebar
                    currentPage={currentPage}
                    onNavigate={setCurrentPage}
                    onOpenCredits={() => setIsCreditsOpen(true)}
                    showNotification={showNotification}
                  />
                  <div className="flex-1 ml-[110px] overflow-y-auto custom-scrollbar">
                    <RulesPage
                      onNavigate={setCurrentPage}
                      rulesTab={rulesTab}
                      setRulesTab={setRulesTab}
                      selectedPiece={selectedPiece}
                      setSelectedPiece={setSelectedPiece}
                    />
                  </div>
                </div>
              ) : (
                <RulesPage
                  onNavigate={setCurrentPage}
                  rulesTab={rulesTab}
                  setRulesTab={setRulesTab}
                  selectedPiece={selectedPiece}
                  setSelectedPiece={setSelectedPiece}
                />
              )}
            </div>
          )}

          {currentPage==='ONLINE_PLAY' && onlineGameData && (<div className="pointer-events-auto w-full flex-1 flex flex-col"><OnlinePlayView gameData={onlineGameData} myColor={onlineMyColor} gameCode={onlineGameCode} onExit={()=>{setOnlineGameData(null); setCurrentPage('PLAY_MENU');}} showNotification={showNotification} /></div>)}

          {currentPage === 'GAME_PLAY' && (
            botGameConfig && activeGameMode !== null && activeGameMode.startsWith('bot_') ? (
              <div className="pointer-events-auto w-full flex-1 flex flex-col">
                <BotPlayView
                  whiteName={botGameConfig.botSide === 'white' ? `Bot · ${BOT_PROFILES[botGameConfig.profileId].name}` : 'Siz'}
                  blackName={botGameConfig.botSide === 'black' ? `Bot · ${BOT_PROFILES[botGameConfig.profileId].name}` : 'Siz'}
                  initialTimeSeconds={botGameConfig.timeSeconds}
                  incrementSeconds={botGameConfig.incrementSeconds}
                  botSide={botGameConfig.botSide}
                  botProfileId={botGameConfig.profileId}
                  onExit={handleExitGame}
                  showNotification={showNotification}
                />
              </div>
            ) : (
              <GameHUD
                gameMode={activeGameMode}
                onExitGame={handleExitGame}
                onResetGame={handleResetGame}
              />
            )
          )}
        </div>

        {/* Credits / Hakkında Modalı (Okul Logosu tıklandığında açılır) */}
        <CreditsModal
          isOpen={isCreditsOpen}
          onClose={() => setIsCreditsOpen(false)}
        />

        {/* Ekranda Oyna Modalı (Desktop ve doğrudan tetiklemeler için) */}
        {isInPersonModalOpen && (
          <PlayInPersonModal
            onClose={() => setIsInPersonModalOpen(false)}
            onStart={(config) => {
              setIsInPersonModalOpen(false);
              handleStartScreenPlay(config);
            }}
          />
        )}

        {/* Global Toast Bildirimleri (Her zaman üstte z-50) */}
        <ToastNotification notifications={notifications} />
      </div>
    </div>
  );
};

export default App;
