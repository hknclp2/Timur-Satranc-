/**
 * Lightweight local analysis engine for Timur Satrancı.
 *
 * No external Stockfish dependency: evaluation is derived from material
 * advantage snapshots stored in each MoveHistoryEntry (capturedPiecesState)
 * plus small check/checkmate bonuses. Good enough for the Game Review
 * eval graph, move classification badges and accuracy scores, and for the
 * live eval bar in Self Analysis sandbox.
 */

import { MoveHistoryEntry } from '../hooks/useGame';
import { PlayerColor } from '../types/chess';
import { defaultMaterialCalculator } from '../core/material/MaterialCalculator';

export type MoveClassification =
  | 'brilliant' // Mükemmel
  | 'best' // En İyi
  | 'good' // İyi
  | 'inaccuracy' // Hata (küçük)
  | 'mistake' // Hata
  | 'blunder'; // Büyük Hata

export const CLASSIFICATION_TR: Record<MoveClassification, string> = {
  brilliant: 'Mükemmel',
  best: 'En İyi',
  good: 'İyi',
  inaccuracy: 'Hata',
  mistake: 'Hata',
  blunder: 'Büyük Hata',
};

export const CLASSIFICATION_STYLE: Record<MoveClassification, string> = {
  brilliant: 'bg-cyan-400 text-[#0b2027]',
  best: 'bg-emerald-500 text-white',
  good: 'bg-emerald-900 text-emerald-200 border border-emerald-500/40',
  inaccuracy: 'bg-amber-400 text-[#1a1a1a]',
  mistake: 'bg-orange-500 text-white',
  blunder: 'bg-red-500 text-white',
};

export interface AnalyzedMove {
  index: number;
  notation: string;
  player: PlayerColor;
  /** Evaluation AFTER the move, white perspective, pawn units. */
  evalAfter: number;
  /** Evaluation BEFORE the move (0 for move 1). */
  evalBefore: number;
  /** Eval swing from the mover's perspective (positive = good for mover). */
  swingForMover: number;
  classification: MoveClassification;
  isCheck: boolean;
  isCheckmate: boolean;
  /** Human-readable engine suggestion stub for non-best moves. */
  suggestion?: string;
}

/** White-perspective material eval for a captured-pieces snapshot. */
export function evaluateCapturedSnapshot(captured: {
  white: { type: string }[];
  black: { type: string }[];
}): number {
  // Reuse canonical piece values via the material calculator.
  const res = defaultMaterialCalculator.calculateAdvantage(captured as never);
  return res.whiteAdvantage;
}

function bonusForEntry(entry: MoveHistoryEntry): number {
  let b = 0;
  if (entry.isCheckmate) b += entry.player === 'white' ? 8 : -8;
  else if (entry.isCheck) b += entry.player === 'white' ? 0.4 : -0.4;
  if (entry.promotion) b += entry.player === 'white' ? 1.5 : -1.5;
  if (entry.capturedPiece) {
    const v = defaultMaterialCalculator.getPieceValue(entry.capturedPiece.type);
    b += entry.player === 'white' ? v * 0.15 : -v * 0.15;
  }
  return b;
}

export function classifySwing(swingForMover: number, isCheckmate: boolean): MoveClassification {
  if (isCheckmate) return 'brilliant';
  if (swingForMover >= 0.1) return 'best';
  if (swingForMover >= -0.3) return 'good';
  if (swingForMover >= -0.9) return 'inaccuracy';
  if (swingForMover >= -2.0) return 'mistake';
  return 'blunder';
}

function suggestionFor(m: AnalyzedMove): string | undefined {
  if (m.classification === 'best' || m.classification === 'brilliant') return undefined;
  const side = m.player === 'white' ? 'Beyaz' : 'Siyah';
  return `${side} için motor önerisi: taşları korumaya öncelik veren daha sakin bir devam yolu vardı (${m.notation} yerine gelişim hamlesi).`;
}

function accuracyFromLosses(losses: number[]): number {
  if (losses.length === 0) return 100;
  const avg = losses.reduce((a, b) => a + b, 0) / losses.length;
  // Scale: ~0.15 pawn avg loss => ~95, ~1.0 => ~75, ~2.5+ => ~50.
  const acc = 100 - avg * 22 - Math.max(0, avg - 1) * 8;
  return Math.max(20, Math.min(100, Math.round(acc)));
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  /** Eval curve including starting point (length = moves + 1). */
  evalCurve: number[];
  whiteAccuracy: number;
  blackAccuracy: number;
  counts: Record<MoveClassification, number>;
}

export function analyzeGame(entries: MoveHistoryEntry[]): GameAnalysis {
  const moves: AnalyzedMove[] = [];
  const evalCurve: number[] = [0];
  const counts: Record<MoveClassification, number> = {
    brilliant: 0,
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  const whiteLosses: number[] = [];
  const blackLosses: number[] = [];

  let prevEval = 0;
  entries.forEach((entry, i) => {
    const material = evaluateCapturedSnapshot(entry.capturedPiecesState);
    const evalAfter = material + bonusForEntry(entry);
    // swing from mover's perspective: white wants +, black wants -
    const swingForMover =
      entry.player === 'white' ? evalAfter - prevEval : prevEval - evalAfter;
    const classification = classifySwing(swingForMover, !!entry.isCheckmate);
    counts[classification] += 1;
    const loss = Math.max(0, -swingForMover);
    if (entry.player === 'white') whiteLosses.push(loss);
    else blackLosses.push(loss);

    const m: AnalyzedMove = {
      index: i,
      notation: entry.notation,
      player: entry.player,
      evalAfter,
      evalBefore: prevEval,
      swingForMover,
      classification,
      isCheck: !!entry.isCheck,
      isCheckmate: !!entry.isCheckmate,
    };
    m.suggestion = suggestionFor(m);
    moves.push(m);
    evalCurve.push(evalAfter);
    prevEval = evalAfter;
  });

  return {
    moves,
    evalCurve,
    whiteAccuracy: accuracyFromLosses(whiteLosses),
    blackAccuracy: accuracyFromLosses(blackLosses),
    counts,
  };
}

/** Live eval bar helper: converts pawn eval to white-share percentage. */
export function evalToWhiteShare(pawnEval: number): number {
  const clamped = Math.max(-6, Math.min(6, pawnEval));
  return Math.round((1 / (1 + Math.pow(10, -clamped / 4))) * 100);
}

export function formatEval(pawnEval: number): string {
  const sign = pawnEval > 0 ? '+' : '';
  return `${sign}${pawnEval.toFixed(1)}`;
}
