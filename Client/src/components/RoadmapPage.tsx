import React, { FC } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { PageState, NotificationType } from '../types';

interface RoadmapPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

const levels = [
  {
    id: 5, title: "Timur'un Sarayı", sub: 'Büyük Usta',
    locked: true, active: false, complete: false,
    color: '#f59e0b', pos: { top: '4%', right: '8%' }, icon: '👑', delay: '0.8s',
  },
  {
    id: 4, title: 'Taktikler', sub: 'İleri Seviye',
    locked: true, active: false, complete: false,
    color: '#a78bfa', pos: { top: '22%', left: '6%' }, icon: '⚔️', delay: '0.6s',
  },
  {
    id: 3, title: 'Strateji', sub: 'Orta Seviye',
    locked: true, active: false, complete: false,
    color: '#34d399', pos: { top: '40%', right: '10%' }, icon: '🧠', delay: '0.4s',
  },
  {
    id: 2, title: 'Taş Hareketleri', sub: 'Başlangıç',
    locked: false, active: false, complete: false,
    color: '#60a5fa', pos: { top: '57%', left: '12%' }, icon: '♟️', delay: '0.2s',
  },
  {
    id: 1, title: 'Timur Satrancı Hakkında', sub: 'Başlangıç',
    locked: false, active: true, complete: false,
    color: '#00d4c4', pos: { top: '72%', left: '30%' }, icon: '📜', delay: '0s',
  },
];

export const RoadmapPage: FC<RoadmapPageProps> = ({ onNavigate, showNotification }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Arka plan */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(0,212,196,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(167,139,250,0.04) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-2 relative z-10 flex-shrink-0">
        <button onClick={() => onNavigate('LEARN_MENU')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </div>
        </button>
        <div>
          <h1 className="font-batangas text-[1.9rem] font-bold text-white tracking-wide leading-none">
            Timur'a Giden Yol
          </h1>
          <p className="text-white/40 text-xs mt-0.5">1 / 5 bölüm tamamlandı</p>
        </div>
      </div>

      {/* Harita alanı */}
      <div className="flex-1 relative overflow-hidden">
        {/* SVG bağlantı yolları */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M 48% 82% Q 40% 68% 28% 67%" fill="none" stroke="rgba(0,212,196,0.35)" strokeWidth="3" strokeDasharray="8 5" filter="url(#glow)" />
          <path d="M 28% 63% Q 50% 53% 68% 50%" fill="none" stroke="rgba(96,165,250,0.25)" strokeWidth="3" strokeDasharray="8 5" />
          <path d="M 70% 47% Q 35% 38% 22% 30%" fill="none" stroke="rgba(52,211,153,0.2)" strokeWidth="3" strokeDasharray="8 5" />
          <path d="M 22% 28% Q 55% 18% 72% 12%" fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="3" strokeDasharray="8 5" />
        </svg>

        {/* Level düğümleri */}
        {levels.map((lvl) => (
          <div
            key={lvl.id}
            className="absolute flex flex-col items-center z-10 animate-float"
            style={{ ...lvl.pos, animationDelay: lvl.delay }}
          >
            <button
              onClick={() => {
                if (lvl.locked) {
                  showNotification(`${lvl.title} henüz kilitli! 🔒`, 'info');
                } else if (lvl.id === 1) {
                  onNavigate('LESSON_1');
                } else {
                  showNotification(`${lvl.title} başlatılıyor...`, 'success');
                }
              }}
              className="relative focus:outline-none"
            >
              <svg
                viewBox="0 0 140 120"
                className={`w-[110px] h-[96px] transition-transform active:scale-95 ${lvl.active ? 'drop-shadow-[0_0_16px_rgba(0,212,196,0.7)]' : ''}`}
              >
                {lvl.active && <ellipse cx="70" cy="62" rx="48" ry="22" fill={`${lvl.color}25`} />}
                <path d="M 70 55 L 125 82 L 70 108 L 15 82 Z" fill="rgba(0,0,0,0.5)" style={{ filter: 'blur(4px)' }} />
                <path d="M 15 72 L 70 98 L 70 108 L 15 82 Z" fill={lvl.locked ? '#243428' : lvl.active ? '#00838f' : '#2a4a38'} />
                <path d="M 70 98 L 125 72 L 125 82 L 70 108 Z" fill={lvl.locked ? '#1a2820' : lvl.active ? '#006470' : '#1e3628'} />
                <path d="M 70 42 L 125 68 L 70 94 L 15 68 Z" fill={lvl.locked ? '#3a5040' : lvl.active ? `url(#grad${lvl.id})` : `${lvl.color}55`} />
                {lvl.locked ? (
                  <path d="M 63 56 L 77 56 L 77 65 L 63 65 Z M 66 50 C 66 46 74 46 74 50 L 74 56 L 66 56 Z" fill="none" stroke="#3a5040" strokeWidth="2.5" />
                ) : (
                  <text x="70" y="74" textAnchor="middle" fontSize="18" dominantBaseline="middle">{lvl.icon}</text>
                )}
                <defs>
                  <linearGradient id={`grad${lvl.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={lvl.color} />
                    <stop offset="100%" stopColor={`${lvl.color}88`} />
                  </linearGradient>
                </defs>
              </svg>
              {lvl.active && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ background: `radial-gradient(circle, ${lvl.color}44, transparent)`, animationDuration: '2s' }}
                />
              )}
            </button>

            {/* Etiket */}
            <div className="mt-1.5 text-center">
              <div
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                style={{
                  background: lvl.locked ? 'rgba(0,0,0,0.5)' : `${lvl.color}22`,
                  color: lvl.locked ? 'rgba(255,255,255,0.3)' : lvl.color,
                  borderColor: lvl.locked ? 'rgba(255,255,255,0.06)' : `${lvl.color}44`,
                }}
              >
                {lvl.id}. {lvl.title.length > 16 ? lvl.title.slice(0, 14) + '…' : lvl.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alt aktif ders kartı */}
      <div className="flex-shrink-0 px-5 pb-6 relative z-10">
        <div
          className="rounded-2xl p-4 border flex items-center gap-4"
          style={{
            background: 'rgba(0,212,196,0.08)',
            borderColor: 'rgba(0,212,196,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: 'rgba(0,212,196,0.15)', border: '1px solid rgba(0,212,196,0.3)' }}
          >
            📜
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[#00d4c4] font-bold uppercase tracking-wider mb-0.5">Aktif Bölüm</div>
            <div className="font-batangas text-base font-bold text-white truncate">1. Timur Satrancı Hakkında</div>
            <div className="text-white/40 text-xs mt-0.5">Başlangıç Seviyesi</div>
          </div>
          <button
            onClick={() => onNavigate('LESSON_1')}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#00d4c4', boxShadow: '0 4px 14px rgba(0,212,196,0.45)' }}
          >
            <Play size={16} fill="#0d2818" color="#0d2818" />
          </button>
        </div>
      </div>
    </div>
  );
};
