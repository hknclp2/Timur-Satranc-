/**
 * Review regresyon testleri (denetim bulguları: reconstruction / eval ekseni /
 * tek-formül / değer tablosu / bestMoveFlags taşınması).
 *
 * Desen: mevcut runTests uyumu için `runReviewRegressionTests()` export eder.
 * Yardımcılar: `createTestPosition`, `tq` (gameCore.test) + analyzer.test deseni.
 */

import { PieceKind, type Position, type Side } from '../../core/position/Position';
import type { Move } from '../../core/move/Move';
import { MoveSpecialFlag } from '../../core/move/Move';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { TimurEngine } from '../../engine/timurEngine';
import { PIECE_VALUES_CP } from '../../engine/evaluate';
import { DEFAULT_TIMUR_PIECE_VALUES } from '../../core/material/MaterialCalculator';
import { analyzeFullGame } from '../gameAnalyzer';
import { accuracyFromLosses, moveAccuracy } from '../thresholds';
import type { PieceType } from '../../types/chess';

function pickMove(from: number, to: number, moves: Move[]): Move {
  const found = moves.find((m) => m.from === from && m.to === to);
  if (!found) throw new Error(`Test hamlesi bulunamadı: ${from}→${to}`);
  return found;
}

function firstSideMove(pos: Position, side: Side): Move {
  const found = generateLegalMoves(pos).find((m) => m.piece.side === side);
  if (!found) throw new Error(`Legal hamle yok (side=${side})`);
  return found;
}

/** Sabit eval dönen stub motor (bestEvalCp sideToMove-lehine konvansiyon). */
function stubEngineFixedEval(bestEvalCp: number, bestMoveOverride?: Move) {
  return {
    findBestMove: async (pos: Position) => {
      const legal = generateLegalMoves(pos);
      if (legal.length === 0) throw new Error('stub: legal hamle yok');
      const bestMove =
        bestMoveOverride && legal.some((m) => m.from === bestMoveOverride.from && m.to === bestMoveOverride.to)
          ? bestMoveOverride
          : legal[0];
      return {
        bestMove,
        evaluationCp: bestEvalCp,
        depthReached: 1,
        nodesSearched: 1,
        timeMs: 0,
        principalVariation: [bestMove],
      };
    },
  } as any;
}

function kingSwapSetup(): Position {
  return createTestPosition('white', [
    { sq: tq(5, 1), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 1), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
}

export async function runReviewRegressionTests(): Promise<TestSummary> {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  }

  const engine = new TimurEngine();

  // ---- T1: KingSwap içeren 2-ply oyunda reconstruction zinciri kırılmıyor
  {
    const initial = kingSwapSetup();
    const swapMove = generateLegalMoves(initial).find(
      (m) => m.from === tq(5, 1) && m.to === tq(0, 1) && m.specialFlags.includes(MoveSpecialFlag.KingSwap),
    );
    ok(swapMove !== undefined, 'R01: KingSwap hamlesi üretilir (T1 önkoşul)');
    const m1 = swapMove as Move;
    const pos1 = makeMove(initial, m1);
    const m2 = firstSideMove(pos1, 'black');
    const report = await analyzeFullGame(engine, initial, [m1, m2], { depth: 1 });
    ok(report.moves.length === 2, 'R02: 2-ply rapor uzunluğu (T1)');
    ok(
      report.moves[0].from === m1.from && report.moves[0].to === m1.to,
      'R03: 1. ply from/to korunur (T1)',
    );
    ok(
      (report.moves[0].positionAfter.board[tq(0, 1)] as any)?.kind === PieceKind.King &&
        (report.moves[0].positionAfter.board[tq(5, 1)] as any)?.kind === PieceKind.Rook,
      'R04: takas sonrası şah/kale yer değiştirir (T1)',
    );
    ok(
      (report.moves[1].positionBefore.board[m2.from] as any)?.kind === (m2.piece as any).kind,
      'R05: 2. ply beklenen taş beklenen karede (T1)',
    );
    ok(
      generateLegalMoves(report.moves[0].positionBefore).length > 0 &&
        generateLegalMoves(report.moves[1].positionBefore).length > 0,
      'R06: her ply positionBefore üretimi boş değil (T1)',
    );
  }

  // ---- T2: terfili hamle sonrası terfi eden taş doğru türde
  {
    const promoPos = createTestPosition('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(0, 8), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    ]);
    const promoMove = pickMove(tq(0, 8), tq(0, 9), generateLegalMoves(promoPos));
    const report = await analyzeFullGame(engine, promoPos, [promoMove], { depth: 1 });
    ok(report.moves.length === 1, 'R07: terfi raporu 1 ply (T2)');
    ok(
      (report.moves[0].positionAfter.board[tq(0, 9)] as any)?.kind === PieceKind.Rook,
      'R08: terfi sonrası taş kale olur (T2)',
    );
  }

  // ---- T3: özel-dizilim başlangıcından reconstruction ilk hamleyi doğru kuruyor
  {
    const custom = createTestPosition('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(3, 3), kind: PieceKind.Giraffe, side: 'white' },
      { sq: tq(7, 7), kind: PieceKind.Knight, side: 'black' },
    ]);
    const mv = pickMove(tq(5, 5), tq(5, 8), generateLegalMoves(custom));
    const manualAfter = makeMove(custom, mv);
    const report = await analyzeFullGame(engine, custom, [mv], { depth: 1 });
    ok(
      (report.moves[0].positionBefore.board[tq(5, 5)] as any)?.kind === PieceKind.Rook,
      'R09: özel dizilimde ilk hamle öncesi taş doğru (T3)',
    );
    ok(
      (report.moves[0].positionAfter.board[tq(5, 8)] as any)?.kind ===
        (manualAfter.board[tq(5, 8)] as any)?.kind &&
        (report.moves[0].positionAfter.board[tq(5, 5)] as any) === null,
      'R10: reconstruction ilk hamleyi doğru kurar (T3)',
    );
  }

  // ---- T4: siyah hamlesinde evalBeforeCp beyaz-göreli eksende
  {
    const initial = createTestPosition('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
    ]);
    const m1 = pickMove(tq(5, 5), tq(5, 6), generateLegalMoves(initial));
    const pos1 = makeMove(initial, m1);
    const m2 = firstSideMove(pos1, 'black');
    const stub = stubEngineFixedEval(200);
    const report = await analyzeFullGame(stub, initial, [m1, m2], { depth: 1 });
    ok(report.moves[0].evalBeforeCp === 200, `R11: beyaz evalBeforeCp sideToMove-pozitif (gelen ${report.moves[0].evalBeforeCp}) (T4)`);
    ok(report.moves[1].evalBeforeCp === -200, `R12: siyah evalBeforeCp beyaz-göreli eksende (gelen ${report.moves[1].evalBeforeCp}) (T4)`);
  }

  // ---- T5: tek-formül paritesi (thresholds.moveAccuracy === iç skor; davranışsal ReviewSummary)
  {
    ok(moveAccuracy(0) === 100, 'R13: moveAccuracy(0)=100 (T5)');
    ok(
      Math.abs(moveAccuracy(280) - 100 * Math.exp(-1)) < 1e-9,
      'R14: moveAccuracy(280)=100/e (T5)',
    );
    ok(
      Math.abs(moveAccuracy(60) - 100 * Math.exp(-60 / 280)) < 1e-9,
      'R15: moveAccuracy(60) tek formül (T5)',
    );
    // Davranışsal: aynı loss'ta ReviewSummary doğrulukları thresholds ile aynı (clamp farkı normalize).
    const gpos = createTestPosition('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
      { sq: tq(7, 7), kind: PieceKind.Knight, side: 'black' },
    ]);
    const seq: [number, number][] = [
      [tq(5, 5), tq(5, 8)],
      [tq(7, 7), tq(5, 6)],
    ];
    const gameMoves: Move[] = [];
    let cur = gpos;
    for (const [from, to] of seq) {
      const mv = pickMove(from, to, generateLegalMoves(cur));
      gameMoves.push(mv);
      cur = makeMove(cur, mv);
    }
    const fresh = createTestPosition('white', [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
      { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
      { sq: tq(7, 7), kind: PieceKind.Knight, side: 'black' },
    ]);
    const report = await analyzeFullGame(engine, fresh, gameMoves, { depth: 1 });
    const whiteLosses = report.moves.filter((m) => m.playedBy === 'white').map((m) => m.lossCp);
    const blackLosses = report.moves.filter((m) => m.playedBy === 'black').map((m) => m.lossCp);
    const expWhite = accuracyFromLosses(whiteLosses);
    const expBlack = accuracyFromLosses(blackLosses);
    const clampedWhite = Math.max(15, Math.min(99, expWhite));
    const clampedBlack = Math.max(15, Math.min(99, expBlack));
    ok(
      Math.abs(report.whiteAccuracy - clampedWhite) < 0.11,
      `R16: beyaz doğruluk thresholds ile aynı (rapor ${report.whiteAccuracy} vs ${clampedWhite}) (T5)`,
    );
    ok(
      Math.abs(report.blackAccuracy - clampedBlack) < 0.11,
      `R17: siyah doğruluk thresholds ile aynı (rapor ${report.blackAccuracy} vs ${clampedBlack}) (T5)`,
    );
  }

  // ---- T6: değer-tablosu paritesi (legacyAdapter LEGACY_TO_KIND eşlemesiyle)
  {
    // Kaynak: src/worker/legacyAdapter.ts LEGACY_TO_KIND (verbatim kopya; modül export etmez).
    const LEGACY_TO_KIND: Record<PieceType, PieceKind> = {
      king: PieceKind.King,
      queen: PieceKind.General,
      general: PieceKind.Ferz,
      rook: PieceKind.Rook,
      knight: PieceKind.Knight,
      bishop: PieceKind.Alfil,
      camel: PieceKind.Camel,
      warMachine: PieceKind.Dabbaba,
      giraffe: PieceKind.Giraffe,
      picket: PieceKind.Picket,
      pawn: PieceKind.Pawn,
      prince: PieceKind.Prince,
    };
    const keys = Object.keys(LEGACY_TO_KIND) as PieceType[];
    for (const k of keys) {
      const kind = LEGACY_TO_KIND[k];
      const expected = (PIECE_VALUES_CP[kind] ?? 0) / 100;
      const actual = (DEFAULT_TIMUR_PIECE_VALUES as Record<string, number>)[k];
      ok(
        Math.abs(actual - expected) < 1e-9,
        `R18-${k}: DEFAULT[${k}]=${actual} === PIECE_VALUES_CP[${kind}]/100=${expected} (T6)`,
      );
    }
  }

  // ---- T7: bestMoveFlags taşınması (KingSwap preview konumu doğru)
  {
    const initial = kingSwapSetup();
    const swapMove = generateLegalMoves(initial).find(
      (m) => m.from === tq(5, 1) && m.to === tq(0, 1) && m.specialFlags.includes(MoveSpecialFlag.KingSwap),
    ) as Move;
    const quiet = pickMove(tq(5, 1), tq(5, 2), generateLegalMoves(initial));
    const stub = stubEngineFixedEval(100, swapMove);
    const report = await analyzeFullGame(stub, initial, [quiet], { depth: 1 });
    const rm = report.moves[0];
    ok(
      rm.bestFrom === swapMove.from && rm.bestTo === swapMove.to,
      'R19: bestFrom/bestTo takas karesi (T7)',
    );
    ok(
      Array.isArray((rm as any).bestMoveFlags) &&
        ((rm as any).bestMoveFlags as string[]).includes(MoveSpecialFlag.KingSwap as unknown as string),
      'R20: bestMoveFlags king_swap taşır (T7)',
    );
    // Preview reconstruction: ReviewInteractiveStage ile aynı mantık (flags + promotion).
    const piece = rm.positionBefore.board[rm.bestFrom];
    const flags = ((rm as any).bestMoveFlags ?? []) as unknown as Move['specialFlags'];
    const promotion = ((rm as any).bestMovePromotion ?? undefined) as unknown as Move['promotion'];
    const preview = makeMove(rm.positionBefore, {
      from: rm.bestFrom,
      to: rm.bestTo,
      piece: piece as Move['piece'],
      capturedPiece: rm.positionBefore.board[rm.bestTo],
      specialFlags: [...flags],
      promotion,
      metadata: { isCheck: false, isCapture: false, algebraic: rm.bestMoveNotation },
    });
    const manual = makeMove(initial, swapMove);
    ok(
      (preview.board[tq(0, 1)] as any)?.kind === PieceKind.King &&
        (preview.board[tq(5, 1)] as any)?.kind === PieceKind.Rook,
      'R21: flags ile preview takası doğru kurar (T7)',
    );
    ok(
      (preview.board[tq(0, 1)] as any)?.kind === (manual.board[tq(0, 1)] as any)?.kind &&
        (preview.board[tq(5, 1)] as any)?.kind === (manual.board[tq(5, 1)] as any)?.kind,
      'R22: preview manuel takas ile aynı (T7)',
    );
  }

  console.log(`reviewRegression: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
