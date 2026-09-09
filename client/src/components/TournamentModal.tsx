import React, { FC, useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Users, Medal } from '@phosphor-icons/react';
import { NotificationType } from '../types';
import { ComingSoonPanel } from './ComingSoonPanel';
import {
  listTournaments,
  joinTournament,
  type Tournament,
} from '../core/tournament/tournamentService';
import { getOrCreatePlayerId } from '../lib/auth';

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error) return error;
  if (error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}

interface TournamentModalProps {
  onClose: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

interface TournamentItem {
  id: number | string;
  title: string;
  timeControl: string;
  participants: number;
  maxParticipants: number;
  startsIn: string;
  prize: string;
  status: 'active' | 'upcoming';
}

function toDisplayItem(t: Tournament): TournamentItem {
  return {
    id: t.id,
    title: t.title,
    timeControl: t.time_control,
    participants: 0,
    maxParticipants: t.max_players,
    startsIn:
      t.status === 'active'
        ? 'CANLI (Devam Ediyor)'
        : t.starts_at
          ? new Date(t.starts_at).toLocaleString('tr-TR')
          : 'Yakında',
    prize: '—',
    status: t.status === 'active' ? 'active' : 'upcoming',
  };
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
  },
];

export const TournamentModal: FC<TournamentModalProps> = ({ onClose, showNotification }) => {
  const [showRegisterInfo, setShowRegisterInfo] = useState(false);
  const [liveTournaments, setLiveTournaments] = useState<Tournament[] | null>(null);
  const [joiningId, setJoiningId] = useState<number | string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await listTournaments();
        if (cancelled) return;
        // Başarılı + boş değilse canlı listeyi göster, yoksa statik fallback.
        if (!error && data && data.length > 0) {
          setLiveTournaments(data);
        }
      } catch {
        // Hata → statik fallback (sessiz geç).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLive = liveTournaments !== null && liveTournaments.length > 0;
  const displayTournaments: TournamentItem[] = isLive
    ? (liveTournaments as Tournament[]).map(toDisplayItem)
    : TOURNAMENTS;

  const handleJoin = async (tourney: TournamentItem) => {
    // Fallback (statik liste) → kayıt ekranı henüz hazır değil, yer tutucu göster.
    if (!isLive) {
      setShowRegisterInfo(true);
      return;
    }
    if (joiningId !== null) return;
    setJoiningId(tourney.id);
    try {
      const { error } = await joinTournament(String(tourney.id), getOrCreatePlayerId());
      if (error) {
        showNotification(toErrorMessage(error, 'Turnuvaya kayıt olunamadı.'), 'error');
        return;
      }
      showNotification('Turnuvaya kaydoldun! Bol şans.', 'success');
    } catch {
      showNotification('Turnuvaya kayıt olunamadı. Bağlantını kontrol et.', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  if (showRegisterInfo) {
    return (
      <ComingSoonPanel
        title="Turnuva Kaydı"
        onClose={() => setShowRegisterInfo(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#122b1e]/95 flex flex-col justify-between overflow-y-auto custom-scrollbar animate-fade-in select-none">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-8 pb-3 border-b border-white/10 sticky top-0 bg-[#122b1e]/95 z-20">
          <button
            onClick={onClose}
            className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
            aria-label="Geri"
          >
            <ArrowLeft size={26} weight="bold" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy size={24} weight="duotone" className="text-yellow-400" />
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Turnuvalar
            </h2>
          </div>
        </div>

        {/* Turnuva Listesi (krem kartlar) */}
        <div className="p-5 flex flex-col gap-3.5 max-w-lg mx-auto w-full pb-12">
          <p className="text-white/60 text-xs">
            Büyük Timur Satrancı arenasında yarış, puan topla ve imparatorluk unvanlarını kazan!
          </p>

          {displayTournaments.map((t) => (
            <div
              key={t.id}
              className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce] hover:border-[#00d4c4] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-batangas text-lg font-bold text-[#141f1b] leading-snug">
                    {t.title}
                  </span>
                  <span className="text-[#5c6c66] text-xs font-semibold">{t.timeControl}</span>
                </div>
                {t.status === 'active' ? (
                  <span className="bg-red-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                    CANLI
                  </span>
                ) : (
                  <span className="bg-[#00d4c4]/25 text-[#0a4e48] border border-[#00d4c4]/40 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {t.startsIn}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#5c6c66] pt-1 border-t border-[#e5dcce]">
                <div className="flex items-center gap-1.5">
                  <Users size={14} weight="bold" className="text-[#008f84]" />
                  <span className="font-semibold">{t.participants}/{t.maxParticipants} Oyuncu</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <Medal size={14} weight="bold" />
                  <span>{t.prize}</span>
                </div>
              </div>

              <button
                onClick={() => void handleJoin(t)}
                disabled={joiningId === t.id}
                className="w-full mt-1 bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-batangas font-bold py-2.5 rounded-xl shadow transition-all cursor-pointer text-sm disabled:opacity-50"
              >
                {joiningId === t.id
                  ? 'Kaydediliyor...'
                  : t.status === 'active'
                    ? 'Arenaya Katıl'
                    : 'Kayıt Ol'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
