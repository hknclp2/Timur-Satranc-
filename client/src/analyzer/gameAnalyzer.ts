/**
 * Analyzer — tam oyun sonu analizi (docs/mimari.md §3.6 pipeline + Chess.com stili Game Review).
 */

import type { Move } from '../core/move/Move';
import type { Position, Side } from '../core/position/Position';
import { makeMove } from '../core/rules/makeMove';
import type { EngineInterface } from '../engine/EngineInterface';
import type { BestMoveResult } from '../engine/EngineInterface';
import { analyzeMove, analyzeMoveDetailed, MoveClass, StaticEvaluator } from './moveAnalyzer';
import { explainMove, generateCoachExplanation, generateCoachIntroSummary } from './explain';
import {
  FullGameReviewReport,
  MoveClassificationType,
  ReviewedMove,
  ReviewPerformanceArea,
} from './types';

export interface ClassCounts {
  Excellent: number;
  Good: number;
  Inaccuracy: number;
  Mistake: number;
  Blunder: number;
}

export interface ReportLine {
  ply: number;
  playedBy: Side;
  algebraic: string;
  lossCp: number;
  classification: MoveClass;
  explanation: string | null;
}

export interface GameReport {
  totalPlies: number;
  lines: ReportLine[];
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  counts: ClassCounts;
  goodMoves: number;
  mistakes: number;
  blunders: number;
  criticalMove: { ply: number; lossCp: number; classification: MoveClass } | null;
  engineCalls: number;
}

export interface CachedEval {
  bestEvalCp: number;
}

export interface LegacyGameAnalyzerOptions {
  depth?: number;
  evalFn?: StaticEvaluator;
  cache?: Map<string, CachedEval>;
}

export interface GameAnalyzerOptions {
  depth?: number;
  whiteName?: string;
  blackName?: string;
  /**
   * Eşzamanlı motor araması sayısı (paralel worker havuzuyla kullanılır).
   * Varsayılan 1 = eski seri davranış. Arama deterministik olduğu için
   * değer rapor içeriğini değiştirmez, sadece duvar-saatini kısaltır.
   */
  concurrency?: number;
}

export async function analyzeGame(
  engine: Pick<EngineInterface, 'findBestMove'>,
  initial: Position,
  moves: Move[],
  opts: LegacyGameAnalyzerOptions = {},
): Promise<GameReport> {
  const depth = opts.depth ?? 3;
  const cache = opts.cache ?? new Map<string, CachedEval>();
  const lines: ReportLine[] = [];
  const counts: ClassCounts = { Excellent: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 };
  const whiteLosses: number[] = [];
  const blackLosses: number[] = [];
  let criticalMove: GameReport['criticalMove'] = null;
  let engineCalls = 0;

  let before = initial;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const key = before.zobristHash.toString();
    let cached = cache.get(key);
    if (!cached) {
      const best = await engine.findBestMove(before, { depth });
      cached = { bestEvalCp: best.evaluationCp };
      cache.set(key, cached);
      engineCalls++;
    }
    const analyzed = analyzeMove({
      before,
      move,
      bestEvalCp: cached.bestEvalCp,
      evalFn: opts.evalFn,
    });
    counts[analyzed.classification]++;
    (analyzed.playedBy === 'white' ? whiteLosses : blackLosses).push(analyzed.lossCp);
    if (!criticalMove || analyzed.lossCp > criticalMove.lossCp) {
      criticalMove = { ply: i + 1, lossCp: analyzed.lossCp, classification: analyzed.classification };
    }
    const notes =
      analyzed.classification === 'Mistake' || analyzed.classification === 'Blunder'
        ? explainMove(before, move)
        : [];
    lines.push({
      ply: i + 1,
      playedBy: analyzed.playedBy,
      algebraic: move.metadata.algebraic,
      lossCp: analyzed.lossCp,
      classification: analyzed.classification,
      explanation: notes.length > 0 ? notes[0] : null,
    });
    before = makeMove(before, move);
  }

  function avg(xs: number[]): number | null {
    if (xs.length === 0) return null;
    return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  }

  return {
    totalPlies: moves.length,
    lines,
    whiteAccuracy: avg(whiteLosses.map(moveAccuracy)),
    blackAccuracy: avg(blackLosses.map(moveAccuracy)),
    counts,
    goodMoves: counts.Excellent + counts.Good,
    mistakes: counts.Inaccuracy + counts.Mistake,
    blunders: counts.Blunder,
    criticalMove,
    engineCalls,
  };
}


const ACCURACY_DECAY = 280;

function moveAccuracy(lossCp: number): number {
  return 100 * Math.exp(-lossCp / ACCURACY_DECAY);
}

function computeAverageAccuracy(losses: number[]): number {
  if (losses.length === 0) return 100;
  const accs = losses.map(moveAccuracy);
  const avg = accs.reduce((a, b) => a + b, 0) / accs.length;
  return Math.max(15, Math.min(99, Math.round(avg * 10) / 10));
}

function estimateRating(accuracy: number): number {
  // 30% => ~700, 50% => ~1000, 75% => ~1400, 90% => ~1850, 98% => ~2200
  const base = 400 + accuracy * 18;
  return Math.round(base / 25) * 25;
}

function evaluateArea(
  moves: ReviewedMove[],
  filterFn: (m: ReviewedMove) => boolean,
  areaNameTR: string,
): ReviewPerformanceArea {
  const matching = moves.filter(filterFn);
  if (matching.length === 0) {
    return {
      ratingLevel: 'good',
      score: 80,
      noteTR: `${areaNameTR} hamleleri dengeli geçti.`,
    };
  }

  const losses = matching.map((m) => m.lossCp);
  const score = Math.round(losses.map(moveAccuracy).reduce((a, b) => a + b, 0) / matching.length);

  let ratingLevel: ReviewPerformanceArea['ratingLevel'] = 'good';
  let noteTR = '';

  if (score >= 85) {
    ratingLevel = 'excellent';
    noteTR = `Bu alanda neredeyse hatasız oynadın (%${score}).`;
  } else if (score >= 70) {
    ratingLevel = 'good';
    noteTR = `Genel olarak sağlam kararlar verdin (%${score}).`;
  } else if (score >= 50) {
    ratingLevel = 'average';
    noteTR = `Bazı kritik devam yollarını kaçırdın (%${score}).`;
  } else {
    ratingLevel = 'inaccurate';
    noteTR = `Geliştirilmesi gereken zayıf noktalar içeriyor (%${score}).`;
  }

  return { ratingLevel, score, noteTR };
}

export async function analyzeFullGame(
  engine: Pick<EngineInterface, 'findBestMove'>,
  initial: Position,
  moves: Move[],
  opts: GameAnalyzerOptions = {},
  onProgress?: (completed: number, total: number) => void,
): Promise<FullGameReviewReport> {
  const depth = opts.depth ?? 3;
  const whiteName = opts.whiteName ?? 'Beyaz';
  const blackName = opts.blackName ?? 'Siyah';

  const reviewedMoves: ReviewedMove[] = [];
  const evalCurve: number[] = [0];
  const evalCurveNodes: FullGameReviewReport['evalCurveNodes'] = [
    { ply: 0, evalCp: 0, classification: 'book', isKeyMoment: false },
  ];

  const counts = {
    white: {
      brilliant: 0,
      great: 0,
      best: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      miss: 0,
      blunder: 0,
    } as Record<MoveClassificationType, number>,
    black: {
      brilliant: 0,
      great: 0,
      best: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      miss: 0,
      blunder: 0,
    } as Record<MoveClassificationType, number>,
  };

  const whiteLosses: number[] = [];
  const blackLosses: number[] = [];
  const criticalPlies: number[] = [];

  let currentPos = initial;
  let opponentBlunderedBefore = false;

  // Faz 1: tüm ply konumlarını önden tekrarla (saf, hızlı).
  // Her ply'nin araması yalnızca kendi konumuna bağlıdır — birbirinden bağımsızdır.
  const positions: Position[] = new Array(moves.length);
  {
    let pos = initial;
    for (let i = 0; i < moves.length; i++) {
      positions[i] = pos;
      pos = makeMove(pos, moves[i]);
    }
  }

  // Faz 2: eşzamanlı motor aramaları (sonuçlar ply indeksine yazılır, sıra korunur).
  const workerCount =
    moves.length === 0
      ? 0
      : Math.max(1, Math.min(Math.floor(opts.concurrency ?? 1), moves.length));
  const bestResults: BestMoveResult[] = new Array(moves.length);
  {
    let next = 0;
    let completed = 0;
    const runner = async (): Promise<void> => {
      while (true) {
        const i = next;
        next += 1;
        if (i >= moves.length) return;
        bestResults[i] = await engine.findBestMove(positions[i], { depth });
        completed += 1;
        onProgress?.(completed, moves.length);
      }
    };
    const runners: Promise<void>[] = [];
    for (let k = 0; k < workerCount; k++) runners.push(runner());
    await Promise.all(runners);
  }

  // Faz 3: seri montaj (sınıflandırma + zincirleme durum sırayla hesaplanır).
  for (let i = 0; i < moves.length; i++) {
    const ply = i + 1;
    const moveNumber = Math.floor(i / 2) + 1;
    const move = moves[i];
    const playedBy: Side = currentPos.sideToMove;

    // Motor hamle-öncesi konumu arar (Faz 2'de hesaplandı)
    const bestResult = bestResults[i];
    const bestMove = bestResult.bestMove;
    const bestEvalCp = bestResult.evaluationCp;

    const analyzed = analyzeMoveDetailed({
      before: currentPos,
      move,
      bestEvalCp,
      ply,
      opponentBlunderedBefore,
    });

    const posAfter = makeMove(currentPos, move);
    const evalAfterCp = playedBy === 'white' ? analyzed.playedEvalCp : -analyzed.playedEvalCp;

    const explanation = generateCoachExplanation(
      currentPos,
      move,
      analyzed.classification,
      bestMove,
      analyzed.lossCp,
      evalAfterCp,
    );

    counts[playedBy][analyzed.classification]++;
    (playedBy === 'white' ? whiteLosses : blackLosses).push(analyzed.lossCp);

    const isKey =
      analyzed.classification === 'blunder' ||
      analyzed.classification === 'miss' ||
      analyzed.classification === 'brilliant' ||
      analyzed.classification === 'mistake';

    if (isKey) {
      criticalPlies.push(ply);
    }

    reviewedMoves.push({
      ply,
      moveNumber,
      playedBy,
      notation: move.metadata.algebraic,
      from: move.from,
      to: move.to,
      bestFrom: bestMove.from,
      bestTo: bestMove.to,
      bestMoveNotation: bestMove.metadata.algebraic,
      bestMoveFlags: bestMove.specialFlags.map(String),
      bestMovePromotion: bestMove.promotion ?? undefined,
      classification: analyzed.classification,
      lossCp: analyzed.lossCp,
      evalBeforeCp: playedBy === 'white' ? bestEvalCp : -bestEvalCp,
      evalAfterCp,
      coachComment: explanation.coachComment,
      tacticalNote: explanation.tacticalNote,
      bestMoveReason: explanation.bestMoveReason,
      positionBefore: currentPos,
      positionAfter: posAfter,
    });

    evalCurve.push(evalAfterCp);
    evalCurveNodes.push({
      ply,
      evalCp: evalAfterCp,
      classification: analyzed.classification,
      isKeyMoment: isKey,
    });

    opponentBlunderedBefore =
      analyzed.classification === 'blunder' || analyzed.classification === 'mistake';

    currentPos = posAfter;
  }

  const whiteAccuracy = computeAverageAccuracy(whiteLosses);
  const blackAccuracy = computeAverageAccuracy(blackLosses);
  const whiteRatingEstimate = estimateRating(whiteAccuracy);
  const blackRatingEstimate = estimateRating(blackAccuracy);

  const totalBlunders = counts.white.blunder + counts.black.blunder;
  const totalBrilliant = counts.white.brilliant + counts.black.brilliant;
  const coachIntro = generateCoachIntroSummary(
    whiteAccuracy,
    blackAccuracy,
    totalBlunders,
    totalBrilliant,
  );

  const areas = {
    opening: evaluateArea(reviewedMoves, (m) => m.ply <= 6, 'Açılış'),
    tactics: evaluateArea(
      reviewedMoves,
      (m) =>
        m.classification === 'brilliant' ||
        m.classification === 'miss' ||
        m.classification === 'blunder' ||
        m.lossCp > 100,
      'Taktik',
    ),
    strategy: evaluateArea(reviewedMoves, (m) => m.ply > 6, 'Strateji'),
    citadels: evaluateArea(
      reviewedMoves,
      (m) => m.to === 110 || m.to === 111 || m.from === 110 || m.from === 111,
      'Hisar',
    ),
  };

  return {
    whiteName,
    blackName,
    whiteAccuracy,
    blackAccuracy,
    whiteRatingEstimate,
    blackRatingEstimate,
    coachIntro,
    evalCurve,
    evalCurveNodes,
    counts,
    areas,
    moves: reviewedMoves,
    criticalPlies,
  };
}
