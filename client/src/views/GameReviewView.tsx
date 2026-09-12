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
import { analyzeFullGame } from '../analyzer/gameAnalyzer';
import {
  REVIEW_ANALYSIS_DEPTH,
  createReviewEnginePool,
  getReviewEnginePoolSize,
  isReviewCancelledError,
} from '../hooks/useReviewAnalysis';
import { FullGameReviewReport } from '../analyzer/types';
import { createInitialGameState } from '../core/engine/boardSetup';
import { legacyGameStateToPosition, squareToLegacy } from '../worker/legacyAdapter';
import { makeMove } from '../core/rules/makeMove';
import { Move } from '../core/move/Move';
import { ReviewSummaryStage } from '../components/review/ReviewSummaryStage';
import { ReviewInteractiveStage } from '../components/review/ReviewInteractiveStage';
import { ReviewLoadingStage } from '../components/review/ReviewLoadingStage';

export interface GameReviewViewProps {
  historyEntries: MoveHistoryEntry[];
  whiteName: string;
  blackName: string;
  winner: PlayerColor | 'draw' | null;
  statusText: string;
  onBack: () => void;
  onOpenSelfAnalysis: () => void;
  onRematch?: () => void;
  /** Özel dizilimle başlayan maçın başlangıç konumu (verilmezse klasik dizilim). */
  initialPosition?: import('../core/position/Position').Position;
  /** İnceleyen taraf — tahta bu renge dönük açılır (taşlar izleyiciye dönük). */
  perspective?: PlayerColor;
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
  initialPosition,
  perspective = 'white',
}) => {
  const [activeStage, setActiveStage] = useState<'summary' | 'interactive'>('summary');
  const [report, setReport] = useState<FullGameReviewReport | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentPly, setCurrentPly] = useState<number>(1);
  const [flipped, setFlipped] = useState(perspective === 'black');
  const [reportError, setReportError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Background Game Analysis (paralel worker havuzu — sonuçlar seriyle özdeş)
  useEffect(() => {
    let isMounted = true;
    const poolSize = getReviewEnginePoolSize();
    const engine = createReviewEnginePool(poolSize);

    async function runAnalysis() {
      // Create initial board position (özel dizilim prop'la gelir; verilmezse klasik)
      const initialPos = initialPosition ?? legacyGameStateToPosition(createInitialGameState());

      // Reconstruct Core Move array from historyEntries
      const moves: Move[] = [];
      let currentPos = initialPos;

      // legacy PieceType -> PieceKind (legacyAdapter.LEGACY_TO_KIND ile aynı eşleme;
      // yeni import eklememek için blok-içi tablo: queen→General, general→Ferz,
      // bishop→Alfil, warMachine→Dabbaba, prince→Prince, diğerleri birebir)
      const LEGACY_TO_KIND: Record<string, NonNullable<Move['promotion']>> = {
        king: 'king' as unknown as NonNullable<Move['promotion']>,
        queen: 'general' as unknown as NonNullable<Move['promotion']>,
        general: 'ferz' as unknown as NonNullable<Move['promotion']>,
        rook: 'rook' as unknown as NonNullable<Move['promotion']>,
        knight: 'knight' as unknown as NonNullable<Move['promotion']>,
        bishop: 'alfil' as unknown as NonNullable<Move['promotion']>,
        camel: 'camel' as unknown as NonNullable<Move['promotion']>,
        warMachine: 'dabbaba' as unknown as NonNullable<Move['promotion']>,
        giraffe: 'giraffe' as unknown as NonNullable<Move['promotion']>,
        picket: 'picket' as unknown as NonNullable<Move['promotion']>,
        pawn: 'pawn' as unknown as NonNullable<Move['promotion']>,
        prince: 'prince' as unknown as NonNullable<Move['promotion']>,
      };

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

        // Bayrak taşıma: KingSwap bayraksız uygulanırsa dost taşı yer,
        // terfi bayraksız/çevrimsiz uygulanırsa yanlış taşa çözülür
        // (resolveForApply). History entry'deki legacy alanlardan kur.
        const specialFlags: Move['specialFlags'] = [];
        if (entry.isKingSwap) {
          specialFlags.push('king_swap' as unknown as Move['specialFlags'][number]);
        }
        if (entry.isRelocation) {
          specialFlags.push('relocation' as unknown as Move['specialFlags'][number]);
        }
        const promotionKind = entry.promotion ? LEGACY_TO_KIND[entry.promotion] : undefined;
        if (promotionKind) {
          specialFlags.push('promotion' as unknown as Move['specialFlags'][number]);
        }

        const move: Move = {
          from: fromSq,
          to: toSq,
          piece,
          capturedPiece: currentPos.board[toSq],
          promotion: promotionKind,
          specialFlags,
          metadata: {
            isCheck: !!entry.isCheck,
            isCapture: !!entry.capturedPiece,
            algebraic: entry.notation,
          },
        };

        moves.push(move);
        currentPos = makeMove(currentPos, move);
      }

      if (isMounted) {
        setReportError(null);
      }

      try {
        const rep = await analyzeFullGame(
          engine,
          initialPos,
          moves,
          {
            depth: REVIEW_ANALYSIS_DEPTH,
            whiteName,
            blackName,
            concurrency: poolSize,
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
      } catch (err) {
        if (!isMounted) return;
        if (isReviewCancelledError(err)) return;
        setReportError(err instanceof Error ? err.message : 'Analiz sırasında bir hata oluştu.');
      }
    }

    void runAnalysis();

    return () => {
      isMounted = false;
      engine.cancelPending();
      engine.dispose?.();
    };
  }, [historyEntries, whiteName, blackName, initialPosition, retryNonce]);

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
      <div className={`flex-1 w-full mx-auto px-3 py-2 flex flex-col overflow-y-auto custom-scrollbar ${report ? 'max-w-lg lg:max-w-5xl' : 'max-w-xl lg:max-w-5xl'}`}>
        {/* Loading Progress State — büyük canlı tahta + kademeli hamleler */}
        {!report && (
          <ReviewLoadingStage
            historyEntries={historyEntries}
            progress={progress}
            flipped={flipped}
            initialPosition={initialPosition}
            reportError={reportError}
            onRetry={() => {
              setReportError(null);
              setProgress(0);
              setRetryNonce((n) => n + 1);
            }}
          />
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
