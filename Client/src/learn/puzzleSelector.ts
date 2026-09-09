/**
 * Faz 7 — Sıradaki bulmaca seçici (saf fonksiyon).
 *
 * Kural:
 * - Çözülmemiş havuzdan seçer (solvedIds içinde olanı ele).
 * - streak >= 3 → bir üst zorluk (kalanların en zoru).
 * - fail (streak <= 0) → bir alt zorluk (kalanların en kolayı).
 * - ara streak (1-2) → ortanca zorluk.
 *
 * Puzzle tipi LearnPuzzle'dan türetilir; yeni zorunlu alan dayatılmaz.
 * Zorluk: varsa `difficulty`, yoksa listedeki konuma göre 1..3
 * (ilk üçtebir=1, ikinci=2, son=3). Kimlik: varsa `id`, yoksa `title`.
 */

import type { LearnPuzzle } from './learnContent';

/** LearnPuzzle ile uyumlu seçilebilir bulmaca (ek alanlar opsiyonel). */
export type SelectablePuzzle = LearnPuzzle & {
  id?: string;
  difficulty?: number;
};

/** Bulmaca kimliği: explicit id varsa o, yoksa title. */
export function puzzleIdOf(p: SelectablePuzzle): string {
  if (typeof p.id === 'string' && p.id.length > 0) return p.id;
  return p.title;
}

/**
 * Bulmaca zorluğu 1..3:
 * - explicit `difficulty` sonlu sayıysa 1..3 aralığına kelepçelenir (yuvarlanır).
 * - yoksa listedeki sıraya göre üçe bölünerek türetilir.
 */
export function puzzleDifficultyOf(p: SelectablePuzzle, index: number, total: number): number {
  if (typeof p.difficulty === 'number' && Number.isFinite(p.difficulty)) {
    const d = Math.round(p.difficulty);
    return Math.min(3, Math.max(1, d));
  }
  if (!Number.isFinite(total) || total <= 0) return 1;
  const i = Math.min(Math.max(0, Math.floor(index)), Math.max(0, total - 1));
  return Math.min(3, Math.floor((i * 3) / total) + 1);
}

/**
 * Çözülmemiş bulmacalar arasından streak'e göre sıradakini seç.
 * @param solvedIds çözülmüş kimlikler (id veya title)
 * @param allPuzzles tüm havuz (sıra korunur, mutate edilmez)
 * @param streak güncel streak (fail ≈ 0, hot streak >= 3)
 * @returns sıradaki bulmaca veya havuz bittiyse null
 */
export function selectNextPuzzle(
  solvedIds: readonly string[],
  allPuzzles: readonly SelectablePuzzle[],
  streak: number,
): SelectablePuzzle | null {
  if (!allPuzzles || allPuzzles.length === 0) return null;

  const solved = new Set<string>(Array.isArray(solvedIds) ? solvedIds : []);
  const s = Number.isFinite(streak) ? (streak as number) : 0;

  // Çözülmemişler (orijinal sıra + türetilmiş zorluk).
  const unsolved: { puzzle: SelectablePuzzle; difficulty: number }[] = [];
  const total = allPuzzles.length;
  for (let i = 0; i < total; i++) {
    const p = allPuzzles[i];
    if (!p) continue;
    if (solved.has(puzzleIdOf(p))) continue;
    unsolved.push({ puzzle: p, difficulty: puzzleDifficultyOf(p, i, total) });
  }
  if (unsolved.length === 0) return null;

  // Kalanların farklı zorlukları (sıralı).
  const distinct = Array.from(new Set(unsolved.map((u) => u.difficulty))).sort((a, b) => a - b);

  let target: number;
  if (s >= 3) {
    target = distinct[distinct.length - 1]; // bir üst: kalan en zor
  } else if (s <= 0) {
    target = distinct[0]; // fail: kalan en kolay
  } else {
    target = distinct[Math.floor(distinct.length / 2)]; // ara: ortanca
  }

  const hit = unsolved.find((u) => u.difficulty === target);
  return hit ? hit.puzzle : unsolved[0].puzzle;
}
