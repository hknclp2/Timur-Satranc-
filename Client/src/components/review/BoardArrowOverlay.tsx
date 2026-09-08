import React, { FC } from 'react';
import { CLASSIFICATION_METAS, MoveClassificationType } from '../../analyzer/types';

interface BoardArrowOverlayProps {
  fromIndex?: number | null;
  toIndex?: number | null;
  bestFromIndex?: number | null;
  bestToIndex?: number | null;
  classification?: MoveClassificationType | null;
  showBestArrow?: boolean;
  flipped?: boolean;
}

function squareToCoord(idx: number, flipped: boolean): { cx: number; cy: number } {
  // Citadel 110: Left citadel (Y=8)
  if (idx === 110) {
    const rawX = -4.5;
    const rawY = ((9 - 8 + 0.5) / 10) * 100;
    return flipped ? { cx: 100 - rawX, cy: 100 - rawY } : { cx: rawX, cy: rawY };
  }
  // Citadel 111: Right citadel (Y=1)
  if (idx === 111) {
    const rawX = 104.5;
    const rawY = ((9 - 1 + 0.5) / 10) * 100;
    return flipped ? { cx: 100 - rawX, cy: 100 - rawY } : { cx: rawX, cy: rawY };
  }

  const x = idx % 11;
  const y = Math.floor(idx / 11);

  const rawX = ((x + 0.5) / 11) * 100;
  const rawY = ((9 - y + 0.5) / 10) * 100;

  if (flipped) {
    return { cx: 100 - rawX, cy: 100 - rawY };
  }
  return { cx: rawX, cy: rawY };
}

export const BoardArrowOverlay: FC<BoardArrowOverlayProps> = ({
  toIndex,
  bestFromIndex,
  bestToIndex,
  classification,
  showBestArrow = true,
  flipped = false,
}) => {
  const badgeMeta = classification ? CLASSIFICATION_METAS[classification] : null;

  const hasBestArrow =
    showBestArrow &&
    bestFromIndex !== undefined &&
    bestFromIndex !== null &&
    bestToIndex !== undefined &&
    bestToIndex !== null &&
    bestFromIndex !== bestToIndex;

  const bestFromCoord = hasBestArrow ? squareToCoord(bestFromIndex, flipped) : null;
  const bestToCoord = hasBestArrow ? squareToCoord(bestToIndex, flipped) : null;

  const playedToCoord =
    toIndex !== undefined && toIndex !== null ? squareToCoord(toIndex, flipped) : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
      {/* SVG Canvas for Best Move Arrow */}
      {bestFromCoord && bestToCoord && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="best-arrow-head"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 1 1 L 7 4 L 1 7 z" fill="#10b981" />
            </marker>
            <filter id="arrow-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background shadow line */}
          <line
            x1={`${bestFromCoord.cx}%`}
            y1={`${bestFromCoord.cy}%`}
            x2={`${bestToCoord.cx}%`}
            y2={`${bestToCoord.cy}%`}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Green Best Move Line with Arrow Head */}
          <line
            x1={`${bestFromCoord.cx}%`}
            y1={`${bestFromCoord.cy}%`}
            x2={`${bestToCoord.cx}%`}
            y2={`${bestToCoord.cy}%`}
            stroke="#10b981"
            strokeWidth="2.8"
            strokeLinecap="round"
            markerEnd="url(#best-arrow-head)"
            filter="url(#arrow-glow)"
          />

          {/* Start node circle */}
          <circle
            cx={`${bestFromCoord.cx}%`}
            cy={`${bestFromCoord.cy}%`}
            r="1.8"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="0.6"
          />
        </svg>
      )}

      {/* Move Classification Badge on Played Square */}
      {playedToCoord && badgeMeta && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-40 animate-bounce-subtle pointer-events-none"
          style={{
            left: `${playedToCoord.cx}%`,
            top: `${playedToCoord.cy}%`,
          }}
        >
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${badgeMeta.badgeBg} ${badgeMeta.badgeText} ring-2 ring-white/90 shadow-lg flex items-center justify-center font-extrabold text-[10px] sm:text-xs tracking-tighter`}
          >
            {badgeMeta.symbol}
          </div>
        </div>
      )}
    </div>
  );
};
