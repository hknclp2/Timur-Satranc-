import React, { FC } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import ekrandaOynaIcon from '../../assets/ekrandaoyna.png';
import { NotationHeader } from './NotationHeader';
import { MoveHistoryEntry } from '../../hooks/useGame';

interface HeaderProps {
  onBack: () => void;
  gameTypeTitle?: string;
  historyEntries: MoveHistoryEntry[];
  viewedMoveIndex: number | null;
  onSelectMove: (index: number | null) => void;
}

export const Header: FC<HeaderProps> = ({
  onBack,
  gameTypeTitle = 'Ekranda oyna',
  historyEntries,
  viewedMoveIndex,
  onSelectMove,
}) => {
  return (
    <header className="w-full flex flex-col bg-[#142b1f] select-none z-20 shadow-md">
      {/* 1. Başlık Satırı (Görsel 1 ile Birebir) */}
      <div className="w-full flex items-center justify-between px-3 py-2">
        <button
          onClick={onBack}
          className="p-1 text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
          aria-label="Geri Dön"
        >
          <ArrowLeft size={24} weight="bold" />
        </button>

        {/* Ortalanmış Oyun İkonu ve Başlığı */}
        <div className="flex items-center gap-2">
          <img
            src={ekrandaOynaIcon}
            alt="Ekranda Oyna"
            className="w-7 h-7 object-contain drop-shadow"
          />
          <h1 className="font-batangas text-xl sm:text-2xl font-bold text-white tracking-wide leading-none">
            {gameTypeTitle}
          </h1>
        </div>

        <div className="w-7" />
      </div>

      {/* 2. Entegre Edilmiş Notasyon Barı (Görseldeki gibi gri şerit) */}
      <NotationHeader
        historyEntries={historyEntries}
        viewedMoveIndex={viewedMoveIndex}
        onSelectMove={onSelectMove}
      />
    </header>
  );
};
