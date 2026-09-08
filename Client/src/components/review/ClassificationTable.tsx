import React, { FC, useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { CLASSIFICATION_METAS, MoveClassificationType } from '../../analyzer/types';

interface ClassificationTableProps {
  counts: {
    white: Record<MoveClassificationType, number>;
    black: Record<MoveClassificationType, number>;
  };
  whiteName: string;
  blackName: string;
}

const ORDERED_CLASSES: MoveClassificationType[] = [
  'brilliant',
  'great',
  'best',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

export const ClassificationTable: FC<ClassificationTableProps> = ({
  counts,
  whiteName,
  blackName,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Top highlight rows vs remaining
  const visibleClasses = expanded ? ORDERED_CLASSES : ORDERED_CLASSES.slice(0, 6);

  return (
    <div className="w-full bg-[#102419] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider truncate max-w-[100px]">
          {whiteName}
        </span>
        <span className="text-xs font-extrabold text-white/80 uppercase tracking-wider">
          Hamle Dağılımı
        </span>
        <span className="text-xs font-bold text-white/50 uppercase tracking-wider truncate max-w-[100px] text-right">
          {blackName}
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5 py-1">
        {visibleClasses.map((key) => {
          const meta = CLASSIFICATION_METAS[key];
          const wCount = counts.white[key] ?? 0;
          const bCount = counts.black[key] ?? 0;

          return (
            <div
              key={key}
              className="flex items-center justify-between px-2 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
            >
              {/* White Count */}
              <span
                className={`font-batangas text-sm font-extrabold w-10 text-left ${
                  wCount > 0 ? 'text-white' : 'text-white/30'
                }`}
              >
                {wCount}
              </span>

              {/* Center Badge + Label */}
              <div className="flex items-center gap-2 justify-center">
                <span
                  className={`w-6 h-6 rounded-full ${meta.badgeBg} ${meta.badgeText} flex items-center justify-center font-extrabold text-[11px] shadow-sm`}
                >
                  {meta.symbol}
                </span>
                <span className="text-xs font-bold text-white/80 w-28 text-center truncate">
                  {meta.labelTR}
                </span>
              </div>

              {/* Black Count */}
              <span
                className={`font-batangas text-sm font-extrabold w-10 text-right ${
                  bCount > 0 ? 'text-white' : 'text-white/30'
                }`}
              >
                {bCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-center gap-1 text-[11px] font-bold text-white/50 hover:text-white/90 pt-1 transition-colors cursor-pointer"
      >
        <span>{expanded ? 'Daha Az Göster' : 'Tümünü Göster'}</span>
        {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
      </button>
    </div>
  );
};
