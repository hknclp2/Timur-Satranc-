/**
 * Engine — arama v0.2: negamax + alpha-beta + iterative deepening +
 * move ordering + transposition table + movetime/node limiti (§3.4).
 *
 * v0.1'den farkı: sabit derinlik yerine `searchIterative` (depth 1'den başlar,
 * süre dolunca SON TAMAMLANAN derinliğin sonucu döner — "süre bitti, cevap
 * yok" durumu oluşmaz). `searchRoot` geriye uyumlu şekilde durur.
 *
 * Terminal skorları (sideToMove'a GÖRE, negamax konvansiyonu):
 *  - mat (sıra kimdeyse O kaybeder)      → -(MATE_SCORE - ply)  (hızlı mat tercihli)
 *  - pat (Timur kuralı: hamlesiz KAYBEDER) → -(STALEMATE_WIN_SCORE - ply)
 *  - hisar / fifty-move / üç-tekrar       → 0 (beraberlik)
 * Mat > pat-skoru: ikisi de "kazanç" ama motor temiz matı tercih eder
 * (mat-in-N testlerinin deterministik olması da buna dayanır).
 *
 * Kurallar Game Core'dan gelir (`generateLegalMoves`, `make/undoMoveInPlace`,
 * `isCheck`, `isCitadelDraw`) — arama KENDİ hamle mantığı içermez.
 */

import type { Move } from '../core/move/Move';
import type { Position } from '../core/position/Position';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import { makeMoveInPlace, undoMoveInPlace } from '../core/rules/makeMove';
import { isCheck, isCitadelDraw } from '../core/rules/gameResult';
import { PIECE_VALUES_CP, evaluate } from './evaluate';
import { TranspositionTable, TTFlag, isTTMove } from './tt/transpositionTable';

/** Mat skoru — tüm materyal toplamlarından büyük olmalı (28 taş × 950cp ≈ 27k). */
export const MATE_SCORE = 1000000;
/** Pat-kazancı skoru — kazançtır ama temiz matın altında tutulur. */
export const STALEMATE_WIN_SCORE = 900000;
/** Ply cezası marjı (MATE_SCORE'dan küçük kalmalı). */
export const MAX_PLY = 128;

export interface SearchResult {
  /** sideToMove lehine skor (cp; mat/pat dahil). */
  score: number;
  /** En iyi hat (kökten itibaren hamleler; TT kesintisinde kısalabilir — best effort). */
  pv: Move[];
  nodes: number;
}

export interface SearchOptions {
  useTT?: boolean; // default true
  orderMoves?: boolean; // default true
  deadlineMs?: number; // epoch-ms; default Infinity (süre sınırı yok)
  nodeLimit?: number; // default Infinity
  evaluate?: (position: Position) => number; // default: materyal evaluate
}

/** Kökte hamle-hamle skorlanmış adaylar (bot top-N seçimi için). */
export interface ScoredMove {
  move: Move;
  /** Budamalı arama sonucu skor (fail-soft bound olabilir — sıralama yaklaşıktır). */
  score: number;
  pv: Move[];
}

interface Ctx {
  nodes: number;
  tt: TranspositionTable | null;
  deadlineMs: number;
  nodeLimit: number;
  evaluate: (position: Position) => number;
  order: boolean;
}

class SearchTimeout extends Error {}

function terminalScore(position: Position, ply: number): number | null {
  if (isCitadelDraw(position)) return 0;
  if (position.flags.halfMoveClock >= 100) return 0;
  const rep = position.flags.repetitionCount[position.zobristHash.toString()] ?? 0;
  if (rep >= 3) return 0;
  return null;
}

function pollTimeout(ctx: Ctx): void {
  // Node limiti HER düğümde (ucuz tamsayı karşılaştırma); Date.now() pahalı
  // olduğu için deadline 1024 düğümde bir yoklanır.
  if (ctx.nodes >= ctx.nodeLimit) {
    throw new SearchTimeout();
  }
  if ((ctx.nodes & 1023) === 0) {
    if (Date.now() > ctx.deadlineMs) {
      throw new SearchTimeout();
    }
  }
}

/**
 * Terminal kazanç bandı alt sınırı (mat + pat-kazancı; ikisi de ply-cezalı).
 * TT'de saklanan ply-bağımlı skorlar bu eşiğin dışında tanınır ve
 * saklama/okuma sırasında ply'den bağımsız forma çevrilir (klasik
 * mate-score adjustment; aksi halde farklı ply'den okunan TT girdisi
 * yanlış mat mesafesi döndürür).
 */
const TERMINAL_BAND = STALEMATE_WIN_SCORE - MAX_PLY;

function ttScoreToStored(score: number, ply: number): number {
  if (score > TERMINAL_BAND) return score + ply;
  if (score < -TERMINAL_BAND) return score - ply;
  return score;
}

function ttScoreFromStored(stored: number, ply: number): number {
  if (stored > TERMINAL_BAND) return stored - ply;
  if (stored < -TERMINAL_BAND) return stored + ply;
  return stored;
}

/**
 * Hamle sıralaması (§3.4 Move Ordering — basit sürüm):
 * TT hamlesi > şah çekişi > taş alma (MVV: kurban değeri, saldırgan hafifliği)
 * > diğer. Kökte ve iç düğümlerde aynı sıra kullanılır.
 */
function orderScore(move: Move, ttBest: boolean): number {
  if (ttBest) return 10_000_000;
  if (move.metadata.isCheck) return 1_000_000;
  if (move.metadata.isCapture && move.capturedPiece) {
    const victim = PIECE_VALUES_CP[move.capturedPiece.kind] ?? 0;
    const attacker = PIECE_VALUES_CP[move.piece.kind] ?? 0;
    return 10_000 + victim - Math.floor(attacker / 16);
  }
  return 0;
}

function sortMoves(moves: Move[], ttBest: { from: number; to: number } | null, doOrder: boolean): Move[] {
  if (!doOrder) return moves;
  return moves
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const sa = orderScore(a.m, ttBest !== null && ttBest.from === a.m.from && ttBest.to === a.m.to);
      const sb = orderScore(b.m, ttBest !== null && ttBest.from === b.m.from && ttBest.to === b.m.to);
      if (sb !== sa) return sb - sa;
      return a.i - b.i; // stabil: eşit skorlarda üretim sırası korunur
    })
    .map((e) => e.m);
}

function negamax(
  position: Position,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: Ctx,
): { score: number; pv: Move[] } {
  ctx.nodes++;
  pollTimeout(ctx);
  const drawScore = terminalScore(position, ply);
  if (drawScore !== null) return { score: drawScore, pv: [] };

  const ttEntry = ctx.tt?.get(position.zobristHash);
  if (ttEntry && ttEntry.depth >= depth) {
    const ttScore = ttScoreFromStored(ttEntry.score, ply);
    if (ttEntry.flag === TTFlag.Exact) return { score: ttScore, pv: [] };
    if (ttEntry.flag === TTFlag.Lower && ttScore > alpha) alpha = ttScore;
    else if (ttEntry.flag === TTFlag.Upper && ttScore < beta) beta = ttScore;
    if (alpha >= beta) return { score: ttScore, pv: [] };
  }

  const moves = generateLegalMoves(position);
  if (moves.length === 0) {
    if (isCheck(position, position.sideToMove)) {
      return { score: -(MATE_SCORE - ply), pv: [] };
    }
    return { score: -(STALEMATE_WIN_SCORE - ply), pv: [] }; // pat = kayıp
  }

  if (depth <= 0) {
    return { score: ctx.evaluate(position), pv: [] };
  }

  const ordered = sortMoves(
    moves,
    ttEntry ? { from: ttEntry.bestFrom, to: ttEntry.bestTo } : null,
    ctx.order,
  );
  const alphaOrig = alpha;
  let bestScore = -Infinity;
  let bestPv: Move[] = [];
  let bestMove: Move | null = null;
  for (const move of ordered) {
    const undo = makeMoveInPlace(position, move);
    const child = negamax(position, depth - 1, -beta, -alpha, ply + 1, ctx);
    undoMoveInPlace(position, move, undo);
    const score = -child.score;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      bestPv = [move, ...child.pv];
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
  }

  if (ctx.tt && bestMove) {
    const flag =
      bestScore <= alphaOrig ? TTFlag.Upper : bestScore >= beta ? TTFlag.Lower : TTFlag.Exact;
    ctx.tt.set(position.zobristHash, {
      depth,
      score: ttScoreToStored(bestScore, ply),
      flag,
      bestFrom: bestMove.from,
      bestTo: bestMove.to,
    });
  }
  return { score: bestScore, pv: bestPv };
}

/**
 * Kök hamlelerini tek tek skorlar (budamalı; skorlar fail-soft bound olabilir).
 * Bot top-N aday havuzu için kullanılır. Timeout'ta o ana kadar tamamlanan
 * hamleler döner (`completed: false` ile).
 *
 * Güvenlik: arama pozisyonun KLONU üzerinde koşar — timeout yarım hamle
 * bırakırsa (make/undo arası throw) orijinal pozisyon ASLA kirlenmez.
 */
export function scoreRootMoves(
  position: Position,
  depth: number,
  opts: SearchOptions & { tt?: TranspositionTable } = {},
): { scored: ScoredMove[]; nodes: number; completed: boolean } {
  const ctx: Ctx = {
    nodes: 0,
    tt: opts.useTT === false ? null : (opts.tt ?? new TranspositionTable()),
    deadlineMs: opts.deadlineMs ?? Infinity,
    nodeLimit: opts.nodeLimit ?? Infinity,
    evaluate: opts.evaluate ?? evaluate,
    order: opts.orderMoves !== false,
  };
  const work = clonePosition(position);
  const safeDepth = Math.max(1, Math.min(Math.floor(depth), MAX_PLY));
  const entry = ctx.tt?.get(work.zobristHash);
  const rootMoves = sortMoves(
    generateLegalMoves(work),
    entry ? { from: entry.bestFrom, to: entry.bestTo } : null,
    ctx.order,
  );
  const scored: ScoredMove[] = [];
  let alpha = -Infinity;
  let completed = true;
  const beta = Infinity;
  for (const move of rootMoves) {
    try {
      const undo = makeMoveInPlace(work, move);
      const child = negamax(work, safeDepth - 1, -beta, -alpha, 1, ctx);
      undoMoveInPlace(work, move, undo);
      const score = -child.score;
      scored.push({ move, score, pv: [move, ...child.pv] });
      if (score > alpha) alpha = score;
    } catch (e) {
      if (e instanceof SearchTimeout) {
        completed = false;
        break;
      }
      throw e;
    }
  }
  return { scored, nodes: ctx.nodes, completed };
}

export interface IterativeResult extends SearchResult {
  depthReached: number;
  /** true ise süre/nodelobal bitmiş, dönen sonuç SON TAMAMLANAN derinliğindir. */
  timedOut: boolean;
  ttHits: number;
}

/**
 * Iterative deepening (§3.4): depth 1'den başla, süre/nodeLOBAL/maxDepth
 * dolunca SON TAMAMLANAN derinliğin sonucunu döndür.
 *
 * Timeout güvenliği: her derinlik, pozisyonun KLONU üzerinde koşar — yarım
 * kalan iterasyon tahtayı kirletse bile orijinal pozisyon etkilenmez ve
 * önceki tamamlanan sonuç kullanılır. Bulunamazsa (derinlik-1 bile bitmediyse)
 * ilk sıralı hamle + statik eval fallback'i döner (cevap HER ZAMAN vardır).
 */
export function searchIterative(
  position: Position,
  opts: {
    maxDepth: number;
    deadlineMs?: number;
    nodeLimit?: number;
    useTT?: boolean;
    orderMoves?: boolean;
    evaluate?: (position: Position) => number;
  },
): IterativeResult {
  const maxDepth = Math.max(1, Math.min(Math.floor(opts.maxDepth), MAX_PLY));
  const tt = opts.useTT === false ? null : new TranspositionTable();
  const evaluateFn = opts.evaluate ?? evaluate;
  const order = opts.orderMoves !== false;
  let totalNodes = 0;
  let last: { score: number; pv: Move[]; depth: number } | null = null;
  let timedOut = false;

  for (let d = 1; d <= maxDepth; d++) {
    // Node bütçesi tükendiyse yeni derinliğe başlama (kalan <= 0 ile
    // scoreRootMoves'e girmek 1024 düğümlük aşmaya yol açardı).
    if (opts.nodeLimit !== undefined && totalNodes >= opts.nodeLimit) {
      timedOut = true;
      break;
    }
    // Klon üzerinde çalış (yarım iterasyon kirletirse orijinal korunur).
    const clone = clonePosition(position);
    try {
      const r = scoreRootMoves(clone, d, {
        tt: tt ?? undefined,
        useTT: opts.useTT,
        orderMoves: order,
        deadlineMs: opts.deadlineMs,
        nodeLimit: opts.nodeLimit !== undefined ? opts.nodeLimit - totalNodes : undefined,
        evaluate: evaluateFn,
      });
      totalNodes += r.nodes;
      if (r.scored.length === 0) break; // hamle yok (mat/pat — üst katman yönetir)
      // En iyi skorlu hamle + hattı (sıralama kökte skora göre).
      let best = r.scored[0];
      for (const s of r.scored) {
        if (s.score > best.score) best = s;
      }
      if (r.completed) {
        last = { score: best.score, pv: best.pv, depth: d };
        // Zorunlu mat bulunduysa daha derine inme (daha hızlı mat aranmaz — v0.1).
        if (best.score > MATE_SCORE - MAX_PLY) break;
      } else {
        timedOut = true;
        if (!last) {
          // Derinlik-1 bile bitmedi: kısmi sonucu kullan (cevap garantisi).
          last = { score: best.score, pv: best.pv, depth: 0 };
        }
        break;
      }
    } catch (e) {
      if (e instanceof SearchTimeout) {
        timedOut = true;
        break;
      }
      throw e;
    }
    if (Date.now() > (opts.deadlineMs ?? Infinity)) {
      timedOut = true;
      break;
    }
  }

  if (!last) {
    // Hiçbir hamle üretilemedi (oyun bitmiş) ya da anında timeout:
    // terminal skor konvansiyonuyla cevap ver (statik eval DEĞİL —
    // mat/pat bandı korunur), hamle varsa ilk sıralı hamle + statik eval.
    const draw = terminalScore(position, 0);
    if (draw !== null) {
      return { score: draw, pv: [], nodes: totalNodes, depthReached: 0, timedOut, ttHits: tt?.hits ?? 0 };
    }
    const moves = generateLegalMoves(position);
    if (moves.length === 0) {
      const mated = isCheck(position, position.sideToMove);
      const tScore = mated ? -MATE_SCORE : -STALEMATE_WIN_SCORE;
      return { score: tScore, pv: [], nodes: totalNodes, depthReached: 0, timedOut, ttHits: tt?.hits ?? 0 };
    }
    const ordered = sortMoves(moves, null, order);
    const tmp = clonePosition(position);
    const undo = makeMoveInPlace(tmp, ordered[0]);
    const score = -evaluateFn(tmp);
    undoMoveInPlace(tmp, ordered[0], undo);
    return {
      score,
      pv: [ordered[0]],
      nodes: totalNodes,
      depthReached: 0,
      timedOut: true,
      ttHits: tt?.hits ?? 0,
    };
  }
  return {
    score: last.score,
    pv: last.pv,
    nodes: totalNodes,
    depthReached: last.depth,
    timedOut,
    ttHits: tt?.hits ?? 0,
  };
}

/** Derin klon (ID iterasyonları için; tahta + hisar + bayraklar kopyalanır). */
function clonePosition(position: Position): Position {
  const board = [...(position.board as unknown[])];
  return {
    board: board as never,
    sideToMove: position.sideToMove,
    citadels: {
      topLeft: {
        occupant: position.citadels.topLeft.occupant
          ? { ...position.citadels.topLeft.occupant }
          : null,
        sealed: position.citadels.topLeft.sealed,
      },
      bottomRight: {
        occupant: position.citadels.bottomRight.occupant
          ? { ...position.citadels.bottomRight.occupant }
          : null,
        sealed: position.citadels.bottomRight.sealed,
      },
    },
    flags: {
      halfMoveClock: position.flags.halfMoveClock,
      fullMoveNumber: position.flags.fullMoveNumber,
      repetitionCount: { ...position.flags.repetitionCount },
      hasUsedKingSwap: position.flags.hasUsedKingSwap
        ? { ...position.flags.hasUsedKingSwap }
        : { white: false, black: false },
    },
    zobristHash: position.zobristHash,
  };
}

/** Kök araması (sabit derinlik). Girdi pozisyonu DEĞİŞTİRMEZ (klon üzerinde koşar). */
export function searchRoot(
  position: Position,
  depth: number,
  opts: SearchOptions = {},
): SearchResult {
  const safeDepth = Math.max(1, Math.min(Math.floor(depth), MAX_PLY));
  const ctx: Ctx = {
    nodes: 0,
    tt: opts.useTT === false ? null : new TranspositionTable(),
    deadlineMs: opts.deadlineMs ?? Infinity,
    nodeLimit: opts.nodeLimit ?? Infinity,
    evaluate: opts.evaluate ?? evaluate,
    order: opts.orderMoves !== false,
  };
  // Klon üzerinde koş: timeout negamax'ı make/undo arasında keserse bile
  // orijinal pozisyon kirlenmez. Timeout'ta terminal-duyarlı fallback döner
  // (SearchTimeout dışarı sızmaz — cevap HER ZAMAN vardır).
  const work = clonePosition(position);
  try {
    const { score, pv } = negamax(work, safeDepth, -Infinity, Infinity, 0, ctx);
    return { score, pv, nodes: ctx.nodes };
  } catch (e) {
    if (!(e instanceof SearchTimeout)) throw e;
    const draw = terminalScore(position, 0);
    if (draw !== null) return { score: draw, pv: [], nodes: ctx.nodes };
    const moves = generateLegalMoves(position);
    if (moves.length === 0) {
      const mated = isCheck(position, position.sideToMove);
      return { score: mated ? -MATE_SCORE : -STALEMATE_WIN_SCORE, pv: [], nodes: ctx.nodes };
    }
    const ordered = sortMoves(moves, null, ctx.order);
    const tmp = clonePosition(position);
    const undo = makeMoveInPlace(tmp, ordered[0]);
    const score = -ctx.evaluate(tmp);
    undoMoveInPlace(tmp, ordered[0], undo);
    return { score, pv: [ordered[0]], nodes: ctx.nodes };
  }
}
