import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowsClockwise,
  ChartLine,
  MagnifyingGlassPlus,
  Play,
  ListBullets,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { MoveHistoryEntry } from '../hooks/useGame';
import { PlayerColor } from '../types/chess';
import { TimurEngine } from '../engine/timurEngine';
import { analyzeFullGame } from '../analyzer/gameAnalyzer';
import { FullGameReviewReport } from '../analyzer/types';
import { createInitialGameState } from '../core/engine/boardSetup';
import { legacyGameStateToPosition, squareToLegacy } from '../worker/legacyAdapter';
import { makeMove } from '../core/rules/makeMove';
import { Move } from '../core/move/Move';
import { ReviewSummaryStage } from '../components/review/ReviewSummaryStage';
import { ReviewInteractiveStage } from '../components/review/ReviewInteractiveStage';

export interface GameReviewViewProps {
  historyEntries: MoveHistoryEntry[];
  whiteName: string;
  blackName: string;
  winner: PlayerColor | 'draw' | null;
  statusText: string;
  onBack: () => void;
  onOpenSelfAnalysis: () => void;
  onRematch?: () => void;
}

export const GameReviewView: FC<GameReviewViewProps> = ({
  historyEntries,
  whiteName,
  blackName,
  winner,
  statusText,
  onBack,
  onOpenSelfAnalysis,
  onRematch,
}) => {
  const [activeStage, setActiveStage] = useState<'summary' | 'interactive'>('summary');
  const [report, setReport] = useState<FullGameReviewReport | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentPly, setCurrentPly] = useState<number>(1);
  const [flipped, setFlipped] = useState(false);

  // Background Game Analysis
  useEffect(() => {
    let isMounted = true;

    async function runAnalysis() {
      // Create initial board position
      const initialLegacy = createInitialGameState();
      const initialPos = legacyGameStateToPosition(initialLegacy);

      // Reconstruct Core Move array from historyEntries
      const moves: Move[] = [];
      let currentPos = initialPos;

      for (const entry of historyEntries) {
        const fromSq = entry.from.isCitadel
          ? entry.from.citadelSide === 'left'
            ? 110
            : 111
          : entry.from.y * 11 + entry.from.x;

        const toSq = entry.to.isCitadel
          ? entry.to.citadelSide === 'left'
            ? 110
            : 111
          : entry.to.y * 11 + entry.to.x;

        const piece = currentPos.board[fromSq];
        if (!piece) continue;

        const move: Move = {
          from: fromSq,
          to: toSq,
          piece,
          capturedPiece: currentPos.board[toSq],
          specialFlags: [],
          metadata: {
            isCheck: !!entry.isCheck,
            isCapture: !!entry.capturedPiece,
            algebraic: entry.notation,
          },
        };

        moves.push(move);
        currentPos = makeMove(currentPos, move);
      }

      const engine = new TimurEngine();

      const rep = await analyzeFullGame(
        engine,
        initialPos,
        moves,
        {
          depth: 3,
          whiteName,
          blackName,
        },
        (completed, total) => {
          if (isMounted) {
            setProgress(Math.round((completed / Math.max(1, total)) * 100));
          }
        },
      );

      if (isMounted) {
        setReport(rep);
        setProgress(100);
        if (rep.moves.length > 0) {
          setCurrentPly(rep.moves[0].ply);
        }
      }
    }

    void runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [historyEntries, whiteName, blackName]);

  const title =
    winner === 'draw' || winner === null
      ? 'Berabere — Oyun Analizi'
      : winner === 'white'
        ? `${whiteName} Kazandı`
        : `${blackName} Kazandı`;

  return (
    <div className="mobile-screen flex flex-col bg-[#153423] text-white select-none">
      {/* ── Top App Bar ── */}
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#12281c] shadow-md sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            aria-label="Geri Dön"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div>
            <h1 className="font-batangas text-base font-extrabold truncate leading-tight">
              Oyun Analizi
            </h1>
            <p className="text-[10px] text-[#00e5cc] font-bold truncate leading-tight">
              {title}
            </p>
          </div>
        </div>

        {/* Action icons & Stage Switcher */}
        <div className="flex items-center gap-1.5">
          {report && (
            <div className="bg-black/30 p-1 rounded-xl flex items-center gap-1 border border-white/10">
              <button
                onClick={() => setActiveStage('summary')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeStage === 'summary'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Özet
              </button>
              <button
                onClick={() => setActiveStage('interactive')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeStage === 'interactive'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                İnceleme
              </button>
            </div>
          )}

          {/* Flip Board */}
          <button
            onClick={() => setFlipped((f) => !f)}
            aria-label="Tahtayı Çevir"
            title="Tahtayı Çevir"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <ArrowCounterClockwise size={18} weight="bold" />
          </button>

          {/* Open Sandbox Self Analysis */}
          <button
            onClick={onOpenSelfAnalysis}
            aria-label="Serbest Analiz"
            title="Serbest Analiz Sandbox'ını Aç"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-emerald-300 transition-all cursor-pointer"
          >
            <MagnifyingGlassPlus size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="flex-1 w-full max-w-lg mx-auto px-3 py-2 flex flex-col overflow-y-auto custom-scrollbar">
        {/* Loading Progress State */}
        {!report && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin flex items-center justify-center shadow-lg" />
            <div>
              <h2 className="font-batangas text-xl font-bold text-emerald-200">
                Oyun Analiz Ediliyor
              </h2>
              <p className="text-xs text-white/50 mt-1">
                Motor her hamleyi inceliyor ve en iyi devam yollarını hesaplıyor...
              </p>
            </div>
            {/* Progress Bar */}
            <div className="w-64 h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-white/60">%{progress}</span>
          </div>
        )}

        {/* Stage 1: Summary Overview */}
        {report && activeStage === 'summary' && (
          <ReviewSummaryStage
            report={report}
            onStartReview={() => setActiveStage('interactive')}
            onSelectPly={(ply) => {
              setCurrentPly(ply);
              setActiveStage('interactive');
            }}
          />
        )}

        {/* Stage 2: Move-by-Move Interactive Review */}
        {report && activeStage === 'interactive' && (
          <ReviewInteractiveStage
            moves={report.moves}
            currentPly={currentPly}
            flipped={flipped}
            onSelectPly={(ply) => setCurrentPly(ply)}
            onOpenSelfAnalysis={onOpenSelfAnalysis}
          />
        )}
      </div>
    </div>
  );
};

export default GameReviewView;
