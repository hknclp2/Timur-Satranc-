import React, { FC } from 'react';
import { ArrowLeft, Trophy, Users, Clock, Award, Shield, Sparkles } from 'lucide-react';
import { NotificationType } from '../types';

interface TournamentModalProps {
  onClose: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

interface TournamentItem {
  id: number;
  title: string;
  timeControl: string;
  participants: number;
  maxParticipants: number;
  startsIn: string;
  prize: string;
  status: 'active' | 'upcoming';
  bannerColor: string;
}

const TOURNAMENTS: TournamentItem[] = [
  {
    id: 1,
    title: 'Timur İmparatorluk Arenası',
    timeControl: '⚡ 3 + 2 Yıldırım',
    participants: 94,
    maxParticipants: 128,
    startsIn: '12 dk sonra',
    prize: '5.000 Altın + 🏆 Özel Unvan',
    status: 'upcoming',
    bannerColor: 'from-amber-600/30 to-emerald-900/40',
  },
  {
    id: 2,
    title: 'Semerkant Hızlı Kupası',
    timeControl: '⏱️ 10 dk Hızlı',
    participants: 48,
    maxParticipants: 64,
    startsIn: '45 dk sonra',
    prize: '2.500 Altın',
    status: 'upcoming',
    bannerColor: 'from-blue-600/30 to-emerald-900/40',
  },
  {
    id: 3,
    title: 'Hisar Savunması Gece Arenası',
    timeControl: '🚀 2 + 1 Kurşun',
    participants: 76,
    maxParticipants: 100,
    startsIn: 'CANLI (Devam Ediyor)',
    prize: '1.500 Altın',
    status: 'active',
    bannerColor: 'from-red-600/30 to-emerald-900/40',
  },
  {
    id: 4,
    title: 'Haftalık Büyük Han Şampiyonası',
    timeControl: '⏱️ 15 + 10 İsviçre',
    participants: 182,
    maxParticipants: 256,
    startsIn: 'Yarın 20:00',
    prize: '10.000 Altın + 👑 Han Tacı',
    status: 'upcoming',
    bannerColor: 'from-purple-600/30 to-emerald-900/40',
  },
];

export const TournamentModal: FC<TournamentModalProps> = ({ onClose, showNotification }) => {
  const handleJoin = (tourney: TournamentItem) => {
    showNotification(`"${tourney.title}" turnuvasına kaydınız alındı!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#12281c]/95 backdrop-blur-md flex flex-col justify-between overflow-y-auto custom-scrollbar animate-fade-in select-none">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-8 pb-3 border-b border-white/10 sticky top-0 bg-[#12281c]/95 z-20">
          <button
            onClick={onClose}
            className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Geri"
          >
            <ArrowLeft size={26} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={24} className="text-yellow-400" />
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Turnuvalar
            </h2>
          </div>
        </div>

        {/* Turnuva Listesi */}
        <div className="p-5 flex flex-col gap-4 max-w-lg mx-auto w-full pb-12">
          <p className="text-white/60 text-xs">
            Büyük Timur Satrancı arenasında yarış, puan topla ve imparatorluk unvanlarını kazan!
          </p>

          {TOURNAMENTS.map((t) => (
            <div
              key={t.id}
              className={`bg-gradient-to-br ${t.bannerColor} border border-white/15 rounded-2xl p-4 flex flex-col gap-3 shadow-lg hover:border-yellow-400/50 transition-all relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-batangas text-lg font-bold text-white leading-snug">
                    {t.title}
                  </span>
                  <span className="text-white/70 text-xs font-semibold">{t.timeControl}</span>
                </div>
                {t.status === 'active' ? (
                  <span className="bg-red-500/80 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    CANLI
                  </span>
                ) : (
                  <span className="bg-emerald-600/60 text-white font-medium text-[10px] px-2 py-0.5 rounded-full">
                    {t.startsIn}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-cyan-400" />
                  <span>{t.participants}/{t.maxParticipants} Oyuncu</span>
                </div>
                <div className="flex items-center gap-1.5 text-yellow-300 font-semibold">
                  <Award size={14} />
                  <span>{t.prize}</span>
                </div>
              </div>

              <button
                onClick={() => handleJoin(t)}
                className="w-full mt-1 bg-[#7fa650] hover:bg-[#6e9343] active:scale-98 text-white font-batangas font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-sm"
              >
                {t.status === 'active' ? 'Arenaya Katıl' : 'Kayıt Ol'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
