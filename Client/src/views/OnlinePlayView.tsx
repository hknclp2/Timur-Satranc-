import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { useOnlineGame } from '../hooks/useOnlineGame';
import type { OnlineGame } from '../core/online/roomService';
import { Header } from '../components/game/Header';
import { PlayerCard } from '../components/game/PlayerCard';
import { BoardContainer } from '../components/game/BoardContainer';
import { BottomToolbar } from '../components/game/BottomToolbar';
import { GameOverModal } from '../components/game/GameOverModal';
import { PromotionModal } from '../components/board/PromotionModal';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';
import {
  WifiHigh,
  WifiSlash,
  Spinner,
  Flag,
  Handshake,
  House,
  X,
  Copy,
} from '@phosphor-icons/react';
import { NotificationType, PlayerColor } from '../types';

interface OnlinePlayViewProps {
  gameData: OnlineGame;
  myColor: PlayerColor;
  gameCode: string;
  onExit: () => void;
  showNotification?: (message: string, type?: NotificationType) => void;
}

export const OnlinePlayView: FC<OnlinePlayViewProps> = ({
  gameData: initialGameData,
  myColor,
  gameCode,
  onExit,
  showNotification,
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [showGameOver, setShowGameOver] = useState(true);

  // ─── Online senkronizasyon katmanı ──────────────────────────────────
  const {
    gameData,
    isMyTurn,
    connectionStatus,
    opponentJoined,
    isGameOver: onlineGameOver,
    syncMove,
    syncResignation,
    syncDraw,
    syncGameEnd,
  } = useOnlineGame({ gameCode, myColor, initialGameData });

  // ─── Yerel oyun motoru (DB snapshot'ıyla başlar) ────────────────────
  const {
    gameState,
    whiteTime,
    blackTime,
    isPaused,
    statusText,
    selectedPos,
    validMoves,
    pendingPromotion,
    displayedBoard,
    displayedCitadels,
    displayedCapturedPieces,
    displayedLastMove,
    historyEntries,
    viewedMoveIndex,
    isViewingHistory,
    handleSelectSquare,
    handleDropMove,
    resolvePromotion,
    goToMove,
    goToPreviousMove,
    goToNextMove,
    goToLive,
    togglePause,
    resignGame,
    agreeDraw,
    canGoPrevious,
    canGoNext,
  } = useGame({
    initialTimeSeconds: 0,
    incrementSeconds: 0,
    whiteName: initialGameData.white_name,
    blackName: initialGameData.black_name ?? 'Rakip bekleniyor',
    boardRotates: false,
    initialBoard: initialGameData.board_state,
    initialCitadels: initialGameData.citadels_state,
    initialTurn: 'white',
  });

  // ─── Materyal avantajı (ScreenPlayView ile aynı türetme) ────────────
  const { whiteAdvantage, blackAdvantage } = useMemo(() => {
    const res = defaultMaterialCalculator.calculateAdvantage(displayedCapturedPieces);
    return {
      whiteAdvantage: res.leader === 'white' ? res.advantage : 0,
      blackAdvantage: res.leader === 'black' ? res.advantage : 0,
    };
  }, [displayedCapturedPieces]);

  // ─── Renk / isim / süre eşleşmesi ───────────────────────────────────
  const opponentColor: PlayerColor = myColor === 'white' ? 'black' : 'white';
  const liveWhiteName = gameData.white_name || 'Beyaz';
  const liveBlackName = gameData.black_name || 'Rakip bekleniyor';
  const myName = myColor === 'white' ? liveWhiteName : liveBlackName;
  const opponentName = myColor === 'white' ? liveBlackName : liveWhiteName;
  const myTime = myColor === 'white' ? whiteTime : blackTime;
  const opponentTime = opponentColor === 'white' ? whiteTime : blackTime;

  const isInteractive =
    isMyTurn && !isViewingHistory && !gameState.isGameOver && !onlineGameOver && opponentJoined;

  // ─── Kendi hamlem → DB'ye senkronize et ─────────────────────────────
  const prevLocalCountRef = useRef(0);
  useEffect(() => {
    const count = historyEntries.length;
    if (count > prevLocalCountRef.current) {
      const latestEntry = historyEntries[count - 1];
      if (latestEntry.player === myColor) {
        void syncMove(latestEntry, count - 1);
      }
    }
    prevLocalCountRef.current = count;
  }, [historyEntries.length, myColor, syncMove]);

  // ─── Rakip hamlesi (MVP) ────────────────────────────────────────────
  // NOT(v2): Realtime aboneliği gameData.board_state'i günceller, ancak useGame
  // yerel state'i DB snapshot'ıyla OTOMATİK değiştirilmez. MVP'de tahtayı DB
  // snapshot'ıyla değiştirmeye çalışmıyoruz (reset/replay riski). Bunun yerine
  // bildirim + canlı görünüme dönüş yapıyoruz. v2'de useGame'e dokunmadan bir
  // applyRemoteSnapshot mekanizması eklenecek.
  const prevRemoteCountRef = useRef(initialGameData.move_count);
  useEffect(() => {
    if (gameData.move_count > prevRemoteCountRef.current) {
      prevRemoteCountRef.current = gameData.move_count;
      showNotification?.('Rakip hamle yaptı', 'info');
      goToLive();
    }
  }, [gameData.move_count, goToLive, showNotification]);

  // ─── Yerel oyun sonu → DB'ye bildir ─────────────────────────────────
  useEffect(() => {
    if (gameState.isGameOver && !onlineGameOver) {
      void syncGameEnd(gameState.winner ?? 'draw', gameState.status);
    }
  }, [gameState.isGameOver, gameState.winner, gameState.status, onlineGameOver, syncGameEnd]);

  // ─── Rakip bitirdi (terk / beraberlik) → yerel motora yansıt ────────
  useEffect(() => {
    if (onlineGameOver && !gameState.isGameOver) {
      if (gameData.end_reason === 'resignation') {
        const resigningSide: PlayerColor = gameData.winner === 'white' ? 'black' : 'white';
        resignGame(resigningSide);
      } else if (gameData.winner === 'draw') {
        agreeDraw();
      }
    }
  }, [onlineGameOver, gameState.isGameOver, gameData.end_reason, gameData.winner, resignGame, agreeDraw]);

  // ─── Yeni oyun sonu geldiğinde modalı tekrar göster ─────────────────
  useEffect(() => {
    if (gameState.isGameOver || onlineGameOver) {
      setShowGameOver(true);
    }
  }, [gameState.isGameOver, onlineGameOver]);

  const handleResign = () => {
    resignGame(myColor);
    void syncResignation();
    setIsOptionsOpen(false);
  };

  const handleDraw = () => {
    agreeDraw();
    void syncDraw();
    setIsOptionsOpen(false);
  };

  const handleShare = () => {
    const text = `${liveWhiteName} - ${liveBlackName}: ${statusText} (${historyEntries.length} hamle)`;
    try {
      void navigator.clipboard?.writeText(text);
      showNotification?.('Oyun sonucu panoya kopyalandı', 'success');
    } catch {
      showNotification?.('Paylaşım hazır: ' + text, 'info');
    }
  };

  const ConnectionIcon =
    connectionStatus === 'connected'
      ? WifiHigh
      : connectionStatus === 'connecting'
        ? Spinner
        : WifiSlash;
  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Bağlı'
      : connectionStatus === 'connecting'
        ? 'Bağlanıyor...'
        : 'Bağlantı kesildi';

  // ─── Rakip bekleniyor ekranı (tahtaya girmeden) ─────────────────────
  if (!opponentJoined) {
    return (
      <div className="mobile-screen flex flex-col items-center justify-center bg-[#122b1e] text-white p-6 select-none">
        <div className="bg-[#1a4228] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/10">
          <h2 className="font-batangas text-2xl font-bold mb-2">Rakip Bekleniyor...</h2>
          <p className="text-[#A7BDB1] text-sm mb-6">Arkadaşına bu kodu gönder:</p>
          <div className="bg-[#0a1710] rounded-xl p-4 mb-6">
            <span className="font-mono text-3xl font-extrabold text-[#00d4c4] tracking-[0.3em]">
              {gameCode}
            </span>
          </div>
          <button
            onClick={() => {
              try {
                void navigator.clipboard?.writeText(gameCode);
                showNotification?.(`Oda kodu (${gameCode}) kopyalandı!`, 'success');
              } catch {
                showNotification?.(`Oda kodun: ${gameCode}`, 'info');
              }
            }}
            className="w-full bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer text-sm mb-3 flex items-center justify-center gap-2"
          >
            <Copy size={16} weight="bold" />
            <span>Kodu Kopyala</span>
          </button>
          <button
            onClick={onExit}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            İptal Et
          </button>
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[#00d4c4] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Ana oyun ekranı ────────────────────────────────────────────────
  return (
    <div className="mobile-screen flex flex-col justify-between bg-[#153423] text-white relative overflow-hidden select-none">
      {/* Üst bar: bağlantı durumu + sıra göstergesi */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#142b1f] border-b border-white/10 relative z-20">
        <div
          className={`flex items-center gap-1.5 text-xs font-bold ${
            connectionStatus === 'connected'
              ? 'text-emerald-400'
              : connectionStatus === 'connecting'
                ? 'text-amber-400'
                : 'text-red-400'
          }`}
        >
          <ConnectionIcon
            size={14}
            weight="bold"
            className={connectionStatus === 'connecting' ? 'animate-spin' : ''}
          />
          <span>{connectionLabel}</span>
        </div>
        <div className="text-xs font-bold">
          {gameState.isGameOver || onlineGameOver ? (
            <span className="text-amber-400">Oyun Bitti</span>
          ) : isMyTurn ? (
            <span className="text-[#00d4c4]">Sıra sende</span>
          ) : (
            <span className="text-[#A7BDB1]">Sıra rakipte</span>
          )}
        </div>
      </div>

      {/* Başlık + notasyon */}
      <Header
        onBack={() => setIsOptionsOpen(true)}
        gameTypeTitle="Çevrimiçi Oyna"
        historyEntries={historyEntries}
        viewedMoveIndex={viewedMoveIndex}
        onSelectMove={goToMove}
      />

      {/* Oyun alanı: rakip -> tahta -> ben */}
      <div className="flex-1 flex flex-col justify-between items-center px-10 py-1 relative z-10 w-full max-w-lg mx-auto overflow-visible">
        <PlayerCard
          name={opponentName}
          side={opponentColor}
          timeSeconds={opponentTime}
          isActive={gameState.currentTurn === opponentColor && !gameState.isGameOver}
          isTopPlayer={true}
          capturedPieces={displayedCapturedPieces[myColor]}
          materialAdvantage={opponentColor === 'white' ? whiteAdvantage : blackAdvantage}
        />

        <BoardContainer
          board={displayedBoard}
          citadels={displayedCitadels}
          selectedPos={isInteractive ? selectedPos : null}
          validMoves={isInteractive ? validMoves : []}
          lastMove={displayedLastMove}
          turn={gameState.currentTurn}
          boardRotates={false}
          flipped={myColor === 'black'}
          onSquareClick={isInteractive ? handleSelectSquare : () => {}}
          onDropMove={isInteractive ? handleDropMove : undefined}
        />

        <PlayerCard
          name={myName}
          side={myColor}
          timeSeconds={myTime}
          isActive={gameState.currentTurn === myColor && !gameState.isGameOver}
          isTopPlayer={false}
          capturedPieces={displayedCapturedPieces[opponentColor]}
          materialAdvantage={myColor === 'white' ? whiteAdvantage : blackAdvantage}
        />
      </div>

      {/* Alt araç çubuğu */}
      <BottomToolbar
        onOptions={() => setIsOptionsOpen(true)}
        onTogglePause={togglePause}
        isPaused={isPaused}
        onSelfAnalysis={() => showNotification?.('Analiz yakında', 'info')}
        onPrevious={goToPreviousMove}
        onNext={goToNextMove}
        canPrevious={canGoPrevious}
        canNext={canGoNext}
      />

      {/* Piyon terfisi */}
      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.piece.color}
          defaultPromotionType={pendingPromotion.defaultType}
          onSelectPromotion={resolvePromotion}
        />
      )}

      {/* Seçenekler modalı */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-[#1c3829] border border-white/15 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">Oyun Seçenekleri</h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleResign}
                disabled={gameState.isGameOver || onlineGameOver}
                className="w-full bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-30"
              >
                <Flag size={18} weight="bold" />
                <span>Terk Et</span>
              </button>

              <button
                onClick={handleDraw}
                disabled={gameState.isGameOver || onlineGameOver}
                className="w-full bg-[#274e39] hover:bg-[#326449] active:scale-98 text-[#f4eedd] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow transition-all cursor-pointer text-sm disabled:opacity-30"
              >
                <Handshake size={18} weight="bold" className="text-amber-300" />
                <span>Beraberlik Teklif Et / Bitir</span>
              </button>

              <button
                onClick={onExit}
                className="w-full mt-2 bg-black/40 hover:bg-black/60 active:scale-98 text-white/70 hover:text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer text-sm"
              >
                <House size={18} weight="bold" />
                <span>Ana Menüye Çık</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oyun sonu modalı */}
      {(gameState.isGameOver || onlineGameOver) && showGameOver && (
        <GameOverModal
          mode="online"
          winner={gameState.winner ?? gameData.winner ?? 'draw'}
          status={gameState.status ?? 'DRAW_BY_AGREEMENT'}
          statusText={statusText}
          whiteName={liveWhiteName}
          blackName={liveBlackName}
          totalMoves={historyEntries.length}
          onGameReview={() => showNotification?.('Oyun incelemesi yakında', 'info')}
          onRequestRematch={() => showNotification?.('Rövanş isteği yakında', 'info')}
          onFindOpponent={() => showNotification?.('Yeni rakip bulma yakında', 'info')}
          onNewGame={onExit}
          onClose={() => setShowGameOver(false)}
          onShare={handleShare}
        />
      )}
    </div>
  );
};
