import React, { FC } from 'react';
import { CLASSIFICATION_METAS, MoveClassificationType } from '../../analyzer/types';

interface CoachBubbleProps {
  classification?: MoveClassificationType | null;
  evalCp?: number | null;
  coachComment?: string;
  tacticalNote?: string;
  bestMoveReason?: string;
  isIntro?: boolean;
  introTitle?: string;
  introSummary?: string;
}

function formatCentipawns(cp: number): string {
  const pawns = cp / 100;
  const sign = pawns > 0 ? '+' : '';
  return `${sign}${pawns.toFixed(1)}`;
}

export const CoachBubble: FC<CoachBubbleProps> = ({
  classification,
  evalCp,
  coachComment,
  tacticalNote,
  bestMoveReason,
  isIntro = false,
  introTitle,
  introSummary,
}) => {
  const meta = classification ? CLASSIFICATION_METAS[classification] : null;

  return (
    <div className="w-full flex items-start gap-2.5 sm:gap-3.5 px-2">
      {/* Coach Avatar */}
      <div className="relative shrink-0 mt-0.5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-emerald-400/60 shadow-lg bg-gradient-to-b from-[#2b5840] to-[#12281c] flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full p-1" fill="none">
            {/* Coach Graphic illustration */}
            <circle cx="32" cy="22" r="12" fill="#ffd199" />
            <path
              d="M18 20 C18 10, 46 10, 46 20 C46 24, 44 26, 42 27 C38 29, 26 29, 22 27 Z"
              fill="#2a201c"
            />
            {/* Hair front & smile */}
            <path d="M22 18 Q32 10 42 18" stroke="#2a201c" strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="22" r="1.5" fill="#2a201c" />
            <circle cx="36" cy="22" r="1.5" fill="#2a201c" />
            <path d="M29 27 Q32 30 35 27" stroke="#b05030" strokeWidth="1.5" strokeLinecap="round" />
            {/* Coat/Jacket */}
            <path d="M14 54 C14 38, 50 38, 50 54 Z" fill="#1e3e2e" />
            <path d="M26 38 L32 46 L38 38 Z" fill="#ffffff" />
            <path d="M30 42 L32 48 L34 42 Z" fill="#00d4c4" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#153423] flex items-center justify-center text-[10px] text-white font-bold">
          ✓
        </div>
      </div>

      {/* Speech Bubble */}
      <div className="relative flex-1 bg-white text-[#18261e] rounded-2xl p-3 sm:p-3.5 shadow-xl border border-white/20 animate-fade-in text-left">
        {/* Pointer notch to avatar */}
        <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white" />

        {isIntro ? (
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#123020]">{introTitle}</h3>
            <p className="text-xs sm:text-sm text-[#3b5545] font-medium mt-1 leading-snug">
              {introSummary}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Header: Classification + Eval */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5">
              {meta ? (
                <div className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full ${meta.badgeBg} ${meta.badgeText} flex items-center justify-center font-extrabold text-[10px] shadow-sm`}
                  >
                    {meta.symbol}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-gray-900">{meta.labelTR}</span>
                </div>
              ) : (
                <span className="font-bold text-xs text-gray-700">Hamle İncelemesi</span>
              )}

              {typeof evalCp === 'number' && (
                <span className="bg-[#f0f4f1] text-[#1c3829] font-extrabold text-xs px-2 py-0.5 rounded-md">
                  {formatCentipawns(evalCp)}
                </span>
              )}
            </div>

            {/* Comment */}
            <p className="text-xs sm:text-sm text-gray-800 font-medium leading-snug">
              {coachComment}
            </p>

            {/* Tactical or Best Move Extra Note */}
            {tacticalNote && (
              <div className="bg-emerald-50 border border-emerald-200/60 rounded-lg p-2 text-[11px] sm:text-xs text-emerald-950 font-semibold mt-0.5">
                💡 {tacticalNote}
              </div>
            )}
            {bestMoveReason && !tacticalNote && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-2 text-[11px] sm:text-xs text-amber-950 font-semibold mt-0.5">
                🎯 {bestMoveReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
