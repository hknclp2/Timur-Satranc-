import React, { FC } from 'react';
import { ArrowLeft, Map, Shield, Cpu, ChevronRight, Lock, Trophy } from 'lucide-react';
import { PageState, NotificationType } from '../types';

interface LearnMenuPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

const learnItems = [
  {
    id: 'mobile-roadmap-btn',
    label: 'Yol Haritası',
    desc: 'Adım adım Timur Satrancını öğren',
    icon: <Map size={28} />,
    color: '#00d4c4',
    glow: 'rgba(0, 212, 196, 0.35)',
    progress: 20,
    badge: '1/5',
    page: 'ROADMAP' as PageState,
  },
  {
    id: 'mobile-rules-btn',
    label: 'Kurallar',
    desc: 'Taş hareketleri ve oyun kuralları',
    icon: <Shield size={28} />,
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
    progress: 0,
    badge: 'Yeni',
    page: 'RULES' as PageState,
  },
];

export const LearnMenuPage: FC<LearnMenuPageProps> = ({ onNavigate, showNotification }) => {
  return (
    <div className="mobile-screen flex flex-col bg-[#122b1e] relative overflow-hidden select-none">
      {/* Arka plan süslemeleri */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#0d2218] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a1d14] to-transparent" />
        <div className="absolute top-20 right-[-60px] w-56 h-56 rounded-full bg-[rgba(0,212,196,0.05)] blur-3xl" />
        <div className="absolute bottom-20 left-[-40px] w-48 h-48 rounded-full bg-[rgba(167,139,250,0.05)] blur-3xl" />
      </div>

      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-2 relative z-10">
        <button onClick={() => onNavigate('MAIN_MENU')} className="mobile-back-btn" aria-label="Geri">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </div>
        </button>
        <div>
          <h1 className="font-batangas text-[2.2rem] font-bold text-white tracking-wide leading-none">Öğren</h1>
          <p className="text-white/40 text-xs mt-0.5">Timur Satrancını keşfet</p>
        </div>
      </div>

      {/* Genel ilerleme çubuğu */}
      <div className="px-5 mt-3 mb-5 relative z-10">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/[0.08] backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-xs font-semibold">Genel İlerleme</span>
            <span className="text-[#00d4c4] text-xs font-bold">%20</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '20%',
                background: 'linear-gradient(90deg, #00d4c4, #00e5ff)',
                boxShadow: '0 0 8px rgba(0, 229, 255, 0.5)',
              }}
            />
          </div>
          <div className="flex gap-1 mt-2.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${s === 1 ? 'bg-[#00d4c4]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Modül kartları */}
      <div className="flex flex-col gap-4 px-5 pb-10 relative z-10 overflow-y-auto custom-scrollbar flex-1">
        {learnItems.map((item) => (
          <button
            key={item.id}
            id={item.id}
            onClick={() => onNavigate(item.page)}
            className="w-full text-left rounded-2xl overflow-hidden border border-white/[0.08] active:scale-[0.98] transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
            }}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* İkon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`,
                    border: `1.5px solid ${item.color}33`,
                    color: item.color,
                    boxShadow: `0 4px 16px ${item.glow}`,
                  }}
                >
                  {item.icon}
                </div>

                {/* Metin */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-batangas text-xl font-bold text-white leading-tight">{item.label}</span>
                    <div
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: `${item.color}22`,
                        color: item.color,
                        border: `1px solid ${item.color}44`,
                      }}
                    >
                      {item.badge}
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">{item.desc}</p>

                  {/* İlerleme */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.progress}%`,
                          background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                        }}
                      />
                    </div>
                    <span className="text-white/30 text-[10px] font-semibold flex-shrink-0">%{item.progress}</span>
                  </div>
                </div>

                <ChevronRight size={18} className="text-white/20 flex-shrink-0 mt-1" />
              </div>
            </div>
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${item.color}88, transparent)` }} />
          </button>
        ))}

        {/* Yakında (kilitli kart) */}
        <div className="rounded-2xl border border-white/5 p-5 flex items-center gap-4 opacity-50">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Cpu size={24} className="text-white/30" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-batangas text-lg font-bold text-white/40">Analiz Motoru</span>
              <Lock size={12} className="text-white/20" />
            </div>
            <p className="text-white/20 text-xs mt-0.5">Çok yakında açılıyor</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 p-5 flex items-center gap-4 opacity-50">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Trophy size={24} className="text-white/30" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-batangas text-lg font-bold text-white/40">Turnuva Rehberi</span>
              <Lock size={12} className="text-white/20" />
            </div>
            <p className="text-white/20 text-xs mt-0.5">Çok yakında açılıyor</p>
          </div>
        </div>
      </div>
    </div>
  );
};
