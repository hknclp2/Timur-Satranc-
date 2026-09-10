/**
 * Analiz hattı denetim düzeltmeleri (4. ajan: ANALİZ HATTI uzmanı).
 *
 * Kapsar:
 *  - F1 (P1): `classifyLossDetailed` içinde 'miss' dalının 'mistake' erken
 *    dönüşüyle gölgelenmesi (181-300 aralığı bayraklı iken hiç 'miss' olamıyordu).
 *  - F2 (P1): `generateCoachExplanation` içinde çatal övgüsünün asılı-taş
 *    uyarısını ezmesi (blunder yorumunun içinde "çatal attı!" beliriyordu).
 *
 * Desen: runTests uyumu için `runAnalysisLineFixesTests()` export eder.
 * BİLİNÇLİ OLARAK runTests.ts'e KAYITLI DEĞİLDİR (görev yasağı).
 */

import { PieceKind } from '../../core/position/Position';
import type { Move } from '../../core/move/Move';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { classifyLossDetailed } from '../moveAnalyzer';
import { generateCoachExplanation } from '../explain';

function pickMove(from: number, to: number, moves: Move[]): Move {
  const found = moves.find((m) => m.from === from && m.to === to);
  if (!found) throw new Error(`Test hamlesi bulunamadı: ${from}→${to}`);
  return found;
}

export function runAnalysisLineFixesTests(): TestSummary {
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

  // ---- F1: miss, mistake aralığında da çalışmalı (bayrak varken 181+ → miss)
  ok(
    classifyLossDetailed({ lossCp: 250, ply: 10, opponentBlunderedBefore: true }) === 'miss',
    'L01: 250cp + rakip hatası → miss',
  );
  ok(
    classifyLossDetailed({ lossCp: 250, ply: 10 }) === 'mistake',
    'L02: 250cp bayraksız → mistake (değişmez)',
  );
  ok(
    classifyLossDetailed({ lossCp: 350, ply: 10, opponentBlunderedBefore: true }) === 'miss',
    'L03: 350cp + rakip hatası → miss',
  );
  ok(
    classifyLossDetailed({ lossCp: 350, ply: 10 }) === 'blunder',
    'L04: 350cp bayraksız → blunder (değişmez)',
  );
  ok(
    classifyLossDetailed({ lossCp: 180, ply: 10, opponentBlunderedBefore: true }) === 'mistake',
    'L05: sınır 180 → miss değil',
  );
  ok(
    classifyLossDetailed({ lossCp: 181, ply: 10, opponentBlunderedBefore: true }) === 'miss',
    'L06: 181 → miss',
  );
  ok(
    classifyLossDetailed({ lossCp: 100, ply: 10, opponentBlunderedBefore: true }) === 'inaccuracy',
    'L07: küçük kayıp bayrakla bile miss olmaz',
  );

  // ---- F2: asılı + çatal çakışmasında uyarı övgüyü ezmemeli
  // Düzenek: A(3,3)→(5,4) iki kaleye çatal atar; (5,8)'deki üçüncü kale
  // iniş karesini döver ve beyazın savunması yoktur → hem çatal hem asılı.
  const hungForkPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(4, 6), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(6, 6), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
  ]);
  const forkHung = pickMove(tq(3, 3), tq(5, 4), generateLegalMoves(hungForkPos));
  const hungRes = generateCoachExplanation(hungForkPos, forkHung, 'blunder', null, 400, -400);
  ok((hungRes.tacticalNote ?? '').includes('korumasız'), 'L08: asılı+çatal → taktik not uyarıdır');
  ok(!(hungRes.tacticalNote ?? '').includes('çatal'), 'L09: asılı+çatal → çatal övgüsü yok');
  ok(hungRes.coachComment.includes('korumasız'), 'L10: blunder yorumu uyarıyla tutarlı');

  // Kontrol: salt çatal (asılı değil) hâlâ övülür.
  const forkOnlyPos = createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(4, 6), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(6, 6), kind: PieceKind.Rook, side: 'black' },
  ]);
  const forkOnly = pickMove(tq(3, 3), tq(5, 4), generateLegalMoves(forkOnlyPos));
  const forkRes = generateCoachExplanation(forkOnlyPos, forkOnly, 'great', null, 10, 150);
  ok((forkRes.tacticalNote ?? '').includes('çatal'), 'L11: salt çatal övgüsü korunur');

  console.log(`analysisLineFixes: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
