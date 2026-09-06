import React, { FC } from 'react';
import { List, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface ControlBarProps {
  onPrevious: () => void;
  onNext: () => void;
  onOptionsClick: () => void;
  onTogglePause?: () => void;
  canPrevious: boolean;
  canNext: boolean;
  isPaused?: boolean;
}

export const ControlBar: FC<ControlBarProps> = ({
  onPrevious,
  onNext,
  onOptionsClick,
  onTogglePause,
  canPrevious,
  canNext,
  isPaused = false,
}) => {
  return (
    <div className="w-full bg-[#f4eedd] border-t border-[#e2d8c3] px-6 py-2.5 flex items-center justify-around select-none z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
      {/* 1. Seçenekler */}
      <button
        onClick={onOptionsClick}
        className="flex flex-col items-center justify-center gap-1 text-[#141f1b] hover:opacity-80 active:scale-90 transition-all cursor-pointer min-w-[56px]"
      >
        <List size={24} strokeWidth={2.5} />
        <span className="text-[11px] font-bold tracking-tight">Seçenekler</span>
      </button>

      {/* 2. Durdur / Devam Et */}
      <button
        onClick={onTogglePause}
        className="flex flex-col items-center justify-center gap-1 text-[#141f1b] hover:opacity-80 active:scale-90 transition-all cursor-pointer min-w-[56px]"
        title={isPaused ? 'Oyuna Devam Et' : 'Oyunu Duraklat'}
      >
        {isPaused ? (
          <Play size={24} strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Pause size={24} strokeWidth={2.5} fill="currentColor" />
        )}
        <span className="text-[11px] font-bold tracking-tight">
          {isPaused ? 'Devam' : 'Durdur'}
        </span>
      </button>

      {/* 3. Önceki Hamle (Previous Move) */}
      <button
        onClick={onPrevious}
        disabled={!canPrevious}
        className={`flex flex-col items-center justify-center gap-1 transition-all min-w-[56px] ${canPrevious
            ? 'text-[#141f1b] hover:opacity-80 active:scale-90 cursor-pointer'
            : 'text-[#9c9586] opacity-40 cursor-not-allowed'
          }`}
        title="Önceki Hamle"
      >
        <ChevronLeft size={24} strokeWidth={3} />
        <span className="text-[11px] font-bold tracking-tight">Önceki</span>
      </button>

      {/* 4. Sonraki Hamle (Next Move) */}
      <button
        onClick={onNext}
        disabled={!canNext}
        className={`flex flex-col items-center justify-center gap-1 transition-all min-w-[56px] ${canNext
            ? 'text-[#141f1b] hover:opacity-80 active:scale-90 cursor-pointer'
            : 'text-[#9c9586] opacity-40 cursor-not-allowed'
          }`}
        title="Sonraki Hamle"
      >
        <ChevronRight size={24} strokeWidth={3} />
        <span className="text-[11px] font-bold tracking-tight">Sonraki</span>
      </button>
    </div>
  );
};
