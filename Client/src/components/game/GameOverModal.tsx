import React, { FC } from 'react';
import {
  X,
  ShareNetwork,
  MonitorPlay,
  Robot,
  WifiHigh,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react';
import { GameStatus, PlayerColor } from '../../types/chess';

export type GameOverMode = 'local' | 'bot' | 'online';

export interface GameOverModalProps {
  mode: GameOverMode;
  winner: PlayerColor | 'draw' | null;
  status: GameStatus;
  statusText: string;
  whiteName: string;
  blackName: string;
  /** Total half-moves played. */
  totalMoves: number;
  // ── Bot mode extras ──
  playerAccuracy?: number;
  botDifficultyLabel?: string;
  playerWon?: boolean;
  // ── Online mode extras ──
  eloDelta?: number;
  whiteRating?: number;
  blackRating?: number;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  // ── Actions ──
  onGameReview: () => void;
  onSelfAnalysis?: () => void;
  onRematch?: () => void;
  onNewGame?: () => void;
  onRetry?: () => void;
  onChangeBot?: () => void;
  onRequestRematch?: () => void;
  onFindOpponent?: () => void;
  onClose: () => void;
  onShare?: () => void;
}

function endReasonLabel(status: GameStatus): string {
  switch (status) {
    case 'CHECKMATE':
      return 'Mat ile';
    case 'TIMEOUT':
      return 'Süre ile';
    case 'RESIGNATION':
      return 'Terk ile';
    case 'LOSS_BY_STALEMATE':
      return 'Pat ile (Timur kuralı)';
    case 'DRAW_BY_CITADEL':
      return 'Hisar beraberliği ile';
    case 'DRAW_BY_AGREEMENT':
      return 'Anlaşmalı beraberlik ile';
    default:
      return '';
  }
}

export const GameOverModal: FC<GameOverModalProps> = ({
  mode,
  winner,
  status,
  statusText,
  whiteName,
  blackName,
  totalMoves,
  playerAccuracy,
  botDifficultyLabel,
  playerWon,
  eloDelta,
  whiteRating,
  blackRating,
  whiteAccuracy,
  blackAccuracy,
  onGameReview,
  onSelfAnalysis,
  onRematch,
  onNewGame,
  onRetry,
  onChangeBot,
  onRequestRematch,
  onFindOpponent,
  onClose,
  onShare,
}) => {
  const isDraw = winner === 'draw' || winner === null;
  const reason = endReasonLabel(status);

  // Kazananın rengine göre panel teması: siyah kazandıysa siyah, beyaz kazandıysa beyaz.
  const dark = winner === 'black';
  const cardBg = dark ? 'bg-[#101010]' : 'bg-white';
  const headerBg = dark ? 'bg-[#232323]' : 'bg-[#b9b9b9]';
  const bodyBg = dark ? 'bg-[#101010]' : 'bg-white';
  const panelBg = dark ? 'bg-white/5 border-white/10' : 'bg-[#f1efe7] border-[#e2d9c6]';
  const mutedText = dark ? 'text-white/55' : 'text-[#5c6c66]';
  const strongText = dark ? 'text-white' : 'text-[#141f1b]';
  const secondaryBtn = dark
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-[#efefef] hover:bg-[#e4e4e4] text-[#3d3d3d]';
  const tertiaryBtn = dark
    ? 'border-white/25 text-white hover:bg-white/10'
    : 'border-[#d8ccb6] text-[#3d3d3d] hover:bg-[#f5eedc]';

  const title = isDraw
    ? 'Berabere'
    : mode === 'local'
      ? winner === 'white'
        ? 'Beyaz Kazandı'
        : 'Siyah Kazandı'
      : mode === 'bot'
        ? playerWon
          ? 'Kazandın!'
          : 'Kaybettin'
        : winner === 'white'
          ? `${whiteName} Kazandı`
          : `${blackName} Kazandı`;

  const eloPositive = (eloDelta ?? 0) > 0;
  const eloNegative = (eloDelta ?? 0) < 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Oyun sonu"
    >
      <div className={`w-full max-w-sm overflow-hidden rounded-[28px] ${cardBg} shadow-2xl animate-zoom-in`}>
        {/* ── Üst başlık bloğu (kavisli alt kenar) ── */}
        <div className={`relative ${headerBg} px-5 pt-4 pb-10 text-center rounded-b-[50%/24px]`}>
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              aria-label="Kapat"
              className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <X size={30} weight="bold" />
            </button>
            <button
              onClick={onShare}
              aria-label="Paylaş"
              className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <ShareNetwork size={26} weight="bold" />
            </button>
          </div>
          <h2 className="font-batangas text-4xl font-extrabold text-white tracking-tight drop-shadow-sm leading-none mt-1">
            {title}
          </h2>
          <p className="text-white/90 text-lg font-medium mt-1.5">
            {reason || statusText}
          </p>

          {/* Mod rozeti */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-0 translate-y-1/2">
            <span className="inline-flex items-center gap-1.5 bg-[#141f1b] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
              {mode === 'local' && (
                <>
                  <MonitorPlay size={13} weight="fill" className="text-emerald-300" /> Ekranda Oyna
                </>
              )}
              {mode === 'bot' && (
                <>
                  <Robot size={13} weight="fill" className="text-cyan-300" /> Bot ile Oyna
                </>
              )}
              {mode === 'online' && (
                <>
                  <WifiHigh size={13} weight="bold" className="text-emerald-300" /> Çevrimiçi Oyna
                </>
              )}
            </span>
          </div>
        </div>

        {/* ── Gövde ── */}
        <div className={`px-5 pt-7 pb-5 flex flex-col gap-4 ${bodyBg}`}>
          {/* Bot istatistik paneli */}
          {mode === 'bot' && (
            <div className={`${panelBg} border rounded-2xl px-4 py-3 flex items-center justify-between`}>
              <div className="text-left">
                <p className={`text-[11px] font-bold ${mutedText} uppercase tracking-wider`}>
                  Doğruluk
                </p>
                <p className={`font-batangas text-2xl font-extrabold ${strongText}`}>
                  %{playerAccuracy ?? 78}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-[11px] font-bold ${mutedText} uppercase tracking-wider`}>
                  Bot seviyesi
                </p>
                <p className={`font-bold text-sm ${strongText}`}>
                  {botDifficultyLabel ?? 'Orta Bot'}
                </p>
                <p className={`text-xs ${mutedText}`}>{totalMoves} hamle</p>
              </div>
            </div>
          )}

          {/* Online istatistik paneli */}
          {mode === 'online' && (
            <div className="flex flex-col gap-2">
              {typeof eloDelta === 'number' && (
                <div className="flex items-center justify-center">
                  <span
                    className={`font-batangas text-2xl font-extrabold ${eloPositive ? 'text-emerald-600' : eloNegative ? 'text-red-500' : mutedText}`}
                  >
                    {eloPositive ? `+${eloDelta} ELO` : eloNegative ? `${eloDelta} ELO` : 'ELO değişmedi'}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className={`${panelBg} border rounded-2xl px-3 py-2.5 text-left`}>
                  <p className={`text-xs font-bold ${strongText} truncate`}>{whiteName}</p>
                  <p className={`text-[11px] ${mutedText} font-semibold`}>
                    {whiteRating ? `${whiteRating} ELO` : '—'}
                    {typeof whiteAccuracy === 'number' ? ` • %${whiteAccuracy}` : ''}
                  </p>
                </div>
                <div className={`${panelBg} border rounded-2xl px-3 py-2.5 text-left`}>
                  <p className={`text-xs font-bold ${strongText} truncate`}>{blackName}</p>
                  <p className={`text-[11px] ${mutedText} font-semibold`}>
                    {blackRating ? `${blackRating} ELO` : '—'}
                    {typeof blackAccuracy === 'number' ? ` • %${blackAccuracy}` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Local mod: kısa sonuç özeti */}
          {mode === 'local' && (
            <p className={`text-center text-sm ${mutedText} font-medium -mt-1`}>
              {isDraw ? statusText : `${winner === 'white' ? whiteName : blackName} • ${totalMoves} hamle`}
            </p>
          )}

          {/* Birincil aksiyon */}
          <button
            onClick={onGameReview}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-batangas text-2xl font-extrabold py-4 rounded-2xl shadow-[0_6px_16px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
          >
            Oyun Analizi
          </button>

          {/* İkincil aksiyonlar */}
          <div className="grid grid-cols-2 gap-3">
            {mode === 'local' && (
              <>
                <button
                  onClick={onRematch}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-xl font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Rövanş
                </button>
                <button
                  onClick={onNewGame}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-xl font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Yeni Oyun
                </button>
              </>
            )}
            {mode === 'bot' && (
              <>
                <button
                  onClick={onRetry}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-xl font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Yeniden Dene
                </button>
                <button
                  onClick={onChangeBot}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-xl font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Bot Değiştir
                </button>
              </>
            )}
            {mode === 'online' && (
              <>
                <button
                  onClick={onRequestRematch}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-lg font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Rövanş İste
                </button>
                <button
                  onClick={onFindOpponent}
                  className={`${secondaryBtn} active:scale-[0.98] font-batangas text-lg font-extrabold py-3.5 rounded-2xl shadow transition-all cursor-pointer`}
                >
                  Yeni Rakip Bul
                </button>
              </>
            )}
          </div>

          {/* Oyun-sonu serbest analiz kısayolu */}
          {onSelfAnalysis && (
            <button
              onClick={onSelfAnalysis}
              className={`w-full border ${tertiaryBtn} active:scale-[0.98] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm`}
            >
              <MagnifyingGlassPlus size={18} weight="bold" />
              <span>Kendi Kendine Analiz</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
