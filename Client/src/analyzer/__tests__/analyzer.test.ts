/**
 * Analyzer testleri (§3.6 pipeline + §7.7 eşikleri + explain + rapor).
 *
 * Demo oyunu (beyaz oynar, 6 hamle):
 *  1. K×K asılı kale alınır (Excellent)
 *  2. Siyah atı bedavaya bırakır (Mistake + açıklama)
 *  3. Kale atı alır (Excellent)
 *  4-6. Sakin hamleler
 */

import { PieceKind } from '../../core/position/Position';
import type { Move } from '../../core/move/Move';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { MATE_SCORE, STALEMATE_WIN_SCORE } from '../../engine/search';
import { TimurEngine } from '../../engine/timurEngine';
import { analyzeMove, classifyLoss } from '../moveAnalyzer';
import { explainMove } from '../explain';
import { analyzeGame } from '../gameAnalyzer';
import { formatReport } from '../report';

function pickMove(from: number, to: number, moves: Move[]): Move {
  const found = moves.find((m) => m.from === from && m.to === to);
  if (!found) throw new Error(`Test hamlesi bulunamadı: ${from}→${to}`);
  return found;
}

export async function runAnalyzerTests(): Promise<TestSummary> {
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

  // ---- A1. §7.7 eşik sınırları (birebir)
  const bounds: [number, string][] = [
    [0, 'Excellent'],
    [20, 'Excellent'],
    [21, 'Good'],
    [60, 'Good'],
    [61, 'Inaccuracy'],
    [150, 'Inaccuracy'],
    [151, 'Mistake'],
    [300, 'Mistake'],
    [301, 'Blunder'],
    [1200, 'Blunder'],
  ];
  for (const [loss, expected] of bounds) {
    ok(classifyLoss(loss) === expected, `A01: loss ${loss} → ${expected}`);
  }

  // ---- A2. kazançlı alış = kayıp 0 → Excellent
  const capPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
  ]);
  const capMove = pickMove(tq(5, 5), tq(5, 8), generateLegalMoves(capPos));
  const capRes = analyzeMove({ before: capPos, move: capMove, bestEvalCp: 500 });
  ok(capRes.lossCp === 0 && capRes.classification === 'Excellent', 'A02: en iyi alış kayıp 0 → Excellent');
  ok(capRes.playedEvalCp === 500 && capRes.playedBy === 'white', 'A03: oynayan-lehine işaret doğru');

  // ---- A3. kaçan kazanç = Blunder
  const quietMove = pickMove(tq(0, 0), tq(0, 1), generateLegalMoves(capPos));
  const missRes = analyzeMove({ before: capPos, move: quietMove, bestEvalCp: 500 });
  ok(missRes.lossCp === 500 && missRes.classification === 'Blunder', 'A04: 500cp kaçırma → Blunder');

  // ---- A4. mat yapan hamle → Excellent (mat-in-1 düzeneği)
  const matePos = createTestPosition('white', [
    { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const mateMove = pickMove(tq(0, 5), tq(0, 9), generateLegalMoves(matePos));
  const mateRes = analyzeMove({ before: matePos, move: mateMove, bestEvalCp: MATE_SCORE - 1 });
  ok(
    mateRes.playedEvalCp === MATE_SCORE && mateRes.classification === 'Excellent',
    'A05: mat yapan hamle Excellent',
  );

  // ---- A5. pat (Timur kuralı: galibiyet, beraberlik DEĞİL)
  // Düzenek: BK(0,9) köşede; (0,8)'i tutan tek taş ata bağlı.
  // Beyaz N(0,6)→(2,7) oynayınca siyah hamlesiz + şahasız kalır → pat = beyaz kazanır.
  const stalemateBefore = createTestPosition('white', [
    { sq: tq(5, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(1, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(0, 6), kind: PieceKind.Knight, side: 'white' },
  ]);
  const stalemateMove = pickMove(tq(0, 6), tq(2, 7), generateLegalMoves(stalemateBefore));
  const staleRes = analyzeMove({
    before: stalemateBefore,
    move: stalemateMove,
    bestEvalCp: STALEMATE_WIN_SCORE,
  });
  ok(
    staleRes.playedEvalCp === STALEMATE_WIN_SCORE && staleRes.classification === 'Excellent',
    'A06: pat bırakan taraf KAZANIR (stalemate_win skoru)',
  );

  // ---- A6. explain: bedavaya bırakma
  const hangPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 9), kind: PieceKind.Rook, side: 'black' },
  ]);
  const hangMove = pickMove(tq(5, 5), tq(5, 6), generateLegalMoves(hangPos));
  const hangNotes = explainMove(hangPos, hangMove);
  ok(hangNotes.some((n) => n.includes('korumasız')), 'A07: korumasız taş uyarısı üretilir');

  // ---- A7. explain: çatal
  const forkPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(4, 6), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(6, 6), kind: PieceKind.Rook, side: 'black' },
  ]);
  const forkMove = pickMove(tq(3, 3), tq(5, 4), generateLegalMoves(forkPos));
  const forkNotes = explainMove(forkPos, forkMove);
  ok(forkNotes.some((n) => n.includes('çatal')), 'A08: çatal övgüsü üretilir');

  // ---- A8. explain: şah hamlesi atlanır
  const kingNotes = explainMove(hangPos, pickMove(tq(0, 0), tq(0, 1), generateLegalMoves(hangPos)));
  ok(kingNotes.length === 0, 'A09: şah hamlesine not üretilmez');

  // ---- A9. tam oyun (gerçek motor, derinlik 3)
  const engine = new TimurEngine();
  let p0 = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(7, 7), kind: PieceKind.Knight, side: 'black' },
  ]);
  const script: [number, number][] = [
    [tq(5, 5), tq(5, 8)], // 1. K×K
    [tq(7, 7), tq(5, 6)], // 2. At bedavaya gider
    [tq(5, 8), tq(5, 6)], // 3. K×A
    [tq(10, 9), tq(9, 9)], // 4. Şah adımı
    [tq(0, 0), tq(0, 1)], // 5. Şah adımı
    [tq(9, 9), tq(9, 8)], // 6. Şah adımı
  ];
  const gameMoves: Move[] = [];
  for (const [from, to] of script) {
    const mv = pickMove(from, to, generateLegalMoves(p0));
    gameMoves.push(mv);
    p0 = makeMove(p0, mv);
  }
  const p0fresh = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(7, 7), kind: PieceKind.Knight, side: 'black' },
  ]);
  const sharedCache = new Map<string, { bestEvalCp: number }>();
  const report = await analyzeGame(engine, p0fresh, gameMoves, { depth: 3, cache: sharedCache });
  const firstCalls = report.engineCalls;
  ok(report.totalPlies === 6, 'A10: 6 hamle analiz edildi');
  ok(
    report.counts.Excellent + report.counts.Good + report.counts.Inaccuracy +
      report.counts.Mistake + report.counts.Blunder === 6,
    'A11: sınıf sayıları toplamı hamle sayısına eşit',
  );
  ok(report.lines[0].classification === 'Excellent', `A12: asılı kale alışı Excellent (gelen ${report.lines[0].classification})`);
  ok(
    (report.lines[1].classification === 'Mistake' || report.lines[1].classification === 'Blunder') &&
      report.lines[1].explanation !== null &&
      report.lines[1].explanation.includes('korumasız'),
    `A13: bedavaya bırakma Mistake/Blunder + açıklamalı (gelen ${report.lines[1].classification})`,
  );
  ok(
    report.criticalMove !== null && report.criticalMove.ply === 2,
    `A14: kritik an 2. hamle (gelen ${report.criticalMove?.ply})`,
  );
  ok(
    report.whiteAccuracy !== null && report.blackAccuracy !== null &&
      report.whiteAccuracy >= 0 && report.whiteAccuracy <= 100 &&
      report.blackAccuracy >= 0 && report.blackAccuracy <= 100,
    `A15: doğruluklar [0,100] aralığında (B:${report.whiteAccuracy} S:${report.blackAccuracy})`,
  );
  ok(
    (report.whiteAccuracy ?? 0) > (report.blackAccuracy ?? 0),
    'A16: hatasız oynayan beyazın doğruluğu yüksek',
  );

  // ---- A10. cache: ikinci analizde engine'e gidilmez
  const report2 = await analyzeGame(engine, p0fresh, gameMoves, { depth: 3, cache: sharedCache });
  ok(report2.engineCalls === 0, `A17: paylaşımlı cache ikinci turda engine çağrısı yapmaz (gelen ${report2.engineCalls})`);
  ok(
    firstCalls === 6 && JSON.stringify(report2.lines) === JSON.stringify(report.lines),
    `A18: ilk tur 6 engine çağrısı + raporlar özdeş (gelen ${firstCalls})`,
  );

  // ---- A11. rapor formatı (§3.6)
  const text = formatReport(report);
  ok(text.includes('OYUN ANALİZİ') && text.includes('Kritik an: Hamle 2'), 'A19: rapor formatı spec örneğine uyar');
  console.log('\n--- ÖRNEK RAPOR ---\n' + formatReport(report, { verbose: true }));

  console.log(`analyzer: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
