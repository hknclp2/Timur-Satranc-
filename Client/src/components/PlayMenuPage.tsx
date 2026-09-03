import React, { FC, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Play,
  Trophy,
  Users,
  Bot,
  GraduationCap,
  Sliders,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { PageState, NotificationType, TimeControl, GameMode } from '../types';
import { TimeControlModal } from './TimeControlModal';
import { CustomGameModal } from './CustomGameModal';
import { PlayInPersonModal } from './PlayInPersonModal';
import { TournamentModal } from './TournamentModal';
import { CoachModal } from './CoachModal';
import { PlayAFriendModal } from './PlayAFriendModal';

interface PlayMenuPageProps {
  onNavigate: (page: PageState) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  onStartGame?: (mode: GameMode, timeSeconds?: number) => void;
}

export const PlayMenuPage: FC<PlayMenuPageProps> = ({
  onNavigate,
  showNotification,
  onStartGame,
}) => {
  // Seçili Zaman Kontrolü
  const [selectedTime, setSelectedTime] = useState<TimeControl>({
    category: 'bullet',
    label: '2 + 1',
    initialMinutes: 2,
    incrementSeconds: 1,
    icon: '🚀',
  });

  // Modallar
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isCustomGameOpen, setIsCustomGameOpen] = useState(false);
  const [isInPersonOpen, setIsInPersonOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isPlayFriendOpen, setIsPlayFriendOpen] = useState(false);

  // Hızlı Oyuna Başla
  const handleQuickPlay = () => {
    showNotification(
      `Hızlı Karşılaşma (${selectedTime.label}) başlatılıyor... Rakip aranıyor.`,
      'info'
    );
    if (onStartGame) {
      const totalSec = selectedTime.initialMinutes * 60;
      onStartGame('online', totalSec);
    }
  };

  return (
    <div className="mobile-screen flex flex-col bg-[#142e1f] relative overflow-y-auto custom-scrollbar select-none">
      {/* Arka plan parlama efekti */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,229,255,0.06)_0%,_transparent_70%)] pointer-events-none" />

      {/* ─── ÜST BAŞLIK ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-3 relative z-10">
        <button
          onClick={() => onNavigate('MAIN_MENU')}
          className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Geri"
        >
          <ArrowLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">♟️</span>
          <h1 className="font-batangas text-[2.2rem] font-bold text-white tracking-wide leading-none">
            Yeni Oyun
          </h1>
        </div>
      </div>

      {/* ─── İÇERİK LİSTESİ ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 px-5 py-4 pb-12 relative z-10 max-w-lg mx-auto w-full">
        {/* 1. ÜST KISIM DİREKT OYNAMA KISAYOLU (Zaman Seçici + Oyunu Başlat) */}
        <div className="flex flex-col gap-2.5 bg-[#1b3b29] border border-white/10 rounded-2xl p-3.5 shadow-xl">
          {/* Zaman Kontrolü Seçim Dropdown Butonu */}
          <button
            id="time-selector-btn"
            onClick={() => setIsTimeModalOpen(true)}
            className="w-full bg-[#12271c] hover:bg-[#183526] active:scale-[0.99] border border-white/15 rounded-xl py-3 px-4 flex items-center justify-between transition-all cursor-pointer shadow-inner"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{selectedTime.icon || '🚀'}</span>
              <span className="font-batangas text-lg font-bold text-white tracking-wider">
                {selectedTime.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-white/50">
              <ChevronDown size={20} />
            </div>
          </button>

          {/* Oyunu Başlat Butonu (Büyük Yeşil Buton) */}
          <button
            id="start-game-btn"
            onClick={handleQuickPlay}
            className="w-full bg-[#7fa650] hover:bg-[#6e9343] active:scale-[0.98] text-white font-batangas text-xl font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[#7fa650]/25 transform hover:-translate-y-0.5"
          >
            <Play size={20} fill="currentColor" />
            <span>Oyunu Başlat</span>
          </button>
        </div>

        {/* 2. OYUN MODLARI LİSTESİ */}
        <div className="flex flex-col gap-2.5 mt-1">
          {/* Turnuvalar */}
          <button
            id="tournaments-btn"
            onClick={() => setIsTournamentOpen(true)}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                🏅
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  Turnuvalar
                </span>
                <span className="text-white/50 text-xs">Canlı arena ve şampiyonalar</span>
              </div>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2.5 py-1 rounded-full border border-amber-500/30">
              Canlı
            </span>
          </button>

          {/* Arkadaşınla Oyna */}
          <button
            id="play-friend-btn"
            onClick={() => setIsPlayFriendOpen(true)}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                👥
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Arkadaşınla Oyna
                </span>
                <span className="text-white/50 text-xs">Davet kodu veya bağlantı ile</span>
              </div>
            </div>
          </button>

          {/* Botlarla Oyna */}
          <button
            id="play-bots-btn"
            onClick={() => onNavigate('BOT_SELECT')}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                🖥️
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Botlarla Oyna
                </span>
                <span className="text-white/50 text-xs">Farklı zorluklarda yapay zeka</span>
              </div>
            </div>
          </button>

          {/* Koç ile Oyna */}
          <button
            id="play-coach-btn"
            onClick={() => setIsCoachOpen(true)}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                👩‍🏫
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                  Koç ile Oyna
                </span>
                <span className="text-white/50 text-xs">Hamle analizi ve canlı tavsiyeler</span>
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 text-[#a3cf6f] font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
              Eğitim
            </span>
          </button>

          {/* Küçük Ayırıcı Ok */}
          <div className="flex items-center justify-center py-0.5 opacity-40 text-white">
            <ChevronUp size={16} />
          </div>

          {/* Özel Oyun */}
          <button
            id="custom-game-btn"
            onClick={() => setIsCustomGameOpen(true)}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                🎛️
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-yellow-200 transition-colors">
                  Özel Oyun
                </span>
                <span className="text-white/50 text-xs">Kuralları, tarafı ve süreyi belirle</span>
              </div>
            </div>
          </button>

          {/* Ekranda Oyna (Play in Person) */}
          <button
            id="play-in-person-btn"
            onClick={() => setIsInPersonOpen(true)}
            className="w-full bg-[#1e422f] hover:bg-[#27533c] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 bg-black/20 rounded-xl border border-white/10">
                📱
              </span>
              <div className="flex flex-col text-left">
                <span className="font-batangas text-lg font-bold text-white group-hover:text-emerald-200 transition-colors">
                  Ekranda Oyna
                </span>
                <span className="text-white/50 text-xs">Aynı cihazda arkadaşınla çevrimdışı</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── MODALLAR ──────────────────────────────────────────────── */}
      {/* 1. Zaman Kontrolü Seçim Modalı */}
      {isTimeModalOpen && (
        <TimeControlModal
          selectedTime={selectedTime}
          onSelect={(tc) => setSelectedTime(tc)}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}

      {/* 2. Özel Oyun Modalı */}
      {isCustomGameOpen && (
        <CustomGameModal
          onClose={() => setIsCustomGameOpen(false)}
          onStart={(config) => {
            setIsCustomGameOpen(false);
            showNotification(
              `Özel karşılaşma başlatılıyor (${config.timeControl.label}, ${config.opponent === 'random' ? 'Rastgele' : config.opponent}, ${config.isRated ? 'Dereceli' : 'Dostluk'})...`,
              'info'
            );
            if (onStartGame) {
              onStartGame('custom', config.timeControl.initialMinutes * 60);
            }
          }}
          showNotification={showNotification}
        />
      )}

      {/* 3. Ekranda Oyna Modalı */}
      {isInPersonOpen && (
        <PlayInPersonModal
          onClose={() => setIsInPersonOpen(false)}
          onStart={(config) => {
            setIsInPersonOpen(false);
            showNotification(
              `Ekranda oyun başladı! ${config.whiteName} (Beyaz) vs ${config.blackName} (Siyah)`,
              'success'
            );
            if (onStartGame) {
              onStartGame('local_pass_and_play', 600);
            }
          }}
        />
      )}

      {/* 4. Turnuvalar Modalı */}
      {isTournamentOpen && (
        <TournamentModal
          onClose={() => setIsTournamentOpen(false)}
          showNotification={showNotification}
        />
      )}

      {/* 5. Koç ile Oyna Modalı */}
      {isCoachOpen && (
        <CoachModal
          onClose={() => setIsCoachOpen(false)}
          onStartCoachGame={(coachName, tipLevel) => {
            setIsCoachOpen(false);
            showNotification(
              `${coachName} ile antrenman karşılaşması başlatılıyor...`,
              'success'
            );
            if (onStartGame) {
              onStartGame('coach_easy', 900);
            }
          }}
          showNotification={showNotification}
        />
      )}

      {/* 6. Arkadaşınla Oyna Modalı */}
      {isPlayFriendOpen && (
        <PlayAFriendModal
          onClose={() => setIsPlayFriendOpen(false)}
          onStartOnlineGame={() => {
            setIsPlayFriendOpen(false);
            if (onStartGame) {
              onStartGame('online', 600);
            }
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};
