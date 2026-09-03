import React, { FC, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageState } from '../types';
import haritaImg from '../assets/harita.png';
import botImg from '../assets/bot.png';
import ekrandaImg from '../assets/ekrandaoyna.png';

interface BotSelectPageProps {
  onNavigate: (page: PageState) => void;
  onStartGame: (mode: string, timeSeconds: number) => void;
}

type BotKey = 'kolay' | 'orta' | 'zor';

/* ─── Taç Seçici ─────────────────────────────────────────────────── */
function CrownSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`bg-[#387e5c] text-white py-1.5 px-3 rounded-lg flex items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 ${
            value === n ? 'ring-2 ring-yellow-400 scale-105 shadow-md' : 'opacity-55 hover:opacity-80'
          }`}
        >
          {Array.from({ length: n }).map((_, i) => (
            <span key={i} className="text-yellow-400 text-xs">👑</span>
          ))}
        </button>
      ))}
    </div>
  );
}

/* ─── Bot Kartı ──────────────────────────────────────────────────── */
interface BotCardProps {
  label: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  time: string;
  onTimeToggle: () => void;
  crowns: number;
  onCrownChange: (n: number) => void;
  onStart: () => void;
}

function BotCard({ label, icon, isExpanded, onToggle, time, onTimeToggle, crowns, onCrownChange, onStart }: BotCardProps) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${isExpanded ? 'ring-2 ring-purple-400/70' : ''}`}>
      <button
        onClick={onToggle}
        className={`bg-[#f5eedc] p-5 flex justify-between items-center w-full cursor-pointer transition-all duration-200 active:scale-[0.99] ${isExpanded ? '' : 'rounded-2xl'}`}
      >
        <span className="font-batangas text-xl font-bold text-[#141f1b]">{label}</span>
        <img src={icon} alt={label} className="w-10 h-10 object-contain" />
      </button>

      {isExpanded && (
        <div className="bg-[#c8bfae] px-5 pt-4 pb-5 flex flex-col gap-4 text-[#141f1b] border-t border-[#141f1b]/10 animate-slide-down">
          {/* Zaman */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Zaman Seçenekleri</span>
            <button
              onClick={onTimeToggle}
              className="bg-[#387e5c] hover:bg-[#2e684c] text-white font-bold py-1 px-4 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm text-sm"
            >
              {time}
            </button>
          </div>

          {/* Taç */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Zorluk</span>
            <CrownSelector value={crowns} onChange={onCrownChange} />
          </div>

          {/* Başlat */}
          <button
            onClick={onStart}
            className="w-full bg-[#1a442e] hover:bg-[#123020] text-white font-batangas font-bold py-3.5 rounded-xl transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 mt-1"
          >
            Oyunu Başlat
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Bot Seçim Sayfası ──────────────────────────────────────────── */
export const BotSelectPage: FC<BotSelectPageProps> = ({ onNavigate, onStartGame }) => {
  const [expandedBot, setExpandedBot] = useState<BotKey | null>('kolay');
  const [kolayTime, setKolayTime] = useState('15:00');
  const [ortaTime, setOrtaTime] = useState('10:00');
  const [zorTime, setZorTime] = useState('05:00');
  const [kolayCrowns, setKolayCrowns] = useState(1);
  const [ortaCrowns, setOrtaCrowns] = useState(2);
  const [zorCrowns, setZorCrowns] = useState(3);

  const toggle = (key: BotKey) => setExpandedBot((prev) => (prev === key ? null : key));

  const getSeconds = (timeStr: string) => {
    const [m, s] = timeStr.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  };

  return (
    <div className="mobile-screen flex flex-col bg-[#1a4228] relative overflow-y-auto custom-scrollbar select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,229,255,0.04)_0%,_transparent_70%)] pointer-events-none" />

      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-9 pb-3 relative z-10">
        <button onClick={() => onNavigate('PLAY_MENU')} className="mobile-back-btn" aria-label="Geri">
          <ArrowLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="font-batangas text-[2rem] font-bold text-white tracking-wide leading-none">
          Bot'a karşı oyna
        </h1>
      </div>

      {/* Bot Kartları */}
      <div className="flex flex-col gap-5 px-5 py-6 pb-12 relative z-10">
        {/* KOLAY */}
        <BotCard
          label="Kolay Bot"
          icon={haritaImg}
          isExpanded={expandedBot === 'kolay'}
          onToggle={() => toggle('kolay')}
          time={kolayTime}
          onTimeToggle={() => {
            const opts = ['15:00', '30:00', '10:00'];
            setKolayTime((t) => opts[(opts.indexOf(t) + 1) % opts.length]);
          }}
          crowns={kolayCrowns}
          onCrownChange={setKolayCrowns}
          onStart={() => onStartGame('bot_easy', getSeconds(kolayTime))}
        />

        {/* ORTA */}
        <BotCard
          label="Orta Bot"
          icon={botImg}
          isExpanded={expandedBot === 'orta'}
          onToggle={() => toggle('orta')}
          time={ortaTime}
          onTimeToggle={() => {
            const opts = ['10:00', '15:00', '20:00'];
            setOrtaTime((t) => opts[(opts.indexOf(t) + 1) % opts.length]);
          }}
          crowns={ortaCrowns}
          onCrownChange={setOrtaCrowns}
          onStart={() => onStartGame('bot_medium', getSeconds(ortaTime))}
        />

        {/* ZOR */}
        <BotCard
          label="Zor Bot"
          icon={ekrandaImg}
          isExpanded={expandedBot === 'zor'}
          onToggle={() => toggle('zor')}
          time={zorTime}
          onTimeToggle={() => {
            const opts = ['05:00', '08:00', '03:00'];
            setZorTime((t) => opts[(opts.indexOf(t) + 1) % opts.length]);
          }}
          crowns={zorCrowns}
          onCrownChange={setZorCrowns}
          onStart={() => onStartGame('bot_hard', getSeconds(zorTime))}
        />
      </div>
    </div>
  );
};
