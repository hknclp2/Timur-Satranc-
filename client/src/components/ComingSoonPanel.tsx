import React, { FC } from 'react';
import { X, CastleTurret } from '@phosphor-icons/react';

interface ComingSoonPanelProps {
  title: string;
  headline?: string;
  subtext?: string;
  onClose: () => void;
}

/**
 * ComingSoonPanel — Henüz hazır olmayan özellikler için ortalanmış Modal Dialog.
 * Arkada yarı saydam karartma vardır; dışarı tıklanınca veya "Anladım" ile kapanır.
 */
export const ComingSoonPanel: FC<ComingSoonPanelProps> = ({
  title,
  headline = "Hakan'ın otağında hazırlanıyor",
  subtext = 'Çok yakında burada olacak.',
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Modal Kartı (tıklama yayılmasını engelle) */}
      <div
        className="bg-[#f5eedc] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl relative animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat X Butonu */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#e8deca] hover:bg-[#dfd4be] text-[#5c6c66] hover:text-[#141f1b] flex items-center justify-center transition"
          aria-label="Kapat"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Otağ / Kale İkonu Rozeti */}
        <div className="w-16 h-16 rounded-full bg-[#e8deca] border border-[#cfc4ad] flex items-center justify-center text-[#0c4e48] shadow-md">
          <CastleTurret size={32} weight="duotone" />
        </div>

        {/* Başlık ve Özellik Bilgisi */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#00d4c4]/20 text-[#0c4e48] border border-[#00d4c4]/40">
            {title}
          </span>
          <h3 className="font-batangas text-2xl font-bold text-[#141f1b] leading-tight mt-1">
            {headline}
          </h3>
        </div>

        {/* Açıklama Metni */}
        <p className="text-[#5c6c66] text-sm leading-relaxed px-2">
          {subtext}
        </p>

        {/* Tamam / Anladım Butonu */}
        <button
          onClick={onClose}
          className="w-full bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer text-sm mt-2"
        >
          Anladım
        </button>
      </div>
    </div>
  );
};
