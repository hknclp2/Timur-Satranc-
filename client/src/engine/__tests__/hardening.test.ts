/**
 * Engine hardening testleri (ID timeout fallback + fullEvaluate tutarlılığı).
 *
 *  - fullEvaluate vs evaluate: materyalin baskın olduğu konularda işaret aynı.
 *  - ID timeout fallback: 5ms bütçede pv boş değil (searchIterative /
 *    TimurEngine / worker handler).
 *  - TimurEngine `evaluate: fullEvaluate` opsiyonu (overload) çalışır,
 *    varsayılan (materyal) davranış bozulmaz.
 */

import { PieceKind } from '../../core/position/Position';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { evaluate } from '../evaluate';
import { fullEvaluate } from '../fullEvaluation';
import { searchIterative } from '../search';
import { TimurEngine } from '../timurEngine';
import { handleFindBestMove } from '../../worker/engineWorker';
import { serializePosition } from '../../worker/protocol';

export async function runHardeningTests(): Promise<TestSummary> {
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

  // ---- H1. fullEvaluate vs evaluate tutarlılığı (materyal baskın konumlar)
  const upWhite = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const evUp = evaluate(upWhite);
  const fevUp = fullEvaluate(upWhite);
  ok(evUp > 0, 'H01: materyal eval beyaz üstünken pozitif');
  ok(fevUp > 0, 'H02: fullEval beyaz üstünken pozitif');
  ok(Math.sign(evUp) === Math.sign(fevUp), 'H03: üstün konumda işaret aynı');

  const downWhite = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'black' },
  ]);
  const evDown = evaluate(downWhite);
  const fevDown = fullEvaluate(downWhite);
  ok(evDown < 0, 'H04: materyal eval gerideyken negatif');
  ok(fevDown < 0, 'H05: fullEval gerideyken negatif');
  ok(Math.sign(evDown) === Math.sign(fevDown), 'H06: geride konumda işaret aynı');

  const bare = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  ok(Math.sign(evaluate(bare)) === Math.sign(fullEvaluate(bare)), 'H07: çıplak şahlar işareti aynı (0)');

  // Siyah sıra: beyaz kale üstün ama sıra siyahta → iki eval da negatif, işaret aynı.
  const upWhiteBlackToMove = createTestPosition('black', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  ok(
    Math.sign(evaluate(upWhiteBlackToMove)) === Math.sign(fullEvaluate(upWhiteBlackToMove)),
    'H08: siyah sırada da işaret aynı',
  );

  // ---- H2. engine overload: evaluate: fullEvaluate
  const rFull = await engine.findBestMove(upWhite, { depth: 1 }, undefined, {
    evaluate: fullEvaluate,
  });
  ok(rFull.principalVariation.length >= 1, 'H09: findBestMove fullEvaluate ile hat döndürür');
  const rFull3 = await engine.findBestMove(upWhite, { depth: 1 }, { evaluate: fullEvaluate });
  ok(rFull3.principalVariation.length >= 1, 'H10: findBestMove 3-parametreli opts formu çalışır');
  const aFull = await engine.analyze(upWhite, { depth: 1 }, { evaluate: fullEvaluate });
  ok(aFull.principalVariation.length >= 1, 'H11: analyze fullEvaluate ile hat döndürür');
  const rDefault = await engine.findBestMove(upWhite, { depth: 1 });
  ok(rDefault.principalVariation.length >= 1, 'H12: varsayılan materyal eval davranışı bozulmadı');

  // ---- H3. ID timeout fallback (5ms bütçe): pv boş değil
  const dense = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(4, 5), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(6, 5), kind: PieceKind.Knight, side: 'black' },
    { sq: tq(5, 4), kind: PieceKind.Ferz, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(7, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
  ]);
  const id5 = searchIterative(dense, { maxDepth: 6, deadlineMs: Date.now() + 5 });
  ok(id5.pv.length >= 1, 'H13: searchIterative 5ms bütçede pv boş değil');

  const eng5 = await engine.findBestMove(dense, { movetimeMs: 5 });
  ok(eng5.principalVariation.length >= 1, 'H14: TimurEngine 5ms bütçede pv boş değil');

  const w5 = await handleFindBestMove(
    {
      type: 'find_best_move',
      requestId: 'hardening-5ms',
      position: serializePosition(dense),
      profileId: 'V',
      movetimeMs: 5,
      maxDepth: 6,
    },
    new Set<string>(),
  );
  ok(
    w5.type === 'best_move_result' && w5.result.principalVariation.length >= 1,
    'H15: worker 5ms bütçede best_move_result + pv boş değil',
  );

  console.log(`hardening: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
