import React, { FC } from 'react';
import { X, Heart } from '@phosphor-icons/react';
import okulLogo from '../assets/okulLogo.png';
import logoImg from '../assets/logo.png';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div
        className="bg-[#0e271a] border border-[#2d5f42]/60 rounded-3xl w-full max-w-[540px] p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative text-white animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
          aria-label="Kapat"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Üst Logo ve Başlık */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border-2 border-[#00d4c4]/40 p-2 flex items-center justify-center shadow-[0_0_25px_rgba(0,212,196,0.2)]">
              <img src={okulLogo} alt="Kurum Logosu" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#143825] border border-white/20 flex items-center justify-center shadow">
              <img src={logoImg} alt="Timur Satrancı" className="w-5 h-5 object-contain" />
            </div>
          </div>

          <h2 className="font-batangas text-2xl md:text-3xl font-bold text-white tracking-wide">
            Hakkında & Emeği Geçenler
          </h2>
          <span className="text-xs font-semibold text-[#00d4c4] tracking-widest uppercase mt-1">
            Timur Satrancı Projesi • v1.0
          </span>
        </div>

        {/* İçerik Bölümleri */}
        <div className="flex flex-col gap-4 text-sm text-[#A7BDB1] max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Proje Amacı */}
          <div className="bg-[#143825]/70 border border-[#2d5f42]/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white font-bold mb-1.5">
              <span>Proje Hakkında</span>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-white/80">
              Bu proje; Türk-İslam tarihinin kadim mirası olan 112 karelik Timur Satrancı'nı modern teknolojiyle buluşturmak, stratejik derinliğini yeni nesillere interaktif ve eğlenceli bir deneyimle aktarmak amacıyla geliştirilmiştir.
            </p>
          </div>

          {/* Kurum & Ekip Bilgisi (İleride güncellenecek alan) */}
          <div className="bg-[#143825]/70 border border-[#2d5f42]/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white font-bold mb-2">
              <span>Geliştirme & Koordinasyon</span>
            </div>
            <div className="flex flex-col gap-2 text-xs md:text-sm text-white/80">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#A7BDB1]">Etimesgut Şehit Ömer Halisdemir Anadlou Lisesi tarafından geliştirilmiştir.</span>
                <span className="font-semibold text-white"></span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#A7BDB1]">Takım: </span>
                <span className="font-semibold text-white">ŞÖHAL TECH / HalisTech</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#A7BDB1]">2026 Teknofest İnsanlık Yararına Teknolojiler Yarışması Eğitim, Kültür Ve Dijital Deneyim Kategorisi </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#A7BDB1]">Danışman Öğretmen: </span>
                <span className="font-semibold text-white">Sema ERASLAN PAKSU</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#A7BDB1]">Geliştirici: </span>
                <span className="font-semibold text-white">Hakan Celep</span>
              </div>
            </div>
          </div>

          {/* Teşekkür & Telif */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/50 text-center pt-2">
            <Heart size={14} weight="fill" className="text-rose-400" />
            <span>Tüm katkı sağlayanlara teşekkür ederiz.</span>
          </div>
        </div>

        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-bold text-sm shadow-[0_4px_16px_rgba(0,212,196,0.3)] transition-all cursor-pointer text-center"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
