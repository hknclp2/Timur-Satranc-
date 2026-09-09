import React, { FC } from 'react';
import { Check, CaretRight } from '@phosphor-icons/react';
import type { LearnLesson } from '../../learn/learnContent';

interface LessonCardProps {
  lesson: LearnLesson;
  index: number;
  isActive: boolean;
  isComplete: boolean;
  color: string;
  onSelect: () => void;
}

/** Seviye içi ders satırı (LessonDetail ders seçici). */
export const LessonCard: FC<LessonCardProps> = ({ lesson, index, isActive, isComplete, color, onSelect }) => (
  <button
    onClick={onSelect}
    className="w-full text-left rounded-2xl px-4 py-3 border border-[#e5dcce] bg-[#f5eedc] shadow-md flex items-center gap-3 active:scale-[0.99] transition-all"
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-batangas font-bold text-sm bg-[#141f1b]/5 border border-[#141f1b]/10 text-[#141f1b]">
      {isComplete ? <Check size={16} weight="bold" /> : `${index + 1}`}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-bold text-[#5c6c66]">Ders {lesson.id}</div>
      <div className="text-[15px] font-bold text-[#141f1b] leading-snug line-clamp-2">{lesson.title}</div>
    </div>
    <CaretRight size={16} weight="bold" className="text-[#141f1b]/30 flex-shrink-0" />
  </button>
);
