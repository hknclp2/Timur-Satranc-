/**
 * Analyzer — tek hamle analizi (docs/mimari.md §3.6 pipeline + Chess.com stili 9 kademeli sınıflandırma).
 */

import type { Move } from '../core/move/Move';
import type { Position, Side } from '../core/position/Position';
import { makeMove } from '../core/rules/makeMove';
import { getGameResult } from '../core/rules/gameResult';
import { MATE_SCORE, STALEMATE_WIN_SCORE } from '../engine/search';
import { evaluate } from '../engine/evaluate';
import { MoveClassificationType } from './types';

export type MoveClass = 'Excellent' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

/** Hamle sınıflandırma eşikleri, cp (§7.7 v1 — verbatim). */
export const CLASS_THRESHOLDS = {
  excellentMax: 20,
  goodMax: 60,
  inaccuracyMax: 150,
  mistakeMax: 300,
  bestMax: 15,
} as const;

export function classifyLoss(lossCp: number): MoveClass {
  if (lossCp <= CLASS_THRESHOLDS.excellentMax) return 'Excellent';
  if (lossCp <= CLASS_THRESHOLDS.goodMax) return 'Good';
  if (lossCp <= CLASS_THRESHOLDS.inaccuracyMax) return 'Inaccuracy';
  if (lossCp <= CLASS_THRESHOLDS.mistakeMax) return 'Mistake';
  return 'Blunder';
}

export interface ClassifyParams {
  lossCp: number;
  ply: number;
  isCheckmate?: boolean;
  opponentBlunderedBefore?: boolean;
}

export function classifyLossDetailed(params: ClassifyParams): MoveClassificationType {
  const { lossCp, ply, isCheckmate, opponentBlunderedBefore } = params;

  if (isCheckmate) return 'brilliant';

  // Açılışın ilk 4 yarım hamlesi
  if (ply <= 4 && lossCp <= 45) return 'book';

  if (lossCp <= 5) return 'best';
  if (lossCp <= CLASS_THRESHOLDS.bestMax) return 'great';
  if (lossCp <= CLASS_THRESHOLDS.goodMax) return 'good';
  if (lossCp <= CLASS_THRESHOLDS.inaccuracyMax) return 'inaccuracy';

  // 'miss', 'mistake' aralığını (181-300) gölgelememeli: önce kontrol edilir.
  if (opponentBlunderedBefore && lossCp > 180) {
    return 'miss';
  }
  if (lossCp <= CLASS_THRESHOLDS.mistakeMax) return 'mistake';

  return 'blunder';
}

export interface AnalyzedMove {
  move: Move;
  playedBy: Side;
  bestEvalCp: number;
  playedEvalCp: number;
  lossCp: number;
  classification: MoveClass;
}

export interface AnalyzedMoveDetailed {
  move: Move;
  playedBy: Side;
  bestEvalCp: number;
  playedEvalCp: number;
  lossCp: number;
  classification: MoveClassificationType;
}

export type StaticEvaluator = (pos: Position) => number;

export interface MoveAnalysisInput {
  before: Position;
  move: Move;
  bestEvalCp: number;
  evalFn?: StaticEvaluator;
}

export interface MoveAnalysisInputDetailed {
  before: Position;
  move: Move;
  bestEvalCp: number;
  ply: number;
  evalFn?: StaticEvaluator;
  opponentBlunderedBefore?: boolean;
}

function terminalScoreForMover(
  result: NonNullable<ReturnType<typeof getGameResult>>,
  mover: Side,
): number {
  switch (result.type) {
    case 'checkmate':
      return result.winner === mover ? MATE_SCORE : -MATE_SCORE;
    case 'stalemate_win':
      return result.winner === mover ? STALEMATE_WIN_SCORE : -STALEMATE_WIN_SCORE;
    case 'draw':
      return 0;
    default:
      return 0;
  }
}

export function analyzeMove(input: MoveAnalysisInput): AnalyzedMove {
  const mover = input.before.sideToMove;
  const evalFn = input.evalFn ?? evaluate;
  const after = makeMove(input.before, input.move);
  const terminal = getGameResult(after);
  const playedEvalCp =
    terminal !== null ? terminalScoreForMover(terminal, mover) : -evalFn(after);

  const lossCp = Math.max(0, Math.round(input.bestEvalCp - playedEvalCp));
  return {
    move: input.move,
    playedBy: mover,
    bestEvalCp: Math.round(input.bestEvalCp),
    playedEvalCp: Math.round(playedEvalCp),
    lossCp,
    classification: classifyLoss(lossCp),
  };
}

export function analyzeMoveDetailed(input: MoveAnalysisInputDetailed): AnalyzedMoveDetailed {
  const mover = input.before.sideToMove;
  const evalFn = input.evalFn ?? evaluate;
  const after = makeMove(input.before, input.move);
  const terminal = getGameResult(after);
  const playedEvalCp =
    terminal !== null ? terminalScoreForMover(terminal, mover) : -evalFn(after);

  const lossCp = Math.max(0, Math.round(input.bestEvalCp - playedEvalCp));

  const isCheckmate = terminal?.type === 'checkmate' && terminal.winner === mover;
  const classification = classifyLossDetailed({
    lossCp,
    ply: input.ply,
    isCheckmate,
    opponentBlunderedBefore: input.opponentBlunderedBefore,
  });

  return {
    move: input.move,
    playedBy: mover,
    bestEvalCp: Math.round(input.bestEvalCp),
    playedEvalCp: Math.round(playedEvalCp),
    lossCp,
    classification,
  };
}
