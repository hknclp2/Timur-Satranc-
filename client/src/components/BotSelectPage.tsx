import React, { FC, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Crown,
  Clock,
  Shuffle,
  Sparkle,
  Leaf,
  Flame,
  Lightning,
  Skull,
} from '@phosphor-icons/react';
import { PageState, TimeControl } from '../types';
import { BOT_PROFILES, type BotProfileId } from '../bot/profiles';
import { TimeControlModal } from './TimeControlModal';

export type PlayerSideChoice = 'white' | 'random' | 'black';

interface BotSelectPageProps {
  onNavigate: (page: PageState) => void;
  onStartGame: (
    mode: string,
    timeSeconds: number,
    profileId: BotProfileId,
    incrementSeconds?: number,
    playerColor?: PlayerSideChoice
  ) => void;
}

export interface BotLevelConfig {
  id: BotProfileId;
  levelNumber: number;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  mode: string;
  defaultTime: TimeControl;
}

export const BOT_LEVELS: BotLevelConfig[] = [
  {
    id: 'I',
    levelNumber: 1,
    title: 'Çok Kolay',
    subtitle: 'Sık sık hata yapar — satranca yeni başlayanlar için',
    Icon: Sparkle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100',
    mode: 'bot_easy',
    defaultTime: { category: 'rapid', label: '15 dk', initialMinutes: 15, incrementSeconds: 0, icon: '⏱️' },
  },
  {
    id: 'II',
    levelNumber: 2,
    title: 'Kolay',
    subtitle: 'Ara sıra hata yapar — taş geliştirmeyi öğrenenler için',
    Icon: Leaf,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    mode: 'bot_easy',
    defaultTime: { category: 'rapid', label: '15 dk', initialMinutes: 15, incrementSeconds: 0, icon: '⏱️' },
  },
  {
    id: 'III',
    levelNumber: 3,
    title: 'Orta',
    subtitle: 'Dengeli ve dikkatli — taktik fırsatları kovalar',
    Icon: Flame,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
    mode: 'bot_medium',
    defaultTime: { category: 'rapid', label: '10 dk', initialMinutes: 10, incrementSeconds: 0, icon: '⏱️' },
  },
  {
    id: 'IV',
    levelNumber: 4,
    title: 'Zor',
    subtitle: 'Derin hesaplar, neredeyse hatasız — iddialı rakip',
    Icon: Lightning,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-100',
    mode: 'bot_hard',
    defaultTime: { category: 'blitz', label: '5 dk', initialMinutes: 5, incrementSeconds: 0, icon: '⚡' },
  },
  {
    id: 'V',
    levelNumber: 5,
    title: 'Çok Zor',
    subtitle: 'Tam güç motor — hata yapmaz, hep en iyi hamleyi oynar',
    Icon: Skull,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
    mode: 'bot_hard',
    defaultTime: { category: 'blitz', label: '5 dk', initialMinutes: 5, incrementSeconds: 0, icon: '⚡' },
  },
];

/* ─── Taç Saklama ve Okuma Yardımcıları ────────────────────────────── */
const BOT_CROWNS_STORAGE_KEY = 'timur_bot_crowns_v1';

export function getSavedBotCrowns(): Record<BotProfileId, number> {
  const fallback: Record<BotProfileId, number> = { I: 0, II: 0, III: 0, IV: 0, V: 0 };
  try {
    const raw = localStorage.getItem(BOT_CROWNS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    const p = parsed as Partial<Record<BotProfileId, unknown>>;
    return {
      I: Number(p.I) > 0 ? Number(p.I) : 0,
      II: Number(p.II) > 0 ? Number(p.II) : 0,
      III: Number(p.III) > 0 ? Number(p.III) : 0,
      IV: Number(p.IV) > 0 ? Number(p.IV) : 0,
      V: Number(p.V) > 0 ? Number(p.V) : 0,
    };
  } catch {
    return fallback;
  }
}

export function saveBotCrown(profileId: BotProfileId, crowns: number) {
  try {
    const current = getSavedBotCrowns();
    const existing = current[profileId] || 0;
    if (crowns > existing) {
      current[profileId] = crowns;
      localStorage.setItem(BOT_CROWNS_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // localStorage kapalıysa sessizce devam et
  }
}

/* ─── Kazanılan Taç Göstergesi ─────────────────────────────────────── */
function EarnedCrownsDisplay({ crowns }: { crowns: number }) {
  return (
    <div
      className="flex items-center gap-1 bg-[#141f1b]/5 px-2.5 py-1 rounded-full border border-[#141f1b]/10"
      title={crowns > 0 ? `En yüksek galibiyet: ${crowns}/3 Taç` : 'Henüz bu botu yenmediniz'}
    >
      {[1, 2, 3].map((star) => {
        const isEarned = crowns >= star;
        return (
          <Crown
            key={star}
            size={16}
            weight={isEarned ? 'fill' : 'bold'}
            className={isEarned ? 'text-amber-500 drop-shadow-sm' : 'text-[#141f1b]/20'}
          />
        );
      })}
    </div>
  );
}

/* ─── Taraf Seçici (Beyaz / Rastgele / Siyah) ────────────────────────── */
function SideSelector({
  value,
  onChange,
}: {
  value: PlayerSideChoice;
  onChange: (side: PlayerSideChoice) => void;
}) {
  const options: { id: PlayerSideChoice; label: string; icon: React.ReactNode }[] = [
    {
      id: 'white',
      label: 'Beyaz',
      icon: <span className="w-3.5 h-3.5 rounded-full bg-white border border-gray-400 inline-block shadow-sm" />,
    },
    {
      id: 'random',
      label: 'Rastgele',
      icon: <Shuffle size={15} weight="bold" />,
    },
    {
      id: 'black',
      label: 'Siyah',
      icon: <span className="w-3.5 h-3.5 rounded-full bg-[#141f1b] border border-gray-600 inline-block shadow-sm" />,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer border ${
              isSelected
                ? 'bg-[#00d4c4] text-[#0d2818] border-[#00d4c4] shadow-md ring-2 ring-white/60 font-extrabold scale-102'
                : 'bg-[#e8deca] hover:bg-[#dfd4be] border-[#cfc4ad] text-[#141f1b] shadow-sm'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Bot Kartı ──────────────────────────────────────────────────── */
interface BotCardProps {
  level: BotLevelConfig;
  isExpanded: boolean;
  onToggle: () => void;
  timeControl: TimeControl;
  onOpenTimeModal: () => void;
  earnedCrowns: number;
  playerSide: PlayerSideChoice;
  onSideChange: (side: PlayerSideChoice) => void;
  onStart: () => void;
}

function BotCard({
  level,
  isExpanded,
  onToggle,
  timeControl,
  onOpenTimeModal,
  earnedCrowns,
  playerSide,
  onSideChange,
  onStart,
}: BotCardProps) {
  const { Icon } = level;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-xl border border-[#e5dcce] bg-[#f5eedc] transition-all duration-300 ${
        isExpanded ? 'ring-2 ring-[#f59e0b]' : 'hover:shadow-2xl'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`bg-[#f5eedc] p-4 sm:p-5 flex justify-between items-center w-full cursor-pointer transition-all duration-200 active:scale-[0.99] ${
          isExpanded ? '' : 'rounded-2xl'
        }`}
      >
        <div className="flex items-center gap-3.5 text-left">
          <div className={`w-12 h-12 rounded-xl ${level.iconBg} flex items-center justify-center shadow-sm flex-shrink-0 border border-black/5`}>
            <Icon size={28} weight="fill" className={level.iconColor} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-batangas text-lg sm:text-xl font-bold text-[#141f1b]">
                {level.levelNumber}. {level.title}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#141f1b]/10 text-[#141f1b]/70">
                Profil {level.id}
              </span>
            </div>
            <span className="text-xs text-[#5c6c66] font-medium mt-0.5">
              {level.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <EarnedCrownsDisplay crowns={earnedCrowns} />
        </div>
      </button>

      {isExpanded && (
        <div className="bg-[#c8bfae] px-5 pt-4 pb-5 flex flex-col gap-4 text-[#141f1b] border-t border-[#141f1b]/10 animate-slide-down">
          {/* Zaman Kontrolü */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Zaman Kontrolü</span>
            <button
              type="button"
              onClick={onOpenTimeModal}
              className="bg-[#387e5c] hover:bg-[#2e684c] text-white font-bold py-1.5 px-3.5 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm text-sm flex items-center gap-1.5"
            >
              <Clock size={16} weight="bold" />
              <span>{timeControl.label}</span>
            </button>
          </div>

          {/* Taraf Seçimi */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-sm">Tarafınız</span>
            <SideSelector value={playerSide} onChange={onSideChange} />
          </div>

          {/* Oyunu Başlat */}
          <button
            type="button"
            onClick={onStart}
            className="w-full bg-[#1a442e] hover:bg-[#123020] active:scale-[0.98] text-white font-batangas font-bold py-3.5 rounded-xl transition-all shadow-lg cursor-pointer transform hover:-translate-y-0.5 mt-2 text-lg flex items-center justify-center gap-2"
          >
            <span>Oyunu Başlat</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Bot Seçim Sayfası ──────────────────────────────────────────── */
export const BotSelectPage: FC<BotSelectPageProps> = ({ onNavigate, onStartGame }) => {
  const [expandedBot, setExpandedBot] = useState<BotProfileId | null>('I');

  // Her seviye için zaman kontrolü hafızası
  const [timeControls, setTimeControls] = useState<Record<BotProfileId, TimeControl>>(() => {
    const initial: Partial<Record<BotProfileId, TimeControl>> = {};
    BOT_LEVELS.forEach((lvl) => {
      initial[lvl.id] = lvl.defaultTime;
    });
    return initial as Record<BotProfileId, TimeControl>;
  });

  const [playerSide, setPlayerSide] = useState<PlayerSideChoice>('white');
  const [savedCrowns, setSavedCrowns] = useState<Record<BotProfileId, number>>(() => getSavedBotCrowns());

  // Zaman Modal Durumu
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [activeBotForModal, setActiveBotForModal] = useState<BotProfileId>('I');

  useEffect(() => {
    setSavedCrowns(getSavedBotCrowns());
  }, []);

  const toggle = (id: BotProfileId) => setExpandedBot((prev) => (prev === id ? null : id));

  const handleOpenTimeModal = (id: BotProfileId) => {
    setActiveBotForModal(id);
    setIsTimeModalOpen(true);
  };

  const handleSelectTime = (tc: TimeControl) => {
    setTimeControls((prev) => ({
      ...prev,
      [activeBotForModal]: tc,
    }));
  };

  const handleStart = (level: BotLevelConfig) => {
    const tc = timeControls[level.id] || level.defaultTime;
    const timeSeconds = tc.initialMinutes * 60;
    const incrementSeconds = tc.incrementSeconds;

    onStartGame(level.mode, timeSeconds, level.id, incrementSeconds, playerSide);
  };

  return (
    <div className="mobile-screen flex flex-col bg-[#1a4228] relative overflow-y-auto custom-scrollbar select-none">
      {/* Başlık */}
      <div className="flex items-center gap-3 px-5 pt-9 pb-3 relative z-10">
        <button
          type="button"
          onClick={() => onNavigate('PLAY_MENU')}
          className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white"
          aria-label="Geri"
        >
          <ArrowLeft size={28} weight="bold" />
        </button>
        <h1 className="font-batangas text-[2rem] font-bold text-white tracking-wide leading-none">
          Bot'a karşı oyna
        </h1>
      </div>

      {/* 5 Bot Kartı */}
      <div className="flex flex-col gap-4 px-5 py-5 pb-16 relative z-10 max-w-lg mx-auto w-full">
        {BOT_LEVELS.map((level) => (
          <BotCard
            key={level.id}
            level={level}
            isExpanded={expandedBot === level.id}
            onToggle={() => toggle(level.id)}
            timeControl={timeControls[level.id] || level.defaultTime}
            onOpenTimeModal={() => handleOpenTimeModal(level.id)}
            earnedCrowns={savedCrowns[level.id] || 0}
            playerSide={playerSide}
            onSideChange={setPlayerSide}
            onStart={() => handleStart(level)}
          />
        ))}
      </div>

      {/* Zaman Kontrolü Modalı */}
      {isTimeModalOpen && (
        <TimeControlModal
          selectedTime={timeControls[activeBotForModal] || BOT_LEVELS[0].defaultTime}
          onSelect={handleSelectTime}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}
    </div>
  );
};
