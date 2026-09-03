import React, { FC, useState } from 'react';
import { ArrowLeft, ArrowUpDown, Smartphone, Clock, RotateCw, Check } from 'lucide-react';
import { TimeControl } from '../types';

interface PlayInPersonModalProps {
  onClose: () => void;
  onStart: (config: {
    whiteName: string;
    blackName: string;
    timeControl: string;
    boardRotates: boolean;
    gameType: string;
  }) => void;
}

const IN_PERSON_TIME_PRESETS = [
  '30 dk',
  '15 + 10',
  '10 dk',
  '5 + 5',
  '3 + 2',
  '2 + 1',
  '5 dk',
  '3 dk',
  '1 dk',
  'Süresiz',
];

export const PlayInPersonModal: FC<PlayInPersonModalProps> = ({ onClose, onStart }) => {
  const [whiteName, setWhiteName] = useState('Oyuncu 1');
  const [blackName, setBlackName] = useState('Oyuncu 2 (Misafir)');
  const [gameType, setGameType] = useState('Standart');
  const [selectedTime, setSelectedTime] = useState('3 + 2');
  const [isTimeExpanded, setIsTimeExpanded] = useState(false);
  const [boardRotates, setBoardRotates] = useState(false);

  const handleSwap = () => {
    const temp = whiteName;
    setWhiteName(blackName);
    setBlackName(temp);
  };

  const handlePlay = () => {
    onStart({
      whiteName,
      blackName,
      timeControl: selectedTime,
      boardRotates,
      gameType,
    });
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
          <div className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
              Ekranda Oyna
            </h2>
          </div>
        </div>

        {/* Alt Açıklama */}
        <div className="px-5 pt-4 pb-2 text-center">
          <p className="text-white/60 text-sm font-medium">
            Arkadaşınla aynı cihazda çevrimdışı oyna
          </p>
        </div>

        {/* Form Alanı */}
        <div className="p-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {/* Oyuncu İsimleri & Renk Değişimi */}
          <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col relative shadow-md">
            {/* Beyaz */}
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-black/30 shadow-sm inline-block" />
                <span className="text-white/80 font-medium text-sm">Beyaz</span>
              </div>
              <input
                type="text"
                value={whiteName}
                onChange={(e) => setWhiteName(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right text-white font-bold text-sm focus:outline-none focus:border-[#7fa650] w-40"
              />
            </div>

            {/* Swap Butonu */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                onClick={handleSwap}
                className="w-9 h-9 rounded-full bg-[#27533a] hover:bg-[#32694a] active:scale-90 border border-white/20 text-white flex items-center justify-center shadow-lg transition-all"
                title="Renkleri Değiştir"
              >
                <ArrowUpDown size={18} />
              </button>
            </div>

            {/* Siyah */}
            <div className="flex items-center justify-between py-2 pt-4">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-gray-900 border border-white/30 shadow-sm inline-block" />
                <span className="text-white/80 font-medium text-sm">Siyah</span>
              </div>
              <input
                type="text"
                value={blackName}
                onChange={(e) => setBlackName(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right text-white font-bold text-sm focus:outline-none focus:border-[#7fa650] w-40"
              />
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

          {/* Zaman Kontrolü Satırı & Açılır Grid */}
          <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
            <button
              onClick={() => setIsTimeExpanded(!isTimeExpanded)}
              className="flex items-center justify-between w-full cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#7fa650]" />
                <span className="text-white/80 font-medium text-sm">Zaman Kontrolü</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-black/40 text-[#7fa650] font-bold px-3 py-1 rounded-lg border border-[#7fa650]/30 text-sm">
                  {selectedTime}
                </span>
              </div>
            </button>

            {/* Zaman Grid Seçimi (Görsel 2) */}
            {isTimeExpanded && (
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5 animate-slide-down">
                <div className="grid grid-cols-3 gap-2">
                  {IN_PERSON_TIME_PRESETS.filter((t) => t !== 'Süresiz').map((timeStr) => {
                    const active = selectedTime === timeStr;
                    return (
                      <button
                        key={timeStr}
                        onClick={() => {
                          setSelectedTime(timeStr);
                          setIsTimeExpanded(false);
                        }}
                        className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                          active
                            ? 'bg-[#2b573c] text-white ring-2 ring-[#7fa650] scale-[1.02] shadow-md shadow-[#7fa650]/20'
                            : 'bg-[#213a2c] text-white/90 hover:bg-[#284937] active:scale-95'
                        }`}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
                {/* Süresiz Seçeneği */}
                <button
                  onClick={() => {
                    setSelectedTime('Süresiz');
                    setIsTimeExpanded(false);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                    selectedTime === 'Süresiz'
                      ? 'bg-[#2b573c] text-white ring-2 ring-[#7fa650] scale-[1.01] shadow-md shadow-[#7fa650]/20'
                      : 'bg-[#213a2c] text-white/90 hover:bg-[#284937] active:scale-95'
                  }`}
                >
                  Süresiz (No Timer)
                </button>
              </div>
            )}
          </div>

          {/* Tahtayı Döndür (Board Rotates Switch) */}
          <div className="bg-[#1b3b29] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <RotateCw size={18} className="text-[#00e5ff]" />
              <div>
                <span className="text-white font-medium text-sm block">Tahtayı Döndür</span>
                <span className="text-white/40 text-xs">Her hamlede oyuncu yönüne çevir</span>
              </div>
            </div>
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={boardRotates}
                onChange={(e) => setBoardRotates(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7fa650]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Alt Aksiyon Butonu */}
      <div className="p-5 max-w-lg mx-auto w-full pb-8">
        <button
          onClick={handlePlay}
          className="w-full bg-[#7fa650] hover:bg-[#6e9343] active:scale-[0.98] text-white font-batangas text-xl font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[#7fa650]/30"
        >
          <span>Oyuna Başla</span>
        </button>
      </div>
    </div>
  );
};
