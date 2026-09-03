import React, { FC, useState } from 'react';
import { ArrowLeft, Users, Copy, Check, Send, Sparkles } from 'lucide-react';
import { NotificationType } from '../types';

interface PlayAFriendModalProps {
  onClose: () => void;
  onStartOnlineGame: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

export const PlayAFriendModal: FC<PlayAFriendModalProps> = ({
  onClose,
  onStartOnlineGame,
  showNotification,
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  const handleCopy = () => {
    navigator.clipboard?.writeText(generatedCode);
    showNotification(`Oda kodu (${generatedCode}) panoya kopyalandı!`, 'success');
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      showNotification('Lütfen geçerli bir oda kodu giriniz.', 'error');
      return;
    }
    showNotification(`${roomCode.toUpperCase()} odasına bağlanılıyor...`, 'info');
    onStartOnlineGame();
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
            <span className="text-2xl">👥</span>
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Arkadaşınla Oyna
            </h2>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
          <p className="text-white/60 text-xs">
            Arkadaşına davet kodu gönder veya onun oluşturduğu odaya katıl!
          </p>

          {/* Oda Oluştur Kartı */}
          <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
            <span className="text-white font-bold text-sm">Oda Oluştur</span>
            <p className="text-white/60 text-xs">Bu kodu arkadaşına göndererek maça davet et:</p>
            <div className="flex items-center justify-between bg-black/40 border border-white/15 rounded-xl p-3">
              <span className="font-mono text-2xl font-extrabold text-[#00e5ff] tracking-widest">
                {generatedCode}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-[#7fa650] hover:bg-[#6e9343] active:scale-95 text-white font-bold text-xs py-2 px-3 rounded-lg shadow transition-all cursor-pointer"
              >
                <Copy size={14} />
                <span>Kopyala</span>
              </button>
            </div>
            <button
              onClick={() => {
                showNotification('Arkadaş bekleniyor... Oda hazır!', 'info');
                onStartOnlineGame();
              }}
              className="w-full mt-1 bg-[#7fa650] hover:bg-[#6e9343] active:scale-98 text-white font-batangas font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Odayı Başlat & Rakibi Bekle
            </button>
          </div>

          {/* Odaya Katıl Kartı */}
          <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
            <span className="text-white font-bold text-sm">Odaya Katıl</span>
            <p className="text-white/60 text-xs">Arkadaşından aldığın 6 haneli kodu buraya gir:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Örn: TM8X9A"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold tracking-widest focus:outline-none focus:border-[#7fa650] uppercase"
              />
              <button
                onClick={handleJoinRoom}
                className="bg-[#2a5b3e] hover:bg-[#34724e] active:scale-95 text-white font-bold px-5 rounded-xl transition-all cursor-pointer"
              >
                Katıl
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
