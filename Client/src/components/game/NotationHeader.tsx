import React, { FC, useRef, useEffect } from 'react';
import { MoveHistoryEntry } from '../../hooks/useGame';

interface NotationHeaderProps {
  historyEntries: MoveHistoryEntry[];
  viewedMoveIndex: number | null; // null = Live, -1 = Initial, 0..N-1 = Move
  onSelectMove: (index: number | null) => void;
  className?: string;
}

export const NotationHeader: FC<NotationHeaderProps> = ({
  historyEntries,
  viewedMoveIndex,
  onSelectMove,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active viewed move
  const effectiveIndex =
    viewedMoveIndex === null
      ? historyEntries.length > 0
        ? historyEntries.length - 1
        : null
      : viewedMoveIndex;

  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    } else if (effectiveIndex === null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [effectiveIndex, historyEntries.length]);

  // Group history entries into turn pairs
  const turnPairs = React.useMemo(() => {
    const pairs: {
      turnNumber: number;
      white?: { entry: MoveHistoryEntry; index: number };
      black?: { entry: MoveHistoryEntry; index: number };
    }[] = [];

    for (let i = 0; i < historyEntries.length; i++) {
      const entry = historyEntries[i];
      const turnIdx = Math.floor(i / 2);

      if (!pairs[turnIdx]) {
        pairs[turnIdx] = { turnNumber: turnIdx + 1 };
      }

      if (entry.player === 'white') {
        pairs[turnIdx].white = { entry, index: i };
      } else {
        pairs[turnIdx].black = { entry, index: i };
      }
    }

    return pairs;
  }, [historyEntries]);

  return (
    <div
      ref={scrollContainerRef}
      className={`w-full bg-[#526357] text-white px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none font-bold text-xs sm:text-sm select-none shadow-sm min-h-[34px] ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {turnPairs.length > 0 &&
        turnPairs.map((pair) => {
          const isWhiteActive = effectiveIndex === pair.white?.index;
          const isBlackActive = effectiveIndex === pair.black?.index;

          return (
            <div
              key={pair.turnNumber}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              {/* Turn Number */}
              <span className="text-white font-bold mr-0.5">
                {pair.turnNumber}.
              </span>

              {/* White Move */}
              {pair.white && (
                <button
                  ref={isWhiteActive ? activeItemRef : undefined}
                  onClick={() => onSelectMove(pair.white!.index)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${isWhiteActive
                      ? 'bg-amber-300 text-[#141f1b] shadow-sm'
                      : 'text-white hover:bg-white/20'
                    }`}
                >
                  {pair.white.entry.notation}
                </button>
              )}

              {/* Black Move */}
              {pair.black && (
                <button
                  ref={isBlackActive ? activeItemRef : undefined}
                  onClick={() => onSelectMove(pair.black!.index)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${isBlackActive
                      ? 'bg-amber-300 text-[#141f1b] shadow-sm'
                      : 'text-white hover:bg-white/20'
                    }`}
                >
                  {pair.black.entry.notation}
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
};
