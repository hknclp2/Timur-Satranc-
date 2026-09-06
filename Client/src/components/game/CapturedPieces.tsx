import React, { FC, useMemo } from 'react';
import { Piece, PieceType, PlayerColor } from '../../types/chess';
import { PIECE_ASSETS } from '../board/PieceView';
import { defaultMaterialCalculator } from '../../core/material/MaterialCalculator';

interface CapturedPiecesProps {
  pieces: Piece[]; // Pieces captured BY this player
  materialAdvantage?: number; // Advantage points (+N)
  playerColor?: PlayerColor;
  className?: string;
}

export const CapturedPieces: FC<CapturedPiecesProps> = ({
  pieces,
  materialAdvantage,
  className = '',
}) => {
  // Group pieces by type
  const grouped = useMemo(() => {
    return defaultMaterialCalculator.groupPieces(pieces);
  }, [pieces]);

  const entries = Object.entries(grouped) as [PieceType, number][];

  if (entries.length === 0 && (!materialAdvantage || materialAdvantage <= 0)) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto max-w-full select-none text-xs scrollbar-none py-0.5 ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Stacked piece icons */}
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {entries.map(([type, count]) => {
          const samplePiece = pieces.find((p) => p.type === type);
          const color = samplePiece ? samplePiece.color : 'black';
          const asset = PIECE_ASSETS[color][type];

          return (
            <div
              key={type}
              className="relative flex items-center shrink-0 pr-1"
              title={`${type} (${count})`}
            >
              {/* Overlapped / Nested Stack of pieces */}
              <div className="flex items-center -space-x-2.5">
                {Array.from({ length: Math.min(count, 4) }).map((_, idx) => (
                  <img
                    key={idx}
                    src={asset}
                    alt={type}
                    className="w-4 h-4 object-contain filter drop-shadow hover:scale-110 transition-transform"
                    style={{ zIndex: idx }}
                    draggable={false}
                  />
                ))}
              </div>

              {/* Count multiplier for >1 */}
              {count > 1 && (
                <span className="text-[9px] font-extrabold text-amber-300 ml-1 leading-none">
                  x{count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Material Advantage Badge (+N) */}
      {materialAdvantage !== undefined && materialAdvantage > 0 && (
        <span className="text-[10px] font-bold text-[#70db8b] font-mono shrink-0">
          +{materialAdvantage}
        </span>
      )}
    </div>
  );
};
