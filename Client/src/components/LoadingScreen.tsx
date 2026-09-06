import React, { FC } from 'react';

interface LoadingScreenProps {
  progress: number; // 0-100
}

export const LoadingScreen: FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="absolute inset-0 z-20 bg-[#0d2818] flex flex-col items-center justify-center gap-5 p-8 select-none">
      {/* İkon */}
      <div className="relative w-16 h-16 flex items-center justify-center mb-2">
        <div className="w-12 h-12 rounded-full bg-[rgba(0,212,196,0.15)] border border-[rgba(0,212,196,0.3)] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00d4c4" strokeWidth="2" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <div className="text-white text-lg font-bold tracking-wide font-batangas">Yükleniyor…</div>

      {/* Progress Bar */}
      <div className="w-52 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
        <div
          className="h-full rounded-full bg-[#00d4c4] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="text-white/70 text-sm font-semibold">{progress}%</span>
    </div>
  );
};
