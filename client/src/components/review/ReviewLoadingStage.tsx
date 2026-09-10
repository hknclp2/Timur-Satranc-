import React, { FC, useEffect, useMemo, useRef } from 'react';
import type { MoveHistoryEntry } from '../../hooks/useGame';
import { BoardContainer } from '../game/BoardContainer';
import { positionToLegacyBoardAndCitadels, legacyGameStateToPosition } from '../../worker/legacyAdapter';
import { createInitialGameState } from '../../core/engine/boardSetup';
import type { Position } from '../../core/position/Position';

interface ReviewLoadingStageProps {
  historyEntries: MoveHistoryEntry[];
  progress: number;
  flipped: boolean;
  initialPosition?: Position;
  reportError: string | null;
  onRetry: () => void;
}

/**
 * Analiz sürerken gösterilen canlı yüklenme sahnesi:
 * ortada büyük (salt-izlenir) tahta + analizin yüzdesine oranla
 * sırasıyla açılan hamle çipleri + tahta altında ince progress bar.
 */
export const ReviewLoadingStage: FC<ReviewLoadingStageProps> = ({
  historyEntries,
  progress,
  flipped,
  initialPosition,
  reportError,
  onRetry,
}) => {
  const total = historyEntries.length;
  const visibleCount = useMemo(() => {
    if (total === 0) return 0;
    const n = Math.floor((Math.max(0, Math.min(100, progress)) / 100) * total);
    return Math.max(0, Math.min(total, n));
  }, [progress, total]);

  const visibleEntries = useMemo(
    () => historyEntries.slice(0, visibleCount),
    [historyEntries, visibleCount],
  );

  const { board, citadels } = useMemo(() => {
    if (visibleCount > 0) {
      const last = historyEntries[visibleCount - 1];
      return { board: last.boardState, citadels: last.citadelsState };
    }
    const initialPos = initialPosition ?? legacyGameStateToPosition(createInitialGameState());
    return positionToLegacyBoardAndCitadels(initialPos);
  }, [historyEntries, visibleCount, initialPosition]);

  const lastMove = useMemo(() => {
    if (visibleCount === 0) return null;
    const last = historyEntries[visibleCount - 1];
    return { from: last.from, to: last.to } as unknown as import('../../types/chess').Move;
  }, [historyEntries, visibleCount]);

  const turn = visibleCount > 0 ? historyEntries[visibleCount - 1].player : 'white';

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  }, [visibleCount]);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2.5 pb-6 animate-fade-in select-none">
      {/* Başlık */}
      <div className="text-center pt-1">
        <h2 className="font-batangas text-lg font-bold text-emerald-200">
          Oyun Analiz Ediliyor
        </h2>
        <p className="text-[11px] text-white/50 mt-0.5">
          Motor hamleleri sırayla inceliyor — tahta analizle birlikte ilerliyor...
        </p>
      </div>

      {/* Büyük canlı tahta (salt-izlenir) */}
      <div className="relative w-full flex items-center justify-center min-h-[380px]">
        <div className="relative w-full">
          <BoardContainer
            board={board}
            citadels={citadels}
            selectedPos={null}
            validMoves={[]}
            lastMove={lastMove}
            turn={turn}
            flipped={flipped}
            onSquareClick={() => undefined}
          />
        </div>
      </div>

      {/* İnce progress bar */}
      {!reportError ? (
        <div className="flex flex-col gap-1">
          <div className="w-full h-1.5 rounded-full bg-black/40 border border-white/10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
            <span>
              {visibleCount}/{total} hamle
            </span>
            <span>%{progress}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 mt-1">
          <p className="text-xs text-red-300 font-bold max-w-64 text-center">{reportError}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-sm font-bold transition-all cursor-pointer"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Kademeli hamle şeridi */}
      <div className="w-full bg-[#102419] border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 shadow-md">
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 px-1 scroll-smooth min-h-[40px]"
        >
          {visibleEntries.length === 0 && !reportError && (
            <span className="text-[11px] text-white/40 font-semibold px-2">
              Hamleler analiz edildikçe burada belirecek...
            </span>
          )}
          {visibleEntries.map((entry, idx) => (
            <div
              key={`${entry.turnNumber}-${entry.player}-${idx}`}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                idx === visibleEntries.length - 1
                  ? 'bg-white text-gray-900 shadow-md scale-105 ring-2 ring-emerald-400'
                  : 'bg-white/5 text-white/70'
              }`}
            >
              {entry.player === 'white' && (
                <span className="opacity-50 mr-0.5">{entry.turnNumber}.</span>
              )}
              <span className="truncate">{entry.notation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
