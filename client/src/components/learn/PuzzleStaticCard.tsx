import React, { FC } from 'react';
import { Lock } from '@phosphor-icons/react';
import type { LearnPuzzle } from '../../learn/learnContent';

interface PuzzleStaticCardProps {
  puzzle: LearnPuzzle;
  index: number;
  onLockedClick: () => void;
}

/**
 * Statik bulmaca kartı (Faz-1): oynanabilir değil, kilitlidir.
 * Tıklama -> showNotification(info).
 */
export const PuzzleStaticCard: FC<PuzzleStaticCardProps> = ({ puzzle, index, onLockedClick }) => (
  <button
    onClick={onLockedClick}
    className="w-full text-left rounded-2xl p-4 border border-[#e5dcce] bg-[#f5eedc] shadow-md flex gap-3 active:scale-[0.99] transition-all"
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#141f1b]/10 bg-[#141f1b]/5 text-[#141f1b]/60 font-batangas font-bold">
      {index + 1}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[15px] font-bold text-[#141f1b] leading-snug">{puzzle.title}</div>
      <p className="text-[#5c6c66] text-sm mt-1 leading-relaxed">{puzzle.desc}</p>
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#5c6c66]">
        <Lock size={11} weight="bold" />
        <span>Bulmaca motoru sonraki fazda — teori slaytlarını tekrar et</span>
      </div>
    </div>
  </button>
);
