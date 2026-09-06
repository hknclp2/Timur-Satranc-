import React, { FC, useState } from 'react';
import { ArrowLeft, Users, Copy } from '@phosphor-icons/react';
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
    onStartOnlineGame();
  };

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
            <Users size={26} weight="duotone" className="text-white" />
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Arkadaşınla Oyna
            </h2>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5 max-w-lg mx-auto w-full">
          <p className="text-[#A7BDB1] text-xs">
            Arkadaşına davet kodu gönder veya onun oluşturduğu odaya katıl!
          </p>

          {/* Oda Oluştur Kartı (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce]">
            <span className="text-[#141f1b] font-bold text-sm">Oda Oluştur</span>
            <p className="text-[#5c6c66] text-xs">Bu kodu arkadaşına göndererek maça davet et:</p>
            <div className="flex items-center justify-between bg-[#e4dac6] border border-[#cfc4ad] rounded-xl p-3">
              <span className="font-mono text-2xl font-extrabold text-[#0c4e48] tracking-widest">
                {generatedCode}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-95 text-[#0d2818] font-bold text-xs py-2 px-3 rounded-lg shadow transition-all cursor-pointer"
              >
                <Copy size={14} weight="bold" />
                <span>Kopyala</span>
              </button>
            </div>
            <button
              onClick={() => {
                onStartOnlineGame();
              }}
              className="w-full mt-1 bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-98 text-[#0d2818] font-batangas font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer text-sm"
            >
              Odayı Başlat & Rakibi Bekle
            </button>
          </div>

          {/* Odaya Katıl Kartı (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce]">
            <span className="text-[#141f1b] font-bold text-sm">Odaya Katıl</span>
            <p className="text-[#5c6c66] text-xs">Arkadaşından aldığın 6 haneli kodu buraya gir:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Örn: TM8X9A"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 bg-[#e4dac6] border border-[#cfc4ad] rounded-xl px-4 py-2.5 text-[#141f1b] font-mono text-lg font-bold tracking-widest focus:outline-none focus:border-[#00d4c4] uppercase"
              />
              <button
                onClick={handleJoinRoom}
                className="bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-95 text-[#0d2818] font-bold px-5 rounded-xl transition-all cursor-pointer font-batangas"
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
