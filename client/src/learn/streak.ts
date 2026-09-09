/**
 * Faz 7 — Streak + XP bonusu (saf fonksiyonlar).
 *
 * - updateStreak: doğru çözümde +1, yanlışta sıfırla.
 * - xpForStreak: streak başına %10 bonus, maksimum +%50 cap.
 */

/** Doğruysa streak+1, yanlışsa 0. Negatif/NaN girişler 0 sayılır. */
export function updateStreak(streak: number, solved: boolean): number {
  if (!solved) return 0;
  const s = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  return s + 1;
}

/**
 * Streak bonuslu XP: her streak için %10, en fazla +%50.
 * streak 0 → base, streak 3 → base*1.3, streak>=5 → base*1.5.
 */
export function xpForStreak(baseXp: number, streak: number): number {
  const base = Number.isFinite(baseXp) ? Math.max(0, baseXp) : 0;
  const s = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  const bonus = Math.min(s * 0.1, 0.5);
  return Math.round(base * (1 + bonus));
}
