/**
 * Bot — profilli hamle seçimi (docs/mimari.md §3.5 + §7.5).
 *
 * Akış (spec birebir):
 *  1. Engine kök adayları skorlar (sıralı).
 *  2. Aday skorlarına ±`evaluationNoise` gürültüsü eklenir, yeniden sıralanır.
 *  3. En iyi `candidateLimit` hamle aday havuzuna alınır.
 *  4. Zar atılır: `blunderRate` → rastgele legal hamle; yoksa `mistakeRate` →
 *     havuz-DIŞI rastgele legal hamle (yoksa havuza dönülür); yoksa profildeki
 *     ağırlıklı dağılımla havuzdan seçim.
 *
 * Zayıf bot tamamen rastgele OYNAMAZ — havuz Engine'in en iyileridir, seçim
 * olasılıksaldır (eğitsel "insan gibi hata" simülasyonu).
 */

import type { Move } from '../core/move/Move';
import type { Position } from '../core/position/Position';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import type { ScoredMove } from '../engine/search';
import type { TimurEngine } from '../engine/timurEngine';
import { BOT_PROFILES, type BotProfile, type BotProfileId } from './profiles';

export type SelectionKind = 'best' | 'weighted' | 'mistake' | 'blunder';

export interface SelectedMove {
  move: Move;
  kind: SelectionKind;
  /** Gürültü SONRASI sıralamada havuzun büyüklüğü. */
  candidateCount: number;
  /** Seçilen hamlenin gürültüsüz engine skoru (biliniyorsa). */
  engineScore: number | null;
}

export interface SelectOptions {
  /** Test/hız için profil bütçesini ezer (gerçek oyunda VERİLMEZ). */
  movetimeMs?: number;
  /** Test/hız için profil derinliğini ezer (gerçek oyunda VERİLMEZ). */
  maxDepth?: number;
  /** Rastgelelik kaynağı (varsayılan Math.random; testte seed'li). */
  rng?: () => number;
}

function moveKey(m: Move): string {
  return `${m.from}>${m.to}`;
}

function pickWeighted<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

function pickUniform<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

export function selectMoveWithProfile(
  engine: TimurEngine,
  position: Position,
  profileId: BotProfileId,
  opts: SelectOptions = {},
): SelectedMove {
  const profile = BOT_PROFILES[profileId];
  const depth = opts.maxDepth ?? profile.maxDepth;
  const movetimeMs = opts.movetimeMs ?? profile.movetimeMs;

  const { scored } = engine.findTopMoves(position, { depth, movetimeMs });
  if (scored.length === 0) {
    throw new Error(`selectMoveWithProfile: ${profileId} için aday hamle yok`);
  }
  return applyProfileSelection(scored, profile, position, opts.rng ?? Math.random);
}

/**
 * Skorlanmış aday havuzuna profil seçimini uygular (saf fonksiyon — engine
 * YOK). Worker kendi ID döngüsünü koşup son tamamlanan derinliğin skorlarıyla
 * bunu çağırır; `selectMoveWithProfile` ise tek derinlikli kısayoldur.
 */
export function applyProfileSelection(
  scored: ScoredMove[],
  profile: BotProfile,
  position: Position,
  rng: () => number = Math.random,
): SelectedMove {
  if (scored.length === 0) {
    throw new Error(`applyProfileSelection: ${profile.id} için aday hamle yok`);
  }

  // 1. Gürültü + sıralama.
  const noisy: ScoredMove[] = scored.map((s) => ({
    ...s,
    score: s.score + (rng() * 2 - 1) * profile.evaluationNoise,
  }));
  noisy.sort((a, b) => b.score - a.score);

  // 2. Aday havuzu.
  const pool = noisy.slice(0, Math.max(1, Math.min(profile.candidateLimit, noisy.length)));
  const poolKeys = new Set(pool.map((s) => moveKey(s.move)));

  // 3. Blunder: tamamen rastgele legal hamle.
  const legal = generateLegalMoves(position);
  if (rng() < profile.blunderRate && legal.length > 0) {
    return { move: pickUniform(legal, rng), kind: 'blunder', candidateCount: pool.length, engineScore: null };
  }

  // 4. Mistake: havuz-dışı rastgele legal hamle (yoksa havuza dön).
  const outside = legal.filter((m) => !poolKeys.has(moveKey(m)));
  if (outside.length > 0 && rng() < profile.mistakeRate) {
    return { move: pickUniform(outside, rng), kind: 'mistake', candidateCount: pool.length, engineScore: null };
  }

  // 5. Ağırlıklı seçim (havuz dağılım önekine göre).
  const weights = profile.weights.slice(0, pool.length);
  const picked = pool.length === 1 ? pool[0] : pickWeighted(pool, weights, rng);
  return {
    move: picked.move,
    kind: profile.candidateLimit === 1 ? 'best' : 'weighted',
    candidateCount: pool.length,
    engineScore: picked.score,
  };
}
