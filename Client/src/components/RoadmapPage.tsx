import React, { FC } from 'react';
import { ArrowLeft, Play, Check } from '@phosphor-icons/react';
import { PageState, NotificationType } from '../types';
import { LEARN_LEVELS } from '../learn/learnContent';
import { useLearnProgress } from '../learn/learnProgress';
import { XPBadge } from './learn/XPBadge';

interface RoadmapPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  /** Yeni akış: seviyeye dokununca LessonDetail açılır. Verilmezse eski davranış korunur. */
  onOpenLevel?: (levelId: number) => void;
  /** Masaüstü panelinden doğrudan derse gitme (levelId, lessonIdx). */
  onOpenLesson?: (levelId: number, lessonIdx: number) => void;
}

// Ada merkezleri (harita % koordinatı) — patika TAM bu noktalardan geçer.
// Ada görseli 136x118 px; blok üstü = merkezY - 59. Harita 1000px.
const ISLAND_CENTERS: Record<number, { cx: number; cy: number }> = {
  6: { cx: 76, cy: 110 },
  5: { cx: 24, cy: 250 },
  4: { cx: 74, cy: 390 },
  3: { cx: 26, cy: 530 },
  2: { cx: 76, cy: 670 },
  1: { cx: 32, cy: 810 },
};

// Merkezden kutu konumuna: 136px'lik ada, ~380px genişlikte %36 eder (yarısı %18).
// Sol kolon: left = cx - 18, sağ kolon: right = 100 - (cx + 18).
const POSITIONS: Record<number, { top: number; left?: string; right?: string }> = {
  6: { top: ISLAND_CENTERS[6].cy - 59, right: '6%' },
  5: { top: ISLAND_CENTERS[5].cy - 59, left: '6%' },
  4: { top: ISLAND_CENTERS[4].cy - 59, right: '8%' },
  3: { top: ISLAND_CENTERS[3].cy - 59, left: '8%' },
  2: { top: ISLAND_CENTERS[2].cy - 59, right: '6%' },
  1: { top: ISLAND_CENTERS[1].cy - 59, left: '14%' },
};

const MAP_HEIGHT = 1000;

// Patika: alttan (BAŞLA) başlayıp ada merkezlerinden geçerek yukarı (FİNAL) çıkan tek rota.
// viewBox 0 0 100 1000 ile ada % koordinatlarıyla birebir aynı uzay.
const TRAIL_PATH =
  'M 32 985 ' +
  'C 32 930, 32 870, 32 810 ' +
  'C 34 760, 55 715, 76 670 ' +
  'C 97 625, 55 565, 26 530 ' +
  'C 0 500, 45 435, 74 390 ' +
  'C 100 350, 55 295, 24 250 ' +
  'C 2 215, 45 150, 76 110 ' +
  'C 80 80, 78 55, 74 30';

// Ada renkleri (koyu zemin harita)
const ISLAND = {
  lockedTop: '#3a5040',
  lockedLeft: '#243428',
  lockedRight: '#1a2820',
  openLeft: '#2a4a38',
  openRight: '#1e3628',
  completeTop: '#166534',
  completeLeft: '#166534',
  completeRight: '#14532d',
};

export const RoadmapPage: FC<RoadmapPageProps> = ({ onNavigate, showNotification, onOpenLevel, onOpenLesson }) => {
  const progress = useLearnProgress();
  const { state } = progress;
  const activeId = progress.activeLevel;

  const doneLessons = state.completedLessons.length;
  const totalLessons = LEARN_LEVELS.reduce((n, l) => n + l.lessons.length, 0);

  const activeLevel = LEARN_LEVELS.find((l) => l.id === activeId) ?? LEARN_LEVELS[0];
  const activeDone = activeLevel.lessons.filter((d) => state.completedLessons.includes(d.id)).length;

  const handleNodeClick = (levelId: number) => {
    const level = LEARN_LEVELS.find((l) => l.id === levelId);
    if (!level) return;
    if (!progress.isLevelUnlocked(levelId)) {
      showNotification(`${level.unvan} henüz kilitli! 🔒 Önce önceki seviyeyi bitir.`, 'info');
      return;
    }
    if (onOpenLevel) {
      onOpenLevel(levelId);
      return;
    }
    // Geri uyumluluk
    if (levelId === 1) onNavigate('LESSON_1');
    else showNotification(`${level.title} başlatılıyor...`, 'success');
  };

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
            <ArrowLeft size={20} weight="bold" />
          </div>
        </button>
        <div className="flex-1">
          <h1 className="font-batangas text-[2.3rem] font-bold text-white tracking-wide leading-none">
            Timur'a Giden Yol
          </h1>
          <p className="text-white/50 text-sm mt-1 font-semibold">
            {doneLessons} / {totalLessons} ders • {progress.completedLevels} / 6 seviye • {progress.xp} XP
          </p>
        </div>
      </div>

      {/* Orta alan (mobilde harita; masaüstünde harita sol + seviye paneli sağ) */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:px-6 lg:pb-6 relative z-10 min-h-0">
      {/* Harita alanı — tek patikada dizili büyük adalar (kaydırılabilir) */}
      <div className="flex-1 relative overflow-y-auto custom-scrollbar lg:rounded-3xl lg:border lg:border-white/10 min-h-0">
        <div className="relative w-full" style={{ height: MAP_HEIGHT }}>
          {/* Patika: ada merkezlerinden geçen tek sürekli rota. */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
          >
            {/* Zemin (koyu kasa) */}
            <path
              d={TRAIL_PATH}
              fill="none"
              stroke="#17100a"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.9"
              vector-effect="non-scaling-stroke"
            />
            {/* Kum yol */}
            <path
              d={TRAIL_PATH}
              fill="none"
              stroke="#c49a54"
              strokeWidth="13"
              strokeLinecap="round"
              vector-effect="non-scaling-stroke"
            />
            {/* Yol içi aydınlık */}
            <path
              d={TRAIL_PATH}
              fill="none"
              stroke="#e6c886"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.7"
              vector-effect="non-scaling-stroke"
            />
            {/* Şerit çizgisi */}
            <path
              d={TRAIL_PATH}
              fill="none"
              stroke="#4a3418"
              strokeWidth="2.5"
              strokeDasharray="14 12"
              strokeLinecap="round"
              opacity="0.9"
              vector-effect="non-scaling-stroke"
            />
          </svg>

          {/* BAŞLA / FİNAL rozetleri */}
          <div className="absolute z-10 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
            style={{ left: '32%', bottom: 8, transform: 'translateX(-50%)', background: '#c49a54', color: '#1a1206', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
          >
            🚩 BAŞLA
          </div>
          <div className="absolute z-10 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
            style={{ left: '76%', top: 2, transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1a0a00', boxShadow: '0 4px 14px rgba(245,158,11,0.5)' }}
          >
            👑 FİNAL
          </div>

          {/* Level adaları (patika üzerinde, 6 üstte 1 altta) */}
          {[...LEARN_LEVELS].reverse().map((level, revIdx) => {
            const locked = !progress.isLevelUnlocked(level.id);
            const complete = level.lessons.every((d) => state.completedLessons.includes(d.id));
            const isActive = level.id === activeId && !complete;
            const pos = POSITIONS[level.id] ?? { top: revIdx * 140 };
            const topFill = locked ? ISLAND.lockedTop : complete ? ISLAND.completeTop : isActive ? `url(#grad${level.id})` : `${level.color}55`;

            return (
              <div
                key={level.id}
                className="absolute flex flex-col items-center z-10 animate-float"
                style={{ ...pos, animationDelay: `${revIdx * 0.15}s` }}
              >
                {/* Ada zemin gölgesi */}
                <div
                  className="absolute left-1/2 pointer-events-none"
                  style={{
                    top: 96,
                    width: 150,
                    height: 46,
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
                  }}
                />
                <button
                  onClick={() => handleNodeClick(level.id)}
                  className={`relative focus:outline-none rounded-2xl ${isActive ? 'ring-2 ring-white/70 drop-shadow-md' : ''}`}
                >
                  <svg
                    viewBox="0 0 140 120"
                    className="w-[clamp(104px,32vw,136px)] h-auto transition-transform active:scale-95"
                  >
                    {isActive && <ellipse cx="70" cy="62" rx="48" ry="22" fill={`${level.color}25`} />}
                    <path d="M 70 55 L 125 82 L 70 108 L 15 82 Z" fill="rgba(0,0,0,0.12)" style={{ filter: 'blur(4px)' }} />
                    <path d="M 15 72 L 70 98 L 70 108 L 15 82 Z" fill={locked ? ISLAND.lockedLeft : complete ? ISLAND.completeLeft : ISLAND.openLeft} />
                    <path d="M 70 98 L 125 72 L 125 82 L 70 108 Z" fill={locked ? ISLAND.lockedRight : complete ? ISLAND.completeRight : ISLAND.openRight} />
                    <path d="M 70 42 L 125 68 L 70 94 L 15 68 Z" fill={topFill} />
                    {locked ? (
                      <path d="M 63 56 L 77 56 L 77 65 L 63 65 Z M 66 50 C 66 46 74 46 74 50 L 74 56 L 66 56 Z" fill="none" stroke="#374151" strokeWidth="2.5" />
                    ) : complete ? (
                      <g>
                        <text x="70" y="74" textAnchor="middle" fontSize="26" dominantBaseline="middle">✅</text>
                      </g>
                    ) : (
                      <text x="70" y="74" textAnchor="middle" fontSize="26" dominantBaseline="middle">{level.icon}</text>
                    )}
                    <defs>
                      <linearGradient id={`grad${level.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={level.color} />
                        <stop offset="100%" stopColor={`${level.color}88`} />
                      </linearGradient>
                    </defs>
                  </svg>
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full animate-pulse opacity-25"
                      style={{ background: `radial-gradient(circle, ${level.color}55, transparent)` }}
                    />
                  )}
                  {complete && (
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-white shadow-sm">
                      <Check size={14} weight="bold" className="text-white" />
                    </div>
                  )}
                </button>

                {/* Etiket — krem kutu */}
                <div
                  className="mt-1.5 text-center px-3 py-2 rounded-2xl border border-[#e5dcce] bg-[#f5eedc] shadow-xl"
                  style={{
                    borderTop: `3px solid ${locked ? '#D1CBC0' : complete ? '#4A7C59' : '#D4A843'}`,
                    maxWidth: 190,
                  }}
                >
                  <div
                    className="text-sm font-bold whitespace-nowrap text-[#141f1b]"
                    style={{ opacity: locked ? 0.45 : 1 }}
                  >
                    {level.id}. {level.unvan}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-[#5c6c66] leading-snug">
                    {level.title}
                  </div>
                  <div className="mt-1.5 flex items-center justify-center">
                    <XPBadge xp={level.xp} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Masaüstü seviye paneli (mobilde gizli; alt kartın karşılığı) */}
      <aside className="hidden lg:flex flex-col gap-4 overflow-y-auto custom-scrollbar min-h-0 pr-1">
        <div className="rounded-2xl p-5 border border-[#e5dcce] bg-[#f5eedc] shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl bg-[#141f1b]/5 border border-[#141f1b]/10">
              {activeLevel.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-[#0c4e48]">
                Seviye {activeLevel.id} • {activeLevel.unvan}
              </div>
              <div className="font-batangas text-xl font-bold text-[#141f1b] leading-tight">{activeLevel.title}</div>
            </div>
          </div>
          <p className="text-[#5c6c66] text-sm leading-relaxed">
            {activeDone}/{activeLevel.lessons.length} ders • {activeLevel.baraj[0]}/{activeLevel.baraj[1]} bulmaca
            barajı • {activeLevel.sureDakika} dk
          </p>
          <div className="mt-1 text-sm text-[#5c6c66]">Rozet: <span className="text-[#141f1b] font-semibold">{activeLevel.rozet}</span></div>
          <div className="mt-3">
            <XPBadge xp={activeLevel.xp} />
          </div>
          <button
            onClick={() => handleNodeClick(activeLevel.id)}
            className="w-full mt-4 bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.98] text-[#1A1A1A] font-bold py-3 rounded-xl shadow-lg transition-all cursor-pointer text-sm"
          >
            Seviyeye git →
          </button>
        </div>
        <div className="rounded-2xl p-4 border border-[#e5dcce] bg-[#f5eedc] shadow-xl">
          <div className="text-sm font-bold text-[#141f1b] mb-2">Dersler</div>
          <div className="flex flex-col gap-2">
            {activeLevel.lessons.map((d, i) => {
              const done = state.completedLessons.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    if (onOpenLesson) onOpenLesson(activeLevel.id, i);
                    else handleNodeClick(activeLevel.id);
                  }}
                  className="w-full text-left rounded-xl px-3 py-2.5 border flex items-center gap-3 active:scale-[0.99] transition-all bg-[#e8deca] border-[#cfc4ad] hover:bg-[#dfd4be]"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold bg-[#141f1b]/5 border border-[#141f1b]/10 text-[#141f1b]">
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-[#5c6c66]">Ders {d.id}</span>
                    <span className="block text-sm font-bold text-[#141f1b] leading-snug">{d.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
      </div>

      {/* Alt aktif ders kartı (krem; mobil, masaüstünde panel var) */}
      <div className="flex-shrink-0 px-5 pb-6 relative z-10 lg:hidden">
        <div className="rounded-2xl p-4 border border-[#e5dcce] bg-[#f5eedc] shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl bg-[#141f1b]/5 border border-[#141f1b]/10">
            {activeLevel.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5 text-[#0c4e48]">
              Seviye {activeLevel.id} • {activeLevel.unvan} • {activeDone}/{activeLevel.lessons.length} ders
            </div>
            <div className="font-batangas text-lg font-bold text-[#141f1b] leading-snug line-clamp-2">{activeLevel.title}</div>
            <div className="text-[#5c6c66] text-sm mt-0.5">
              {activeLevel.baraj[0]}/{activeLevel.baraj[1]} bulmaca barajı • {activeLevel.rozet}
            </div>
          </div>
          <button
            onClick={() => handleNodeClick(activeLevel.id)}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] active:scale-90 transition-all flex items-center justify-center text-[#1A1A1A] shadow-lg"
            aria-label="Aktif seviyeyi aç"
          >
            <Play size={16} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
};
