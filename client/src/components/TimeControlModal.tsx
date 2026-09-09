import React, { FC, useState } from 'react';
import { ArrowLeft, Lightning, Rocket, Clock, Sun, Sliders, Check } from '@phosphor-icons/react';
import { TimeControl } from '../types';

interface TimeControlModalProps {
  selectedTime: TimeControl;
  onSelect: (time: TimeControl) => void;
  onClose: () => void;
}

const BULLET_PRESETS: TimeControl[] = [
  { category: 'bullet', label: '1 dk', initialMinutes: 1, incrementSeconds: 0, icon: '🚀' },
  { category: 'bullet', label: '1 + 1', initialMinutes: 1, incrementSeconds: 1, icon: '🚀' },
  { category: 'bullet', label: '2 + 1', initialMinutes: 2, incrementSeconds: 1, icon: '🚀' },
];

const BLITZ_PRESETS: TimeControl[] = [
  { category: 'blitz', label: '3 dk', initialMinutes: 3, incrementSeconds: 0, icon: '⚡' },
  { category: 'blitz', label: '3 + 2', initialMinutes: 3, incrementSeconds: 2, icon: '⚡' },
  { category: 'blitz', label: '5 dk', initialMinutes: 5, incrementSeconds: 0, icon: '⚡' },
  { category: 'blitz', label: '5 + 5', initialMinutes: 5, incrementSeconds: 5, icon: '⚡' },
  { category: 'blitz', label: '5 + 2', initialMinutes: 5, incrementSeconds: 2, icon: '⚡' },
];

const RAPID_PRESETS: TimeControl[] = [
  { category: 'rapid', label: '10 dk', initialMinutes: 10, incrementSeconds: 0, icon: '⏱️' },
  { category: 'rapid', label: '15 + 10', initialMinutes: 15, incrementSeconds: 10, icon: '⏱️' },
  { category: 'rapid', label: '30 dk', initialMinutes: 30, incrementSeconds: 0, icon: '⏱️' },
  { category: 'rapid', label: '10 + 5', initialMinutes: 10, incrementSeconds: 5, icon: '⏱️' },
  { category: 'rapid', label: '20 dk', initialMinutes: 20, incrementSeconds: 0, icon: '⏱️' },
  { category: 'rapid', label: '60 dk', initialMinutes: 60, incrementSeconds: 0, icon: '⏱️' },
];

const DAILY_PRESETS: TimeControl[] = [
  { category: 'daily', label: '1 gün', initialMinutes: 1440, incrementSeconds: 0, icon: '☀️' },
  { category: 'daily', label: '2 gün', initialMinutes: 2880, incrementSeconds: 0, icon: '☀️' },
  { category: 'daily', label: '3 gün', initialMinutes: 4320, incrementSeconds: 0, icon: '☀️' },
  { category: 'daily', label: '5 gün', initialMinutes: 7200, incrementSeconds: 0, icon: '☀️' },
  { category: 'daily', label: '7 gün', initialMinutes: 10080, incrementSeconds: 0, icon: '☀️' },
  { category: 'daily', label: '14 gün', initialMinutes: 20160, incrementSeconds: 0, icon: '☀️' },
];

export const TimeControlModal: FC<TimeControlModalProps> = ({
  selectedTime,
  onSelect,
  onClose,
}) => {
  const [customMin, setCustomMin] = useState<number>(
    selectedTime.category === 'custom' ? selectedTime.initialMinutes : 10
  );
  const [customSec, setCustomSec] = useState<number>(
    selectedTime.category === 'custom' ? selectedTime.incrementSeconds : 0
  );

  const isSelected = (tc: TimeControl) =>
    selectedTime.category === tc.category && selectedTime.label === tc.label;

  const handleApplyCustom = () => {
    const label = customSec > 0 ? `${customMin} + ${customSec}` : `${customMin} dk`;
    onSelect({
      category: 'custom',
      label,
      initialMinutes: customMin,
      incrementSeconds: customSec,
      icon: '⚙️',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#122b1e]/95 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in select-none">
      {/* Üst Başlık */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-3 border-b border-white/10 sticky top-0 bg-[#122b1e]/95 z-20">
        <button
          onClick={onClose}
          className="mobile-back-btn p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
          aria-label="Geri"
        >
          <ArrowLeft size={26} weight="bold" />
        </button>
        <h2 className="font-batangas text-2xl font-bold text-white tracking-wide">
          Zaman Kontrolü
        </h2>
      </div>

      <div className="p-5 flex flex-col gap-5 max-w-lg mx-auto w-full pb-14">
        {/* 1. Kurşun (Bullet) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Rocket size={17} weight="bold" />
            <span>Kurşun (Bullet)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {BULLET_PRESETS.map((tc) => {
              const active = isSelected(tc);
              return (
                <button
                  key={tc.label}
                  onClick={() => {
                    onSelect(tc);
                    onClose();
                  }}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                    active
                      ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.02] font-extrabold shadow-md'
                      : 'bg-[#f5eedc] text-[#141f1b] hover:bg-[#eae2cf] active:scale-95'
                  }`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Yıldırım (Blitz) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-yellow-300 font-bold text-sm">
            <Lightning size={17} weight="bold" />
            <span>Yıldırım (Blitz)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {BLITZ_PRESETS.map((tc) => {
              const active = isSelected(tc);
              return (
                <button
                  key={tc.label}
                  onClick={() => {
                    onSelect(tc);
                    onClose();
                  }}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                    active
                      ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.02] font-extrabold shadow-md'
                      : 'bg-[#f5eedc] text-[#141f1b] hover:bg-[#eae2cf] active:scale-95'
                  }`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Hızlı (Rapid) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[#00e5ff] font-bold text-sm">
            <Clock size={17} weight="bold" />
            <span>Hızlı (Rapid)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {RAPID_PRESETS.map((tc) => {
              const active = isSelected(tc);
              return (
                <button
                  key={tc.label}
                  onClick={() => {
                    onSelect(tc);
                    onClose();
                  }}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                    active
                      ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.02] font-extrabold shadow-md'
                      : 'bg-[#f5eedc] text-[#141f1b] hover:bg-[#eae2cf] active:scale-95'
                  }`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Günlük (Daily) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-300 font-bold text-sm">
              <Sun size={17} weight="bold" />
              <span>Günlük (Daily)</span>
            </div>
            <span className="text-[11px] text-white/50 font-medium">(Hamle Başına Süre)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {DAILY_PRESETS.map((tc) => {
              const active = isSelected(tc);
              return (
                <button
                  key={tc.label}
                  onClick={() => {
                    onSelect(tc);
                    onClose();
                  }}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center cursor-pointer shadow-md ${
                    active
                      ? 'bg-[#00d4c4] text-[#0d2818] ring-2 ring-white scale-[1.02] font-extrabold shadow-md'
                      : 'bg-[#f5eedc] text-[#141f1b] hover:bg-[#eae2cf] active:scale-95'
                  }`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Özel Süre (Custom) */}
        <div className="bg-[#f5eedc] rounded-2xl p-4 flex flex-col gap-4 shadow-lg border border-[#e5dcce]">
          <div className="flex items-center gap-2 text-[#0e3b2e] font-bold text-base">
            <Sliders size={18} weight="bold" className="text-[#00a89a]" />
            <span className="font-batangas">Özel Zaman Ayarı</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#3c4c45] font-semibold">Başlangıç Süresi</span>
              <span className="font-bold text-[#141f1b] bg-[#e4dac6] px-2.5 py-0.5 rounded-lg border border-[#cfc4ad]">
                {customMin} dk
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#5c6c66] font-bold">1</span>
              <input
                type="range"
                min="1"
                max="120"
                value={customMin}
                onChange={(e) => setCustomMin(Number(e.target.value))}
                className="w-full h-2 bg-[#d8ccb6] rounded-lg appearance-none cursor-pointer accent-[#00d4c4]"
              />
              <span className="text-xs text-[#5c6c66] font-bold">120</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#3c4c45] font-semibold">Hamle Başına Ek Süre (Artış)</span>
              <span className="font-bold text-[#141f1b] bg-[#e4dac6] px-2.5 py-0.5 rounded-lg border border-[#cfc4ad]">
                {customSec} sn
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#5c6c66] font-bold">0</span>
              <input
                type="range"
                min="0"
                max="60"
                value={customSec}
                onChange={(e) => setCustomSec(Number(e.target.value))}
                className="w-full h-2 bg-[#d8ccb6] rounded-lg appearance-none cursor-pointer accent-[#00d4c4]"
              />
              <span className="text-xs text-[#5c6c66] font-bold">60</span>
            </div>
          </div>

          <button
            onClick={handleApplyCustom}
            className="w-full mt-2 bg-[#00d4c4] hover:bg-[#00c4b4] active:scale-[0.98] text-[#0d2818] font-batangas font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={18} weight="bold" />
            <span>Özel Süreyi Ayarla ({customMin} dk {customSec > 0 ? `+ ${customSec} sn` : ''})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
