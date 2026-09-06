import React, { FC } from 'react';
import { Piece, PlayerColor } from '../../types/chess';
import { formatTime } from '../../utils/timeFormatter';
import { Hourglass } from '@phosphor-icons/react';
import { CapturedPieces } from './CapturedPieces';

interface PlayerCardProps {
  name: string;
  side: PlayerColor;
  timeSeconds: number;
  isActive: boolean;
  avatarText?: string;
  isTopPlayer?: boolean;
  capturedPieces?: Piece[];
  materialAdvantage?: number;
}

export const PlayerCard: FC<PlayerCardProps> = ({
  name,
  side,
  timeSeconds,
  isActive,
  isTopPlayer = false,
  capturedPieces = [],
  materialAdvantage,
}) => {
  return (
    <div className="w-full max-w-[500px] px-3 py-1.5 flex items-center justify-between select-none bg-[#132b1d]/90 border-b border-white/10 border-t border-t-white/10">
      {/* Sol: Krem Kare Avatar + İsim ve Kazanılan Taşlar / Puan */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {/* Krem Renkli Kare Avatar Kutusu */}
        <div className="w-12 h-12 rounded-xl bg-[#eae5d8] flex items-center justify-center text-xl text-[#141f1b] font-bold shadow-md shrink-0">
          <span className="opacity-85">{side === 'white' ? '♔' : '♚'}</span>
        </div>

        {/* İsim ve Alttaki Kazanılan Taşlar / Puan Bilgisi */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="font-batangas text-base font-bold text-white tracking-wide truncate">
            {name}
          </span>

          {capturedPieces.length > 0 && (
            <CapturedPieces
              pieces={capturedPieces}
              materialAdvantage={materialAdvantage}
              playerColor={side}
            />
          )}
        </div>
      </div>

      {/* Sağ: Zamanlayıcı Kutusu (Görseldeki gibi) */}
      <div
        className={`px-3.5 py-2 rounded-lg flex items-center gap-2 font-bold text-lg transition-all duration-150 shrink-0 border ${isActive
            ? 'bg-white text-[#141f1b] border-transparent shadow-lg'
            : 'bg-[#1a1a1a]/70 text-white/70 border-white/15'
          }`}
      >
        <Hourglass
          size={16}
          weight="bold"
          className={
            isActive
              ? 'text-[#141f1b]'
              : 'text-white/70'
          }
        />
        <span>{formatTime(timeSeconds)}</span>
      </div>
    </div>
  );
};
