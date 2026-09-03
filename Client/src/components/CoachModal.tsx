import React, { FC, useState } from 'react';
import { ArrowLeft, UserCheck, Sparkles, Brain, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NotificationType } from '../types';

interface CoachModalProps {
  onClose: () => void;
  onStartCoachGame: (coachName: string, tipLevel: string) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

const COACHES = [
  {
    id: 'timur',
    name: 'Usta Timur',
    title: 'Büyük Stratejist',
    avatar: '👑',
    desc: 'Tahta hakimiyeti, vezir & hisar hücumları konusunda usta. Oyun içi taktiksel hamleleri fısıldar.',
    badge: 'Strateji Uzmanı',
    rating: 2200,
  },
  {
    id: 'bilge',
    name: 'Bilge Vezir',
    title: 'Öğretici Rehber',
    avatar: '📜',
    desc: 'Hataları sabırla açıklar, taşların Timur satrancındaki özel hareketlerini ve en iyi savunmaları gösterir.',
    badge: 'Yeni Başlayanlar & Gelişim',
    rating: 1600,
  },
  {
    id: 'melik',
    name: 'Komutan Melik',
    title: 'Hızlı Hücum Ustası',
    avatar: '⚔️',
    desc: 'Agresif açılışlar, süvari baskınları ve şah avı taktikleriyle hızlı zafere ulaştırır.',
    badge: 'Agresif Taktik',
    rating: 1900,
  },
];

export const CoachModal: FC<CoachModalProps> = ({
  onClose,
  onStartCoachGame,
  showNotification,
}) => {
  const [selectedCoach, setSelectedCoach] = useState('timur');
  const [tipFrequency, setTipFrequency] = useState<'all' | 'mistakes' | 'on_request'>('mistakes');

  const handleStart = () => {
    const coach = COACHES.find((c) => c.id === selectedCoach);
    onStartCoachGame(coach?.name || 'Usta Timur', tipFrequency);
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
            <span className="text-2xl">👩‍🏫</span>
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Koç ile Oyna
            </h2>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
          <p className="text-white/60 text-xs">
            Yapay zeka koçun oyun boyunca hamlelerini analiz eder, hatalarını gösterir ve seni zafere taşır.
          </p>

          {/* Koç Seçimi */}
          <div className="flex flex-col gap-3">
            <span className="text-white/80 font-bold text-sm">Koçunu Seç</span>
            {COACHES.map((coach) => {
              const isSelected = selectedCoach === coach.id;
              return (
                <button
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach.id)}
                  className={`border rounded-2xl p-4 flex items-start gap-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1e4630] border-[#7fa650] ring-2 ring-[#7fa650] shadow-lg scale-[1.01]'
                      : 'bg-[#183525] border-white/10 hover:bg-[#1f402e]'
                  }`}
                >
                  <span className="text-3xl bg-black/30 p-2 rounded-xl border border-white/10">
                    {coach.avatar}
                  </span>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-batangas text-base font-bold text-white">
                        {coach.name}
                      </span>
                      <span className="text-[10px] bg-[#7fa650]/30 text-[#a3cf6f] px-2 py-0.5 rounded-full font-semibold">
                        {coach.badge}
                      </span>
                    </div>
                    <p className="text-white/65 text-xs leading-relaxed">{coach.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tavsiye Sıklığı */}
          <div className="bg-[#183525] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md mt-2">
            <span className="text-white/80 font-bold text-sm">Koç Tavsiye Sıklığı</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTipFrequency('all')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  tipFrequency === 'all'
                    ? 'bg-[#7fa650] text-white font-bold'
                    : 'bg-black/30 text-white/60 hover:text-white'
                }`}
              >
                Her Hamlede
              </button>
              <button
                onClick={() => setTipFrequency('mistakes')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  tipFrequency === 'mistakes'
                    ? 'bg-[#7fa650] text-white font-bold'
                    : 'bg-black/30 text-white/60 hover:text-white'
                }`}
              >
                Hatalarda Uyar
              </button>
              <button
                onClick={() => setTipFrequency('on_request')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  tipFrequency === 'on_request'
                    ? 'bg-[#7fa650] text-white font-bold'
                    : 'bg-black/30 text-white/60 hover:text-white'
                }`}
              >
                İstendiğinde
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Başlat Butonu */}
      <div className="p-5 max-w-lg mx-auto w-full pb-8">
        <button
          onClick={handleStart}
          className="w-full bg-[#7fa650] hover:bg-[#6e9343] active:scale-[0.98] text-white font-batangas text-xl font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[#7fa650]/30"
        >
          <Sparkles size={20} />
          <span>Koç ile Karşılaşmaya Başla</span>
        </button>
      </div>
    </div>
  );
};
