import React, { FC } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { GameMode } from '../types';

interface GameHUDProps {
  gameMode: GameMode;
  onExitGame: () => void;
  onResetGame?: () => void;
}

export const GameHUD: FC<GameHUDProps> = ({
  gameMode,
  onExitGame,
  onResetGame,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);

  const getModeTitle = () => {
    switch (gameMode) {
      case 'bot_easy':
        return 'Kolay Bot Karşılaşması';
      case 'bot_medium':
        return 'Orta Bot Karşılaşması';
      case 'bot_hard':
        return 'Zor Bot Karşılaşması';
      case 'online':
        return 'Çevrimiçi Karşılaşma';
      default:
        return 'Timur Satrancı';
    }
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5 select-none">
      {/* Üst Bar: Geri Dön, Oyun Başlığı, Ses & Reset */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto bg-[#0a2218]/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg animate-fade-in">
        <button
          onClick={onExitGame}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
          aria-label="Ana Menüye Dön"
          title="Ana Menüye Dön"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-[#00e5ff] font-bold tracking-widest uppercase">
            CANLI MAÇ
          </span>
          <h2 className="font-batangas text-sm font-bold text-white tracking-wide truncate max-w-[160px] sm:max-w-[200px]">
            {getModeTitle()}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onResetGame && (
            <button
              onClick={onResetGame}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
              aria-label="Yeniden Başlat"
              title="Yeniden Başlat"
            >
              <RotateCcw size={18} />
            </button>
          )}

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
            aria-label={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Alt Bar veya Bildirim Geçiş Alanı - Pointer Events None bırakıldı */}
      <div className="flex items-center justify-center pointer-events-none pb-2">
        <div className="bg-black/40 backdrop-blur-sm border border-white/5 px-4 py-1.5 rounded-full text-white/50 text-xs">
          Dokunarak hamle yapın
        </div>
      </div>
    </div>
  );
};
