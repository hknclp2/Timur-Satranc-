import React, { FC, useState } from 'react';
import { ArrowLeft, ChevronRight, User, Users, Globe, Link2, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { TimeControl, NotificationType } from '../types';
import { TimeControlModal } from './TimeControlModal';

interface CustomGameModalProps {
  onClose: () => void;
  onStart: (config: {
    timeControl: TimeControl;
    opponent: string;
    gameType: string;
    isRated: boolean;
    side: 'white' | 'random' | 'black';
    ratingMin: string;
    ratingMax: string;
  }) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const CustomGameModal: FC<CustomGameModalProps> = ({
  onClose,
  onStart,
  showNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'open_challenges'>('custom');
  const [timeControl, setTimeControl] = useState<TimeControl>({
    category: 'bullet',
    label: '2 + 1',
    initialMinutes: 2,
    incrementSeconds: 1,
    icon: '🚀',
  });
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [opponent, setOpponent] = useState<'random' | 'friend' | 'bot'>('random');
  const [gameType, setGameType] = useState('Standart');
  const [isRated, setIsRated] = useState(true);
  const [side, setSide] = useState<'white' | 'random' | 'black'>('random');
  const [minRating, setMinRating] = useState('-∞');
  const [maxRating, setMaxRating] = useState('+∞');
  const userRating = 1200;

  // Açık Meydan Okumalar listesi
  const mockChallenges = [
    { id: 1, user: 'Alp_Bey', rating: 1350, time: '⚡ 3 + 2', type: 'Dereceli', mode: 'Standart' },
    { id: 2, user: 'Timur_Han', rating: 1520, time: '🚀 2 + 1', type: 'Dereceli', mode: 'Standart' },
    { id: 3, user: 'Bilge_Vezir', rating: 1200, time: '⏱️ 10 dk', type: 'Dostluk', mode: 'Çifte Hisar' },
    { id: 4, user: 'Cengiz_Gok', rating: 1440, time: '⚡ 5 + 2', type: 'Dereceli', mode: 'Standart' },
  ];

  const handleCopyLink = () => {
    const fakeLink = `https://timursatranci.app/challenge/${Math.random().toString(36).substring(2, 9)}`;
    navigator.clipboard?.writeText(fakeLink);
    showNotification('Meydan okuma bağlantısı panoya kopyalandı! Arkadaşınla paylaşabilirsin.', 'success');
  };

  const handleStart = () => {
    onStart({
      timeControl,
      opponent,
      gameType,
      isRated,
      side,
      ratingMin: minRating,
      ratingMax: maxRating,
    });
  };

  const opponentLabels = {
    random: 'Rastgele Oyuncu',
    friend: 'Arkadaş',
    bot: 'Yapay Zeka (Bot)',
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#12281c]/95 backdrop-blur-md flex flex-col justify-between overflow-y-auto custom-scrollbar animate-fade-in select-none">
      {/* Üst Kısım */}
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
          <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
            Özel Oyun
          </h2>
        </div>

        {/* Sekmeler (Custom vs Open Challenges) */}
        <div className="flex border-b border-white/10 px-5 pt-2">
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-center font-bold text-sm transition-all border-b-2 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-[#7fa650] text-[#7fa650]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            Özel Oyun Oluştur
          </button>
          <button
            onClick={() => setActiveTab('open_challenges')}
            className={`flex-1 py-3 text-center font-bold text-sm transition-all border-b-2 cursor-pointer ${
              activeTab === 'open_challenges'
                ? 'border-[#7fa650] text-[#7fa650]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            Açık Meydan Okumalar
          </button>
        </div>

        {/* Sekme İçerikleri */}
        {activeTab === 'custom' ? (
          <div className="p-5 flex flex-col gap-3.5 max-w-lg mx-auto w-full">
            {/* Zaman Kontrolü Satırı (Tıklanabilir) */}
            <button
              onClick={() => setIsTimeModalOpen(true)}
              className="bg-[#1b3b29] hover:bg-[#224b34] active:scale-[0.99] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{timeControl.icon || '🚀'}</span>
                <span className="font-bold text-white text-lg tracking-wide">
                  {timeControl.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/50">
                <span className="text-xs text-white/40">Değiştir</span>
                <ChevronRight size={20} />
              </div>
            </button>

            {/* Rakip Seçimi Satırı */}
            <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-[#00e5ff]" />
                <span className="font-medium text-white/80 text-sm">vs {opponentLabels[opponent]}</span>
              </div>
              <div className="flex gap-1.5">
                {(['random', 'friend', 'bot'] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() => setOpponent(op)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      opponent === op
                        ? 'bg-[#7fa650] text-white'
                        : 'bg-black/30 text-white/60 hover:text-white'
                    }`}
                  >
                    {op === 'random' ? 'Rastgele' : op === 'friend' ? 'Arkadaş' : 'Bot'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tür Seçimi */}
            <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
              <span className="text-white/80 font-medium text-sm">Oyun Türü</span>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-[#7fa650] cursor-pointer"
              >
                <option value="Standart">Standart Timur Satrancı</option>
                <option value="CifteHisar">Çifte Hisar Modu</option>
                <option value="Serbest">Serbest Dizilim</option>
              </select>
            </div>

            {/* Dereceli Oyun (Rated Game Switch) */}
            <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className={isRated ? 'text-[#7fa650]' : 'text-white/40'} />
                <div>
                  <span className="text-white font-medium text-sm block">Dereceli Karşılaşma</span>
                  <span className="text-white/40 text-xs">Puan (ELO) kazanımı ve kaybı geçerli</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRated}
                  onChange={(e) => setIsRated(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7fa650]"></div>
              </label>
            </div>

            {/* Tarafım (Renk Seçimi - 3 Kutu) */}
            <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
              <span className="text-white/80 font-medium text-sm">Tarafım</span>
              <div className="flex justify-between gap-3">
                {/* Beyaz */}
                <button
                  onClick={() => setSide('white')}
                  className={`flex-1 py-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    side === 'white'
                      ? 'bg-white text-black ring-3 ring-[#7fa650] shadow-lg scale-[1.02]'
                      : 'bg-white/15 text-white/70 hover:bg-white/25'
                  }`}
                  title="Beyaz Olarak Oyna"
                >
                  <span className="text-2xl font-serif">♔</span>
                </button>

                {/* Rastgele (?) */}
                <button
                  onClick={() => setSide('random')}
                  className={`flex-1 py-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                    side === 'random'
                      ? 'bg-gradient-to-r from-white to-black text-amber-300 ring-3 ring-[#7fa650] shadow-lg scale-[1.02]'
                      : 'bg-gradient-to-r from-white/20 to-black/40 text-white/70 hover:opacity-90'
                  }`}
                  title="Rastgele Renk"
                >
                  <span className="text-2xl font-bold font-mono">?</span>
                </button>

                {/* Siyah */}
                <button
                  onClick={() => setSide('black')}
                  className={`flex-1 py-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    side === 'black'
                      ? 'bg-black text-white ring-3 ring-[#7fa650] shadow-lg scale-[1.02] border border-white/20'
                      : 'bg-black/50 text-white/60 hover:bg-black/70'
                  }`}
                  title="Siyah Olarak Oyna"
                >
                  <span className="text-2xl font-serif">♚</span>
                </button>
              </div>
            </div>

            {/* Puan / Rating Aralığı */}
            <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md">
              <span className="text-white/80 font-medium text-sm">Rakip Puan Aralığı</span>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setMinRating((r) => (r === '-∞' ? '-200' : '-∞'))}
                  className="bg-black/30 hover:bg-black/50 border border-white/10 text-white/80 font-bold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  {minRating}
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-base">{userRating}</span>
                  <span className="text-white/40 text-[10px]">Puanınız</span>
                </div>
                <button
                  onClick={() => setMaxRating((r) => (r === '+∞' ? '+200' : '+∞'))}
                  className="bg-black/30 hover:bg-black/50 border border-white/10 text-white/80 font-bold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  {maxRating}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Açık Meydan Okumalar Listesi */
          <div className="p-5 flex flex-col gap-3 max-w-lg mx-auto w-full">
            <p className="text-white/60 text-xs">
              Diğer oyuncuların oluşturduğu açık meydan okumalara katılabilirsin:
            </p>
            {mockChallenges.map((ch) => (
              <div
                key={ch.id}
                className="bg-[#1b3b29] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between shadow-md hover:border-[#7fa650]/50 transition-all"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{ch.user}</span>
                    <span className="text-[#7fa650] text-xs font-semibold">({ch.rating})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{ch.time}</span>
                    <span>•</span>
                    <span>{ch.type}</span>
                    <span>•</span>
                    <span>{ch.mode}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    showNotification(`${ch.user} ile karşılaşmaya katılınıyor...`, 'info');
                    handleStart();
                  }}
                  className="bg-[#7fa650] hover:bg-[#6e9343] active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Katıl
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alt Butonlar */}
      {activeTab === 'custom' && (
        <div className="p-5 max-w-lg mx-auto w-full flex flex-col gap-3 pb-8">
          <button
            onClick={handleStart}
            className="w-full bg-[#7fa650] hover:bg-[#6e9343] active:scale-[0.98] text-white font-batangas text-xl font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[#7fa650]/30"
          >
            <span>Oyuna Başla</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full bg-[#1b3b29] hover:bg-[#234b34] active:scale-[0.98] border border-white/10 text-white font-semibold text-sm py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Link2 size={18} className="text-[#00e5ff]" />
            <span>Meydan Okuma Bağlantısı Gönder</span>
          </button>
        </div>
      )}

      {/* Zaman Kontrolü Modalı */}
      {isTimeModalOpen && (
        <TimeControlModal
          selectedTime={timeControl}
          onSelect={(tc) => setTimeControl(tc)}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}
    </div>
  );
};
