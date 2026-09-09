import React, { FC, useMemo } from 'react';
import { Piece, PieceType, PlayerColor } from '../../types/chess';

// White Piece Assets
import bAt from '../../assets/pieces/b_at.png';
import bDeve from '../../assets/pieces/b_deve.png';
import bFil from '../../assets/pieces/b_fil.png';
import bGeneral from '../../assets/pieces/b_general.png';
import bKale from '../../assets/pieces/b_kale.png';
import bKazik from '../../assets/pieces/b_kazik.png';
import bMancinik from '../../assets/pieces/b_mancinik.png';
import bPiyon from '../../assets/pieces/b_piyon.png';
import bSah from '../../assets/pieces/b_sah.png';
import bVezir from '../../assets/pieces/b_vezir.png';
import bZurafa from '../../assets/pieces/b_zurafa.png';

// Black Piece Assets
import sAt from '../../assets/pieces/s_at.png';
import sDeve from '../../assets/pieces/s_deve.png';
import sFil from '../../assets/pieces/s_fil.png';
import sGeneral from '../../assets/pieces/s_general.png';
import sKale from '../../assets/pieces/s_kale.png';
import sKazik from '../../assets/pieces/s_kazik.png';
import sMancinik from '../../assets/pieces/s_mancinik.png';
import sPiyon from '../../assets/pieces/s_piyon.png';
import sSah from '../../assets/pieces/s_sah.png';
import sVezir from '../../assets/pieces/s_vezir.png';
import sZurafa from '../../assets/pieces/s_zurafa.png';

export const PIECE_ASSETS: Record<PlayerColor, Record<PieceType, string>> = {
  white: {
    pawn: bPiyon,
    rook: bKale,
    knight: bAt,
    bishop: bFil,
    queen: bVezir,
    king: bSah,
    general: bGeneral,
    giraffe: bZurafa,
    picket: bKazik,
    camel: bDeve,
    warMachine: bMancinik,
    prince: bSah,
  },
  black: {
    pawn: sPiyon,
    rook: sKale,
    knight: sAt,
    bishop: sFil,
    queen: sVezir,
    king: sSah,
    general: sGeneral,
    giraffe: sZurafa,
    picket: sKazik,
    camel: sDeve,
    warMachine: sMancinik,
    prince: sSah,
  },
};

export interface PieceRotationOptions {
  pieceColor?: PlayerColor;
  currentTurn?: PlayerColor;
  boardRotates?: boolean;
  /**
   * İzleyici siyah taraftaysa true (tahta çerçevesi 180° dönüktür).
   * Taşlar HER DAİM izleyiciye dönük olur — sıra kimdeyse ona değil.
   */
  flipped?: boolean;
}

/**
 * Taş rotasyonu (izleyici-bazlı):
 * - boardRotates modunda (yerel, tahta sırayla döner): çerçevenin tersine
 *   dengele, taşlar hamle sırası gelene dönük olur (eski davranış korunur).
 * - flipped izleyicide (siyah, çerçeve 180°): sabit 180° ile çerçeveyi
 *   dengele → taşlar siyah izleyiciye hep düz görünür.
 * - Normalde (beyaz izleyici): 0° → taşlar beyaza hep düz görünür.
 */
export function getPieceRotation({
  currentTurn = 'white',
  boardRotates = false,
  flipped = false,
}: PieceRotationOptions): number {
  if (boardRotates) {
    // Counter-rotate pieces to keep them upright when board is flipped 180°
    return currentTurn === 'black' ? -180 : 0;
  }
  if (flipped) return 180;
  return 0;
}

interface PieceViewProps {
  piece: Piece;
  isSelected?: boolean;
  isTarget?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'responsive';
  currentTurn?: PlayerColor;
  boardRotates?: boolean;
  /** İzleyici siyah taraftaysa true — taşlar izleyiciye dönük kalır. */
  flipped?: boolean;
  disableRotation?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const PieceView: FC<PieceViewProps> = ({
  piece,
  isSelected = false,
  isTarget = false,
  className = '',
  size = 'responsive',
  currentTurn = 'white',
  boardRotates = false,
  flipped = false,
  disableRotation = false,
  draggable = true,
  onDragStart,
}) => {
  const imgSrc = useMemo(() => {
    return PIECE_ASSETS[piece.color]?.[piece.type] || bPiyon;
  }, [piece.color, piece.type]);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    responsive: 'w-full h-full max-w-[88%] max-h-[88%]',
  }[size];

  const rotation = useMemo(() => {
    if (disableRotation) return 0;
    return getPieceRotation({
      pieceColor: piece.color,
      currentTurn,
      boardRotates,
      flipped,
    });
  }, [disableRotation, piece.color, currentTurn, boardRotates, flipped]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'piece',
        piece,
        from: piece.position,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
    // Sürüklenen taşın görünmesi için sürükleme görselini açıkça ata.
    // (Bazı tarayıcılarda transform/drop-shadow nedeniyle hayalet görsel kayboluyordu.)
    try {
      const target = e.currentTarget as HTMLDivElement;
      const img = target.querySelector('img');
      if (img) {
        e.dataTransfer.setDragImage(img, img.clientWidth / 2, img.clientHeight / 2);
      }
    } catch {
      /* ignore */
    }
    onDragStart?.(e);
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing ${
        isSelected ? 'scale-110 -translate-y-0.5' : 'hover:scale-105'
      } ${className}`}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
    >
      <img
        src={imgSrc}
        alt={`${piece.color} ${piece.type}`}
        className={`${sizeClasses} object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none ${
          isTarget ? 'brightness-110 contrast-125 animate-pulse' : ''
        }`}
        draggable={false}
      />
    </div>
  );
};
