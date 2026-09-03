import React, { FC } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { PageState, NotificationType } from '../types';
import logoImg from '../assets/logo.png';

interface Lesson1PageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  slideIdx: number;
  setSlideIdx: (idx: number | ((prev: number) => number)) => void;
}

const slides = [
  {
    emoji: '👑',
    title: 'Timur Satrancı Nedir?',
    body: "Timur Satrancı (Şatranj-ı Timuri), 14. yüzyılda Büyük Timur'un sarayında geliştirilmiş tarihin en zengin satranç varyasyonudur. Standart satrancın 8×8 tahtası yerine 10×11 büyüklüğünde bir tahta kullanılır.",
  },
  {
    emoji: '📏',
    title: 'Tahta ve Taşlar',
    body: 'Timur Satrancında standart taşlara ek olarak Deve, Zürafa, Mancınık ve Fers gibi özel taşlar bulunur. Her taşın kendine özgü hareket kuralları vardır. Bu zengin taş çeşitliliği oyunun stratejik derinliğini artırır.',
  },
  {
    emoji: '📜',
    title: 'Tarihi Arka Plan',
    body: "Oyunun kuralları tarihçi al-Amin al-Kashani'nin 14. yüzyıl yazıtlarından derlenmiştir. Timur'un sarayında oynanan bu oyun, İpek Yolu üzerinden tüm Orta Asya'ya yayılmıştır.",
  },
  {
    emoji: '🎯',
    title: 'Oyunun Amacı',
    body: "Amaç standart satrançta olduğu gibi rakibin Şah'ını mat etmektir. Ancak daha geniş tahta ve ek taşlar sayesinde maça giden yollar çok daha zengin ve yaratıcıdır.",
  },
];

export const Lesson1Page: FC<Lesson1PageProps> = ({ onNavigate, showNotification, slideIdx, setSlideIdx }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Arka plan */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,196,0.07) 0%, transparent 60%)' }}
        />
      </div>

      {/* Başlık */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 relative z-10 flex-shrink-0">
        <button onClick={() => onNavigate('ROADMAP')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </div>
        </button>
        <div className="text-center">
          <div className="text-[#00d4c4] text-[10px] font-bold uppercase tracking-widest">Bölüm 1</div>
          <h1 className="font-batangas text-lg font-bold text-white leading-tight">Timur Satrancı Hakkında</h1>
        </div>
        <div className="text-white/30 text-xs font-semibold">{slideIdx + 1}/{slides.length}</div>
      </div>

      {/* İlerleme noktaları */}
      <div className="flex gap-2 justify-center pb-4 flex-shrink-0 relative z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === slideIdx ? '24px' : '6px',
              background: i === slideIdx ? '#00d4c4' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Slayt içeriği */}
      <div className="flex-1 px-5 relative z-10 flex flex-col">
        <div
          key={slideIdx}
          className="flex-1 rounded-3xl p-6 flex flex-col border animate-zoom-in"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(0,212,196,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="text-5xl mb-4 text-center">{slides[slideIdx].emoji}</div>
          <h2 className="font-batangas text-2xl font-bold text-white text-center mb-4 leading-tight">
            {slides[slideIdx].title}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed text-center flex-1">{slides[slideIdx].body}</p>
          <div className="flex justify-center mt-6 opacity-20">
            <img src={logoImg} alt="" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </div>

      {/* Gezinme butonları */}
      <div className="px-5 pt-4 pb-8 flex gap-3 relative z-10 flex-shrink-0">
        <button
          onClick={() => setSlideIdx((s) => Math.max(0, s - 1))}
          disabled={slideIdx === 0}
          className="flex-1 py-4 rounded-2xl border border-white/10 text-white/50 font-bold text-sm disabled:opacity-30 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          ← Önceki
        </button>
        {slideIdx < slides.length - 1 ? (
          <button
            onClick={() => setSlideIdx((s) => s + 1)}
            className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00d4c4, #00a896)',
              color: '#0d2818',
              boxShadow: '0 6px 20px rgba(0,212,196,0.4)',
            }}
          >
            Sonraki →
          </button>
        ) : (
          <button
            onClick={() => {
              showNotification('Tebrikler! Bölüm 1 tamamlandı! 🎉', 'success');
              onNavigate('ROADMAP');
            }}
            className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#1a0a00',
              boxShadow: '0 6px 20px rgba(245,158,11,0.4)',
            }}
          >
            <Trophy size={16} />
            Tamamla!
          </button>
        )}
      </div>
    </div>
  );
};
