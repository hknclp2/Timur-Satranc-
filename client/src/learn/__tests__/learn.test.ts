/**
 * Faz 7 — Learn testleri: streak + puzzleSelector (saf fonksiyonlar).
 *
 * Çalıştırma: `src/core/__tests__/runTests.ts` entry'si üzerinden
 * (tsc → node; proje build'ine dahil olur).
 */

import { selectNextPuzzle, type SelectablePuzzle } from '../puzzleSelector';
import { updateStreak, xpForStreak } from '../streak';

export interface TestSummary {
  passed: number;
  failed: number;
}

export function runLearnTests(): TestSummary {
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

  // ─── streak: updateStreak ───
  ok(updateStreak(0, true) === 1, 'L01: 0 + doğru → 1');
  ok(updateStreak(2, true) === 3, 'L02: 2 + doğru → 3');
  ok(updateStreak(5, true) === 6, 'L03: 5 + doğru → 6');
  ok(updateStreak(3, false) === 0, 'L04: fail → 0 (sıfırlanır)');
  ok(updateStreak(0, false) === 0, 'L05: 0 + fail → 0');

  // ─── streak: xpForStreak (streak bonusu max +%50) ───
  ok(xpForStreak(100, 0) === 100, 'L06: streak 0 → baz XP');
  ok(xpForStreak(100, 1) === 110, 'L07: streak 1 → +%10');
  ok(xpForStreak(100, 3) === 130, 'L08: streak 3 → +%30');
  ok(xpForStreak(100, 5) === 150, 'L09: streak 5 → +%50 cap');
  ok(xpForStreak(100, 10) === 150, 'L10: streak 10 → hâlâ +%50 (cap aşılmaz)');
  ok(xpForStreak(200, 5) === 300, 'L11: 200 baz + cap → 300');
  ok(xpForStreak(0, 5) === 0, 'L12: 0 baz → 0');

  // ─── selector: explicit difficulty havuzu ───
  const pool: SelectablePuzzle[] = [
    { title: 'P1', desc: 'd1', difficulty: 1 },
    { title: 'P2', desc: 'd2', difficulty: 1 },
    { title: 'P3', desc: 'd3', difficulty: 2 },
    { title: 'P4', desc: 'd4', difficulty: 2 },
    { title: 'P5', desc: 'd5', difficulty: 3 },
    { title: 'P6', desc: 'd6', difficulty: 3 },
  ];

  const easyPick = selectNextPuzzle([], pool, 0);
  ok(easyPick !== null && easyPick.title === 'P1', 'L13: fail (0) → en kolay ilk (P1)');

  const hardPick = selectNextPuzzle([], pool, 3);
  ok(hardPick !== null && hardPick.title === 'P5', 'L14: streak>=3 → en zor ilk (P5)');

  const midPick = selectNextPuzzle([], pool, 1);
  ok(midPick !== null && midPick.title === 'P3', 'L15: ara streak → ortanca (P3)');

  ok(selectNextPuzzle(pool.map((p) => p.title), pool, 5) === null, 'L16: hepsi çözüldü → null');
  ok(selectNextPuzzle([], [], 2) === null, 'L17: boş havuz → null');

  const afterSolve = selectNextPuzzle(['P1'], pool, 0);
  ok(afterSolve !== null && afterSolve.title === 'P2', 'L18: çözülmüş elenir (P1 sonrası P2)');

  // Zor tier tükenince hot-streak kalan en zora düşer (fallback).
  const hardGone = selectNextPuzzle(['P5', 'P6'], pool, 9);
  ok(
    hardGone !== null && (hardGone.title === 'P3' || hardGone.title === 'P4'),
    'L19: zorlar bitikse hot-streak kalan en zora (P3/P4)',
  );

  // ─── selector: difficulty'siz LearnPuzzle (konumdan türetme) ───
  const plain: SelectablePuzzle[] = [
    { title: 'A', desc: 'x' },
    { title: 'B', desc: 'x' },
    { title: 'C', desc: 'x' },
    { title: 'D', desc: 'x' },
    { title: 'E', desc: 'x' },
    { title: 'F', desc: 'x' },
  ];
  const plainEasy = selectNextPuzzle([], plain, 0);
  ok(plainEasy !== null && plainEasy.title === 'A', 'L20: türetilmiş kolay → ilk (A)');
  const plainHard = selectNextPuzzle([], plain, 4);
  ok(plainHard !== null && plainHard.title === 'E', 'L21: türetilmiş zor → son üçtebir ilk (E)');

  // ─── saflık: girişler mutate edilmez ───
  const solvedIds = ['P1'];
  const beforePool = JSON.stringify(pool);
  const beforeSolved = JSON.stringify(solvedIds);
  selectNextPuzzle(solvedIds, pool, 2);
  ok(JSON.stringify(pool) === beforePool && JSON.stringify(solvedIds) === beforeSolved, 'L22: saf fonksiyon (mutate yok)');

  console.log(`learn: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
