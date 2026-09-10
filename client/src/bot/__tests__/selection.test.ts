/**
 * Bot — seçim katmanı hedefli testler (ajan-3 teftiş eki, P1 düzeltmeleri):
 *
 *  S1. `engineScore` GÜRÜLTÜSÜZDÜR: `evaluationNoise` havuz sırasını
 *      etkiler ama raporlanan skor, seçilen hamlenin temiz engine
 *      skorudur (worker `evaluationCp`'yi bundan yazar).
 *  S2. `selectMoveWithProfile` manuel ID yapar (worker hattıyla aynı
 *      anlambilim): son TAMAMLANAN derinlik kullanılır, yarım iterasyon
 *      atılır, `Infinity` derinlik MAX_PLY ile sınırlanır.
 *  S3. Aday yoksa hata verir (boş liste davranışı korunur).
 *
 * NOT: `runTests.ts`'e KAYITLI DEĞİL — kayıt bilinçli olarak eklenmedi
 * (ajan-3 görevi). `npx tsc --noEmit` ile derlenir.
 */

import type { Move } from '../../core/move/Move';
import { PieceKind, type Position } from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { MAX_PLY, type ScoredMove } from '../../engine/search';
import { TimurEngine } from '../../engine/timurEngine';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { BOT_PROFILES } from '../profiles';
import {
  applyProfileSelection,
  selectMoveWithProfile,
} from '../selectMoveWithProfile';

/** Deterministik RNG (mulberry32) — diğer bot testleriyle aynı üreteç. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoPosition(): Position {
  return createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
  ]);
}

function cleanScoreOf(scored: ScoredMove[], move: Move): number | null {
  const hit = scored.find((s) => s.move.from === move.from && s.move.to === move.to);
  return hit ? hit.score : null;
}

/** `TimurEngine` yerine geçen kayıtlı stub (ID davranışını senaryolar). */
function stubEngine(
  onDepth: (depth: number) => { scored: ScoredMove[]; completed: boolean },
  log: number[],
): TimurEngine {
  return {
    findTopMoves(_position: Position, opts: { depth: number; movetimeMs?: number }) {
      log.push(opts.depth);
      const r = onDepth(opts.depth);
      return { scored: r.scored, nodes: r.scored.length, completed: r.completed };
    },
  } as unknown as TimurEngine;
}

export function runSelectionTests(): TestSummary {
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
  const pos = demoPosition();

  // ---- S1. engineScore gürültüsüz döner (yüksek gürültü + hata kapalı)
  const legal = generateLegalMoves(pos);
  const synthetic: ScoredMove[] = [10, 9, 8, 7].map((score, i) => ({
    move: legal[i],
    score,
    pv: [legal[i]],
  }));
  const noisyProfile = {
    ...BOT_PROFILES.III,
    evaluationNoise: 5000, // havuz sırasını kesin karıştırır
    mistakeRate: 0,
    blunderRate: 0,
  };
  let consistent = 0;
  const TRIALS = 20;
  for (let s = 1; s <= TRIALS; s++) {
    const pick = applyProfileSelection(synthetic, noisyProfile, pos, seededRng(s));
    const clean = cleanScoreOf(synthetic, pick.move);
    if (pick.engineScore !== null && pick.engineScore === clean) consistent++;
  }
  ok(
    consistent === TRIALS,
    `S01: engineScore 20/20 tohumda temiz skora eşit (gürültü bulaşmadı)`,
  );
  ok(
    synthetic.every((s) => s.score >= 7 && s.score <= 10),
    'S02: sentetik skor aralığı sağlam (test önkoşulu)',
  );

  // ---- S2a. son tamamlanan derinlik kullanılır (derinlik-2, hatasız profil)
  const mk = (idx: number, score: number): ScoredMove => ({
    move: legal[idx],
    score,
    pv: [legal[idx]],
  });
  const logA: number[] = [];
  const stubA = stubEngine(
    (depth) =>
      depth <= 1
        ? { scored: [mk(0, 100), mk(1, 0), mk(2, 0)], completed: true }
        : { scored: [mk(1, 100), mk(0, 0), mk(2, 0)], completed: true },
    logA,
  );
  const pickA = selectMoveWithProfile(stubA, pos, 'V', { maxDepth: 2, movetimeMs: 500 });
  ok(
    pickA.move.from === legal[1].from && pickA.move.to === legal[1].to,
    'S03: tamamlanan derinlik-2 best hamlesi seçilir',
  );
  ok(pickA.kind === 'best' && pickA.engineScore === 100, 'S04: V türü best + temiz skor');

  // ---- S2b. yarım iterasyon atılır (derinlik-2 tamamlanamadı → derinlik-1)
  const logB: number[] = [];
  const stubB = stubEngine(
    (depth) =>
      depth <= 1
        ? { scored: [mk(0, 100), mk(1, 0), mk(2, 0)], completed: true }
        : { scored: [mk(2, 9999), mk(1, 0)], completed: false },
    logB,
  );
  const pickB = selectMoveWithProfile(stubB, pos, 'V', { maxDepth: 2, movetimeMs: 500 });
  ok(
    pickB.move.from === legal[0].from && pickB.move.to === legal[0].to,
    'S05: tamamlanmamış derinlik-2 atılır, derinlik-1 best kullanılır',
  );

  // ---- S2c. Infinity derinlik MAX_PLY ile sınırlanır (V gerçek bütçesi)
  const logC: number[] = [];
  const stubC = stubEngine(
    () => ({ scored: [mk(0, 50), mk(1, 40)], completed: true }),
    logC,
  );
  const pickC = selectMoveWithProfile(stubC, pos, 'V', { movetimeMs: 1000 });
  ok(logC.length > 0 && logC.every((d) => d <= MAX_PLY), 'S06: istenen derinlik hep ≤ MAX_PLY');
  ok(
    pickC.move.from === legal[0].from && pickC.move.to === legal[0].to,
    'S07: Infinity bütçeyle seçim tamamlanır ve son derinliğin best hamlesini döner',
  );

  // ---- S3. aday yoksa hata (boş liste davranışı korunur)
  const stubEmpty = stubEngine(() => ({ scored: [], completed: true }), []);
  let threw = false;
  try {
    selectMoveWithProfile(stubEmpty, pos, 'V', { maxDepth: 2, movetimeMs: 100 });
  } catch {
    threw = true;
  }
  ok(threw, 'S08: aday yoksa hata fırlatılır');

  console.log(`selection: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
