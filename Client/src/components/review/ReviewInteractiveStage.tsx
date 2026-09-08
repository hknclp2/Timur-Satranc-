import React, { FC, useMemo, useState } from 'react';
import { CoachBubble } from './CoachBubble';
import { BoardArrowOverlay } from './BoardArrowOverlay';
import { MoveRibbon } from './MoveRibbon';
import { BoardContainer } from '../game/BoardContainer';
import { ReviewedMove } from '../../analyzer/types';
import { positionToLegacyBoardAndCitadels, squareToLegacy } from '../../worker/legacyAdapter';
import { BoardPosition } from '../../types/chess';
import { makeMove } from '../../core/rules/makeMove';
import { Eye, Star, ArrowCounterClockwise, ArrowRight, Check, X, MagnifyingGlassPlus } from '@phosphor-icons/react';

interface ReviewInteractiveStageProps {
  moves: ReviewedMove[];
  currentPly: number;
  flipped: boolean;
  onSelectPly: (ply: number) => void;
  onOpenSelfAnalysis?: () => void;
}

export const ReviewInteractiveStage: FC<ReviewInteractiveStageProps> = ({
  moves,
  currentPly,
  flipped,
  onSelectPly,
  onOpenSelfAnalysis,
}) => {
  const [showBestArrow, setShowBestArrow] = useState(true);
  const [showBestBoard, setShowBestBoard] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retryStatus, setRetryStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedPos, setSelectedPos] = useState<BoardPosition | null>(null);

  // Active move (ply 1-based => index ply - 1)
  const activeIdx = Math.max(0, Math.min(moves.length - 1, currentPly - 1));
  const activeMove = moves[activeIdx];

  // Best move position reconstruction
  const bestPosition = useMemo(() => {
    if (!activeMove) return null;
    const piece = activeMove.positionBefore.board[activeMove.bestFrom];
    if (!piece) return null;
    return makeMove(activeMove.positionBefore, {
      from: activeMove.bestFrom,
      to: activeMove.bestTo,
      piece,
      capturedPiece: activeMove.positionBefore.board[activeMove.bestTo],
      specialFlags: [],
      metadata: { isCheck: false, isCapture: false, algebraic: activeMove.bestMoveNotation },
    });
  }, [activeMove]);

  // Position to display on board
  const displayedEnginePosition = useMemo(() => {
    if (!activeMove) return null;
    if (isRetryMode) {
      return activeMove.positionBefore;
    }
    if (showBestBoard && bestPosition) {
      return bestPosition;
    }
    return activeMove.positionAfter;
  }, [activeMove, isRetryMode, showBestBoard, bestPosition]);

  const { board, citadels } = useMemo(() => {
    if (!displayedEnginePosition) {
      return {
        board: Array.from({ length: 10 }, () => Array(11).fill(null)),
        citadels: { blackCitadelPiece: null, whiteCitadelPiece: null },
      };
    }
    return positionToLegacyBoardAndCitadels(displayedEnginePosition);
  }, [displayedEnginePosition]);

  // Highlighted last move squares
  const lastMoveHighlight = useMemo(() => {
    if (!activeMove || isRetryMode) return null;
    if (showBestBoard) {
      return {
        from: squareToLegacy(activeMove.bestFrom),
        to: squareToLegacy(activeMove.bestTo),
      };
    }
    return {
      from: squareToLegacy(activeMove.from),
      to: squareToLegacy(activeMove.to),
    };
  }, [activeMove, isRetryMode, showBestBoard]);

  // Handle Retry mode move attempts
  const handleSquareClick = (pos: BoardPosition) => {
    if (!isRetryMode || !activeMove) return;

    if (!selectedPos) {
      // Select source piece
      const sq = pos.isCitadel ? (pos.citadelSide === 'left' ? 110 : 111) : pos.y * 11 + pos.x;
      const piece = activeMove.positionBefore.board[sq];
      if (piece && piece.side === activeMove.playedBy) {
        setSelectedPos(pos);
      }
      return;
    }

    // Attempt move
    const fromSq = selectedPos.isCitadel
      ? selectedPos.citadelSide === 'left'
        ? 110
        : 111
      : selectedPos.y * 11 + selectedPos.x;
    const toSq = pos.isCitadel
      ? pos.citadelSide === 'left'
        ? 110
        : 111
      : pos.y * 11 + pos.x;

    setSelectedPos(null);

    if (fromSq === activeMove.bestFrom && toSq === activeMove.bestTo) {
      setRetryStatus('success');
      setShowBestBoard(true);
    } else {
      setRetryStatus('fail');
    }
  };

  const handleNext = () => {
    if (activeIdx < moves.length - 1) {
      onSelectPly(moves[activeIdx + 1].ply);
      setIsRetryMode(false);
      setShowBestBoard(false);
      setRetryStatus('idle');
      setSelectedPos(null);
    }
  };

  const handlePrev = () => {
    if (activeIdx > 0) {
      onSelectPly(moves[activeIdx - 1].ply);
      setIsRetryMode(false);
      setShowBestBoard(false);
      setRetryStatus('idle');
      setSelectedPos(null);
    }
  };

  const handleToggleRetry = () => {
    setIsRetryMode((prev) => !prev);
    setShowBestBoard(false);
    setRetryStatus('idle');
    setSelectedPos(null);
  };

  // Coach comment in interactive stage
  const currentCoachComment = useMemo(() => {
    if (isRetryMode) {
      if (retryStatus === 'success') {
        return `Harika buldun! 🎉 En iyi hamle tam olarak ${activeMove.bestMoveNotation} idi.`;
      }
      if (retryStatus === 'fail') {
        return `Bu en iyi hamle değil. Tekrar dene veya motorun önerisini görmek için 'En İyi'ye bas.`;
      }
      return `Şimdi sıra sende! Tahtada ${activeMove.playedBy === 'white' ? 'Beyaz' : 'Siyah'} için en iyi hamleyi bulmaya çalış.`;
    }
    if (showBestBoard) {
      return `İşte motorun önerdiği en iyi hamle (${activeMove.bestMoveNotation}) sonrası tahtanın durumu.`;
    }
    return activeMove.coachComment;
  }, [isRetryMode, retryStatus, showBestBoard, activeMove]);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full gap-2 animate-fade-in select-none">
      {/* 1. Coach Bubble */}
      <CoachBubble
        classification={isRetryMode ? null : activeMove.classification}
        evalCp={isRetryMode ? activeMove.evalBeforeCp : activeMove.evalAfterCp}
        coachComment={currentCoachComment}
        tacticalNote={!isRetryMode && !showBestBoard ? activeMove.tacticalNote : undefined}
        bestMoveReason={!isRetryMode && !showBestBoard ? activeMove.bestMoveReason : undefined}
      />

      {/* 2. Interactive Board with SVG Arrow & Badge Overlay */}
      <div className="relative w-full flex-1 flex items-center justify-center min-h-[300px] overflow-visible">
        <div className="relative w-full">
          <BoardContainer
            board={board}
            citadels={citadels}
            selectedPos={selectedPos}
            validMoves={[]}
            lastMove={lastMoveHighlight}
            turn={activeMove.playedBy}
            flipped={flipped}
            onSquareClick={handleSquareClick}
          />

          {/* SVG Arrow Overlay */}
          {!isRetryMode && (
            <BoardArrowOverlay
              fromIndex={activeMove.from}
              toIndex={activeMove.to}
              bestFromIndex={activeMove.bestFrom}
              bestToIndex={activeMove.bestTo}
              classification={activeMove.classification}
              showBestArrow={showBestArrow && !showBestBoard}
              flipped={flipped}
            />
          )}
        </div>
      </div>

      {/* 3. Bottom Controls */}
      <div className="flex flex-col gap-2 w-full">
        {/* Horizontal Move Ribbon */}
        <MoveRibbon
          moves={moves}
          currentPly={activeMove.ply}
          onSelectPly={(ply) => {
            onSelectPly(ply);
            setIsRetryMode(false);
            setShowBestBoard(false);
            setRetryStatus('idle');
            setSelectedPos(null);
          }}
          canPrev={activeIdx > 0}
          canNext={activeIdx < moves.length - 1}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        {/* Action Buttons Bar */}
        <div className="grid grid-cols-4 gap-2">
          {/* Show / Hide Arrow */}
          <button
            onClick={() => setShowBestArrow((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border transition-all cursor-pointer ${
              showBestArrow
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/5 border-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            <Eye size={18} weight={showBestArrow ? 'fill' : 'regular'} />
            <span className="text-[10px] font-bold">Göster</span>
          </button>

          {/* Best Move Preview */}
          <button
            onClick={() => {
              setShowBestBoard((prev) => !prev);
              setIsRetryMode(false);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border transition-all cursor-pointer ${
              showBestBoard
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <Star size={18} weight={showBestBoard ? 'fill' : 'regular'} />
            <span className="text-[10px] font-bold">En İyi</span>
          </button>

          {/* Retry Mode */}
          <button
            onClick={handleToggleRetry}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border transition-all cursor-pointer ${
              isRetryMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <ArrowCounterClockwise size={18} weight="bold" />
            <span className="text-[10px] font-bold">{isRetryMode ? 'İptal' : 'Dene'}</span>
          </button>

          {/* Next Key / Next Move Button */}
          <button
            onClick={handleNext}
            disabled={activeIdx >= moves.length - 1}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-[#81b64c] hover:bg-[#92c959] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer shadow-md"
          >
            <ArrowRight size={18} weight="bold" />
            <span className="text-[10px] font-extrabold">Sonraki</span>
          </button>
        </div>
      </div>
    </div>
  );
};
