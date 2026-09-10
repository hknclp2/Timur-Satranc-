import React, { FC, useEffect, useRef } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { CLASSIFICATION_METAS, ReviewedMove } from '../../analyzer/types';

interface MoveRibbonProps {
  moves: ReviewedMove[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const MoveRibbon: FC<MoveRibbonProps> = ({
  moves,
  currentPly,
  onSelectPly,
  canPrev,
  canNext,
  onPrev,
  onNext,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeBtnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const btn = activeBtnRef.current;
      const left = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [currentPly]);

  return (
    <div className="w-full bg-[#102419] border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 shadow-md">
      {/* Previous Button */}
      <button
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Önceki hamle"
        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <CaretLeft size={18} weight="bold" />
      </button>

      {/* Horizontal Scrollable Move List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 px-1 scroll-smooth"
      >
        {moves.map((m) => {
          const isActive = currentPly === m.ply;
          const meta = CLASSIFICATION_METAS[m.classification] ?? CLASSIFICATION_METAS.good;
          const isWhite = m.playedBy === 'white';

          return (
            <button
              key={m.ply}
              ref={isActive ? activeBtnRef : null}
              onClick={() => onSelectPly(m.ply)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-gray-900 shadow-md scale-105 ring-2 ring-emerald-400'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {isWhite && <span className="opacity-50 mr-0.5">{m.moveNumber}.</span>}
              <span className="truncate">{m.notation}</span>
              <span
                className={`w-3.5 h-3.5 rounded-full ${meta.badgeBg} ${meta.badgeText} flex items-center justify-center text-[9px] font-extrabold ml-0.5`}
              >
                {meta.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!canNext}
        aria-label="Sonraki hamle"
        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <CaretRight size={18} weight="bold" />
      </button>
    </div>
  );
};
