import React, { FC } from 'react';
import { PieceType, PlayerColor } from '../../types/chess';
import { PIECE_ASSETS } from './PieceView';
import { Sparkle } from '@phosphor-icons/react';

interface PromotionModalProps {
  color: PlayerColor;
  defaultPromotionType: PieceType;
  onSelectPromotion: (type: PieceType) => void;
}

const PROMOTION_CHOICES: { type: PieceType; label: string }[] = [
  { type: 'queen', label: 'Vezir' },
  { type: 'general', label: 'Fers' },
  { type: 'rook', label: 'Kale' },
  { type: 'knight', label: 'At' },
  { type: 'bishop', label: 'Fil' },
  { type: 'giraffe', label: 'Zürafa' },
  { type: 'picket', label: 'Nöbetçi' },
  { type: 'camel', label: 'Deve' },
  { type: 'warMachine', label: 'Mancınık' },
];

export const PromotionModal: FC<PromotionModalProps> = ({
  color,
  defaultPromotionType,
  onSelectPromotion,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1c3829] border border-amber-400/40 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-4 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 animate-bounce">
          <Sparkle size={24} weight="bold" />
        </div>

        <div>
          <h3 className="font-batangas text-xl font-bold text-[#f4eedd]">
            Piyon Terfisi (Promotion)
          </h3>
          <p className="text-white/70 text-xs mt-1">
            Hedef taşa terfi etmek için bir taş seçin:
          </p>
        </div>

        {/* Quick Default Option */}
        <button
          onClick={() => onSelectPromotion(defaultPromotionType)}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-98 transition cursor-pointer text-sm"
        >
          <img
            src={PIECE_ASSETS[color][defaultPromotionType]}
            alt={defaultPromotionType}
            className="w-7 h-7 object-contain"
          />
          <span>Orijinal Kök Taş: {PROMOTION_CHOICES.find(c => c.type === defaultPromotionType)?.label || defaultPromotionType}</span>
        </button>

        {/* Other choices grid */}
        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          {PROMOTION_CHOICES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelectPromotion(type)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 active:scale-95 transition cursor-pointer"
            >
              <img
                src={PIECE_ASSETS[color][type]}
                alt={type}
                className="w-8 h-8 object-contain mb-1"
              />
              <span className="text-[10px] font-semibold text-white/90">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
