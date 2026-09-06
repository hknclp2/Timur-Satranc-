import React, { FC, useState, useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { Header } from '../components/game/Header';
import { PlayerCard } from '../components/game/PlayerCard';
import { BoardContainer } from '../components/game/BoardContainer';
import { ControlBar } from '../components/game/ControlBar';
import { PromotionModal } from '../components/board/PromotionModal';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';
import { Trophy, RotateCcw, Flag, Handshake, Play, Pause, X, Home } from 'lucide-react';
import { NotificationType, PlayerColor } from '../types';
import { BoardMatrix, CitadelState } from '../types/chess';

interface ScreenPlayViewProps {
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  whiteName?: string;
  blackName?: string;
  boardRotates?: boolean;
  initialBoard?: BoardMatrix;
  initialCitadels?: CitadelState;
  initialTurn?: PlayerColor;
  onExit: () => void;
  showNotification?: (message: string, type?: NotificationType) => void;
}

export const ScreenPlayView: FC<ScreenPlayViewProps> = ({
  initialTimeSeconds = 600,
  incrementSeconds = 0,
  whiteName = 'hknclp',
  blackName = 'misafir',
  boardRotates = false,
  initialBoard,
  initialCitadels,
  initialTurn,
  onExit,
  showNotification,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Timur Chess Gameplay Engine Hook
  const {
    // Live State
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    statusText,
    selectedPos,
    validMoves,
    pendingPromotion,

    // History Display State
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,

    // Actions & Navigation
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    togglePause,
    resetGame,
    resignGame,
    agreeDraw,
    canGoPrevious,
    canGoNext,
  } = useGame({
    initialTimeSeconds,
    incrementSeconds,
    whiteName,
    blackName,
    boardRotates,
    initialBoard,
    initialCitadels,
    initialTurn,
    onMoveMade: (_move, _notation) => {
      // Optional sound or notification
    },
    onGameOver: (_winner, _reason) => {
      // Game over modal is displayed directly
    },
  });

  // Calculate material difference for both players
  const { whiteAdvantage, blackAdvantage } = useMemo(() => {
    const res = defaultMaterialCalculator.calculateAdvantage(displayedCapturedPieces);
    return {
      whiteAdvantage: res.leader === 'white' ? res.advantage : 0,
      blackAdvantage: res.leader === 'black' ? res.advantage : 0,
    };
  }, [displayedCapturedPieces]);

  const onResetClick = () => {
    resetGame();
    setIsOptionsOpen(false);
  };

  const onResignClick = (player: PlayerColor) => {
    resignGame(player);
    setIsOptionsOpen(false);
  };

  const onDrawClick = () => {
    agreeDraw();
    setIsOptionsOpen(false);
  };

  return (
    <div className="mobile-screen flex flex-col justify-between bg-[#153423] text-white relative overflow-hidden select-none">
      {/* 1. ÜST HEADER: Oyun İkonu + Başlık + Entegre Notasyon Barı */}
      <Header
        onBack={() => setIsOptionsOpen(true)}
        gameTypeTitle="Ekranda oyna"
        historyEntries={historyEntries}
        viewedMoveIndex={viewedMoveIndex}
        onSelectMove={goToMove}
      />

      {/* 2. OYUN ALANI (Masaüstü Oyun Düzeni: Üst Oyuncu -> Board -> Alt Oyuncu) */}
      <div className="flex-1 flex flex-col justify-between items-center px-2 py-1 relative z-10 w-full max-w-lg mx-auto overflow-hidden">
        {/* Üst Oyuncu (Siyah / misafir) */}
        <PlayerCard
          name={blackName}
          side="black"
          timeSeconds={blackTime}
          isActive={gameState.currentTurn === 'black' && !gameState.isGameOver}
          isTopPlayer={true}
          capturedPieces={displayedCapturedPieces.white}
          materialAdvantage={blackAdvantage}
        />

        {/* Ortadaki 11x10 Tahta Kapsayıcısı (Board & Hisarlar) */}
        <BoardContainer
          board={displayedBoard}
          citadels={displayedCitadels}
          selectedPos={selectedPos}
          validMoves={validMoves}
          lastMove={displayedLastMove}
          turn={gameState.currentTurn}
          boardRotates={boardRotates}
          onSquareClick={handleSelectSquare}
          onDropMove={handleDropMove}
        />

        {/* Alt Oyuncu (Beyaz / hknclp) */}
        <PlayerCard
          name={whiteName}
          side="white"
          timeSeconds={whiteTime}
          isActive={gameState.currentTurn === 'white' && !gameState.isGameOver}
          isTopPlayer={false}
          capturedPieces={displayedCapturedPieces.black}
          materialAdvantage={whiteAdvantage}
        />
      </div>

      {/* 3. EN ALT KONTROL BARI (Önceki, Sonraki, Durdur, Seçenekler) */}
      <ControlBar
        onPrevious={goToPreviousMove}
        onNext={goToNextMove}
        onOptionsClick={() => setIsOptionsOpen(true)}
        onTogglePause={togglePause}
        canPrevious={canGoPrevious}
        canNext={canGoNext}
        isPaused={isPaused}
      />

      {/* ─── PİYON TERFİ MODALI ────────────────────────────────────── */}
      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.piece.color}
          defaultPromotionType={pendingPromotion.defaultType}
          onSelectPromotion={resolvePromotion}
        />
      )}

      {/* ─── SEÇENEKLER MODALI (Options Modal) ────────────────────────── */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">
                Oyun Seçenekleri
              </h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Duraklat / Devam Et */}
              <button
                onClick={() => {
                  togglePause();
                  setIsOptionsOpen(false);
                }}
                className="w-full bg-[#f4eedd] hover:bg-[#eae2cf] active:scale-98 text-[#141f1b] font-batangas font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
                <span>{isPaused ? 'Oyuna Devam Et' : 'Oyunu Duraklat'}</span>
              </button>

              {/* Yeniden Başlat */}
              <button
                onClick={onResetClick}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm"
              >
                <RotateCcw size={18} className="text-[#00d4c4]" />
                <span>Yeniden Başlat</span>
              </button>

              {/* Beraberlik Teklif Et */}
              <button
                onClick={onDrawClick}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm"
              >
                <Handshake size={18} className="text-amber-300" />
                <span>Beraberlik Teklif Et / Bitir</span>
              </button>

              {/* Terk Et */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onResignClick('white')}
                  className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Flag size={14} />
                  <span>Beyaz Terk</span>
                </button>
                <button
                  onClick={() => onResignClick('black')}
                  className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Flag size={14} />
                  <span>Siyah Terk</span>
                </button>
              </div>

              {/* Ana Menüye Dön */}
              <button
                onClick={onExit}
                className="w-full mt-2 bg-black/40 hover:bg-black/60 active:scale-98 text-white/70 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer text-sm"
              >
                <Home size={18} />
                <span>Ana Menüye Çık</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OYUN BİTTİ MODALI (Game Over Modal) ───────────────────────── */}
      {gameState.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border-2 border-[#00d4c4]/40 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#00d4c4]/20 border border-[#00d4c4] flex items-center justify-center text-[#00d4c4] shadow-lg animate-bounce">
              <Trophy size={36} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-batangas text-2xl font-bold text-[#f4eedd]">
                {gameState.winner === 'draw'
                  ? 'Berabere!'
                  : `${gameState.winner === 'white' ? whiteName : blackName} Kazandı!`}
              </h3>
              <p className="text-[#00e5ff] text-xs font-mono font-semibold">
                {statusText}
              </p>
            </div>

            <div className="w-full bg-black/30 border border-white/10 rounded-xl p-3 flex justify-around text-xs text-white/70">
              <div>
                <span className="block text-white/40">Toplam Hamle</span>
                <span className="font-bold text-base text-white">{gameState.moveHistory.length}</span>
              </div>
              <div>
                <span className="block text-white/40">Kalan Süre (B)</span>
                <span className="font-bold text-base text-white">{Math.floor(whiteTime / 60)} dk</span>
              </div>
              <div>
                <span className="block text-white/40">Kalan Süre (S)</span>
                <span className="font-bold text-base text-white">{Math.floor(blackTime / 60)} dk</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={onResetClick}
                className="w-full bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-batangas font-bold py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Tekrar Oyna
              </button>
              <button
                onClick={onExit}
                className="w-full bg-[#f4eedd] hover:bg-[#eae2cf] active:scale-98 text-[#141f1b] font-batangas font-bold py-3 rounded-xl shadow transition-all cursor-pointer text-sm"
              >
                Ana Menüye Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
