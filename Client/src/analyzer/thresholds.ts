/**
 * Analyzer — eval-loss eşikleri + doğruluk (saf fonksiyonlar, test edilebilir).
 *
 * Sınıflar (cp, kayıp = bestEval - playedEval, negatif yok):
 *   Excellent  0-20
 *   Good       21-60
 *   Inaccuracy 61-150
 *   Mistake    151-300
 *   Blunder    300+
 *
 * Doğruluk: tek kanonik formül — hamle başına 100*exp(-loss/280)
 * (`gameAnalyzer.ts` ile birleştirildi), oyun doğruluğu = hamle
 * doğruluklarının ortalaması.
 *
 * NOT: `moveAnalyzer.ts` içindeki CLASS_THRESHOLDS ile aynı sınırlar (§7.7);
 * bu modül core/rules'a dokunmadan saf kalan TEK doğruluk kaynağıdır.
 */

export type ThresholdClass = 'Excellent' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';

export const THRESHOLDS = {
  excellentMax: 20,
  goodMax: 60,
  inaccuracyMax: 150,
  mistakeMax: 300,
} as const;

export function classifyLoss(lossCp: number): ThresholdClass {
  if (lossCp <= THRESHOLDS.excellentMax) return 'Excellent';
  if (lossCp <= THRESHOLDS.goodMax) return 'Good';
  if (lossCp <= THRESHOLDS.inaccuracyMax) return 'Inaccuracy';
  if (lossCp <= THRESHOLDS.mistakeMax) return 'Mistake';
  return 'Blunder';
}

/** Tek hamle doğruluğu (0..100). Kayıp negatifse 0 sayılır. */
export function moveAccuracy(lossCp: number): number {
  const loss = Math.max(0, lossCp);
  return 100 * Math.exp(-loss / 280);
}

/**
 * Oyun/renk doğruluğu: hamle doğruluklarının ortalaması (0..100, 1 ondalık).
 * Boş liste → 100 (oynanmamış taraf hatasız sayılır).
 */
export function accuracyFromLosses(losses: number[]): number {
  if (losses.length === 0) return 100;
  const avg = losses.map(moveAccuracy).reduce((a, b) => a + b, 0) / losses.length;
  const clamped = Math.max(0, Math.min(100, avg));
  return Math.round(clamped * 10) / 10;
}
