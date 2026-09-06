import React, { FC, useState } from 'react';
import { ArrowLeft, ArrowsDownUp, Clock, ArrowClockwise } from '@phosphor-icons/react';
import { TimeControl } from '../types';
import {
  MonitorPlay,
} from '@phosphor-icons/react';

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
    <div className="fixed inset-0 z-50 bg-[#122b1e]/95 flex flex-col justify-between overflow-y-auto custom-scrollbar animate-fade-in select-none">
      {/* Üst Kısım */}
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
            <MonitorPlay size={48} weight="duotone" />
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

        {/* Form Alanı (Krem Kartlar) */}
        <div className="p-5 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {/* Oyuncu İsimleri & Renk Değişimi */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col relative shadow-md border border-[#e5dcce]">
            {/* Beyaz */}
            <div className="flex items-center justify-between py-2 border-b border-[#e5dcce]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white border border-black/30 shadow-sm inline-block" />
                <span className="text-[#141f1b] font-semibold text-sm">Beyaz</span>
              </div>
              <input
                type="text"
                value={whiteName}
                onChange={(e) => setWhiteName(e.target.value)}
                className="bg-[#e4dac6] border border-[#cfc4ad] rounded-lg px-3 py-1 text-right text-[#141f1b] font-bold text-sm focus:outline-none focus:border-[#00d4c4] w-40"
              />
            </div>

            {/* Swap Butonu */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                onClick={handleSwap}
                className="w-9 h-9 rounded-full bg-[#e4dac6] hover:bg-[#d8ccb6] active:scale-90 border border-[#cfc4ad] text-[#141f1b] flex items-center justify-center shadow transition-all"
                title="Renkleri Değiştir"
              >
                <ArrowsDownUp size={17} weight="bold" />
              </button>
            </div>

            {/* Siyah */}
            <div className="flex items-center justify-between py-2 pt-4">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#141f1b] border border-black/50 shadow-sm inline-block" />
                <span className="text-[#141f1b] font-semibold text-sm">Siyah</span>
              </div>
              <input
                type="text"
                value={blackName}
                onChange={(e) => setBlackName(e.target.value)}
                className="bg-[#e4dac6] border border-[#cfc4ad] rounded-lg px-3 py-1 text-right text-[#141f1b] font-bold text-sm focus:outline-none focus:border-[#00d4c4] w-40"
              />
            </div>
          </div>

          {/* Tür Seçimi (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex items-center justify-between shadow-md border border-[#e5dcce]">
            <span className="text-[#141f1b] font-semibold text-sm">Oyun Türü</span>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="bg-[#e4dac6] border border-[#cfc4ad] rounded-xl px-3 py-2 text-[#141f1b] font-bold text-sm focus:outline-none focus:border-[#00d4c4] cursor-pointer"
            >
              <option value="Standart">Standart Timur Satrancı</option>
              <option value="Serbest">Serbest Dizilim</option>
            </select>
          </div>
          {gameType === 'Serbest' && (
            <div className="bg-[#00d4c4]/10 border border-[#00d4c4]/30 rounded-2xl px-4 py-3 text-xs text-[#0c4e48] font-medium leading-relaxed">
              Serbest dizilim seçildi — taşları özgürce dizip oyunu başlatacağın editör açılacak.
            </div>
          )}

          {/* Zaman Kontrolü Satırı & Açılır Grid (krem) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-3 shadow-md border border-[#e5dcce]">
            <button
              onClick={() => setIsTimeExpanded(!isTimeExpanded)}
              className="flex items-center justify-between w-full cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Clock size={18} weight="bold" className="text-[#008f84]" />
                <span className="text-[#141f1b] font-semibold text-sm">Zaman Kontrolü</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#e4dac6] text-[#141f1b] font-bold px-3 py-1 rounded-lg border border-[#cfc4ad] text-sm">
                  {selectedTime}
                </span>
              </div>
            </button>

            {/* Zaman Grid Seçimi */}
            {isTimeExpanded && (
              <div className="pt-3 border-t border-[#e5dcce] flex flex-col gap-2.5 animate-slide-down">
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
                        className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${active
                          ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.02] shadow'
                          : 'bg-[#e4dac6] text-[#141f1b] hover:bg-[#ded2bd] active:scale-95'
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
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${selectedTime === 'Süresiz'
                    ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.01] shadow'
                    : 'bg-[#e4dac6] text-[#141f1b] hover:bg-[#ded2bd] active:scale-95'
                    }`}
                >
                  Süresiz (No Timer)
                </button>
              </div>
            )}
          </div>

          {/* Tahtayı Döndür (Board Rotates Switch) */}
          <div className="bg-[#f5eedc] rounded-2xl p-4 flex items-center justify-between shadow-md border border-[#e5dcce]">
            <div className="flex items-center gap-2.5">
              <ArrowClockwise size={18} weight="bold" className="text-[#008f84]" />
              <div>
                <span className="text-[#141f1b] font-semibold text-sm block">Tahtayı Döndür</span>
                <span className="text-[#5c6c66] text-xs">Her hamlede oyuncu yönüne çevir</span>
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
              <div className="w-12 h-6 bg-[#d8ccb6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d4c4]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Alt Aksiyon Butonu */}
      <div className="p-5 max-w-lg mx-auto w-full pb-8">
        <button
          onClick={handlePlay}
          className="w-full bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-batangas font-bold py-4 rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <span className="font-batangas text-xl font-bold">Oyuna Başla</span>
        </button>
      </div>
    </div>
  );
};
