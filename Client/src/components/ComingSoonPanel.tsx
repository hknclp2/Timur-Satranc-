import React, { FC } from 'react';
import { ArrowLeft } from 'lucide-react';

interface ComingSoonPanelProps {
  title: string;
  headline?: string;
  subtext?: string;
  onClose: () => void;
}

/**
 * ComingSoonPanel — Henüz hazır olmayan ekranlar için yer tutucu.
 * Arka plan yeşil, ön plan krem; ikon kullanılmaz.
 */
export const ComingSoonPanel: FC<ComingSoonPanelProps> = ({
  title,
  headline = "Hakan'ın otağında hazırlanıyor",
  subtext = 'Çok yakında burada olacak.',
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#1a4228] flex flex-col overflow-y-auto custom-scrollbar animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-3 border-b border-white/10 sticky top-0 bg-[#1a4228] z-20">
        <button
          onClick={onClose}
          className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Geri"
        >
          <ArrowLeft size={26} strokeWidth={2.5} />
        </button>
        <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
          {title}
        </h2>
      </div>

      {/* İçerik */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-[#f5eedc] rounded-3xl px-8 py-10 w-full max-w-sm text-center shadow-xl border border-[#e5dcce] flex flex-col gap-2">
          <h3 className="font-batangas text-2xl font-bold text-[#141f1b] leading-snug">
            {headline}
          </h3>
          <p className="text-[#5c6c66] text-sm font-medium">
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
};
