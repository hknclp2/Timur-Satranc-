/**
 * Engine — fullEvaluation unit testleri (v0.2, §7.6).
 *
 * Bileşen işaretleri + determinizm + sideToMove konvansiyonu.
 * Değerler küçük kurulumlarla el hesabına uygun seçildi.
 */

import { PieceKind } from '../../core/position/Position';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { fullEvaluate, fullEvaluationBreakdown } from '../fullEvaluation';

export function runEvalTests(): TestSummary {
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

  // ---- F1. çıplak şahlar: her şey 0
  const bare = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  const b0 = fullEvaluationBreakdown(bare);
  ok(
    b0.material === 0 && b0.mobility === 0 && b0.kingSafety === 0 &&
    b0.citadelControl === 0 && b0.pieceActivity === 0 && b0.pawnStructure === 0 &&
    b0.total === 0,
    'F01: çıplak şahlar toplam 0',
  );
  ok(fullEvaluate(bare) === 0, 'F02: çıplak pozisyon skoru 0');

  // ---- F2. +1 kale: material 500, mobility +19, activity +2
  const upRook = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const b1 = fullEvaluationBreakdown(upRook);
  ok(b1.material === 500, `F03: material +500 (gelen ${b1.material})`);
  ok(b1.mobility === 19, `F04: mobility +19 (22-3 hamle, gelen ${b1.mobility})`);
  ok(b1.kingSafety === 0, 'F05: temas yoksa şah güvenliği 0');
  ok(b1.pieceActivity === 2, `F06: merkez kale +2 (gelen ${b1.pieceActivity})`);
  ok(b1.total === b1.material + b1.mobility + b1.kingSafety + b1.citadelControl + b1.pieceActivity + b1.pawnStructure, 'F07: total = bileşen toplamı');
  ok(fullEvaluate(upRook) > 0, 'F08: beyaz sıra pozitif');
  const upRookBlack = createTestPosition('black', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  ok(fullEvaluate(upRookBlack) === -fullEvaluate(upRook), 'F09: skor sideToMove-göreli (negasyon)');

  // ---- F3. şah tehlikede: siyah kale beyaz şahın dosyasına basıyor
  const danger = createTestPosition('white', [
    { sq: tq(4, 4), kind: PieceKind.King, side: 'white' },
    { sq: tq(4, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  const b2 = fullEvaluationBreakdown(danger);
  ok(b2.kingSafety < 0, `F10: tehlikede şah negatif güvenlik (gelen ${b2.kingSafety})`);

  // ---- F4. hisar: occupant + kilit + erişim
  const cit = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: 111, kind: PieceKind.Rook, side: 'white' },
  ]);
  const b3 = fullEvaluationBreakdown(cit);
  ok(b3.citadelControl === Math.round(60 * 0.4), `F11: hisar kontrolü +24 (gelen ${b3.citadelControl})`);
  const sealed = createTestPosition(
    'white',
    [
      { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
      { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    ],
    { sealed110: true },
  );
  const b4 = fullEvaluationBreakdown(sealed);
  ok(b4.citadelControl === Math.round(80 * 0.4), `F12: rakip kilitli hisar +32 (gelen ${b4.citadelControl})`);
  const access = createTestPosition('white', [
    { sq: tq(0, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
  const b5 = fullEvaluationBreakdown(access);
  ok(b5.citadelControl === Math.round(40 * 0.4), `F13: hisar erişimi +16 (gelen ${b5.citadelControl})`);

  // ---- F5. katmerli piyon: aynı dikeyde 3 beyaz piyon → -3
  const doubled = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(3, 2), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(3, 3), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(3, 4), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
  ]);
  const b6 = fullEvaluationBreakdown(doubled);
  ok(b6.pawnStructure === -3, `F14: katmerli piyon -3 (gelen ${b6.pawnStructure})`);

  // ---- F6. determinizm
  const again = fullEvaluationBreakdown(upRook);
  ok(JSON.stringify(again) === JSON.stringify(b1), 'F15: breakdown deterministik');

  console.log(`eval: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
