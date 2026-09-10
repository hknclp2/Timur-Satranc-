/**
 * Bot — profilli hamle seçimi (docs/mimari.md §3.5 + §7.5).
 *
 * Akış (spec birebir):
 *  1. Engine kök adayları skorlar (sıralı).
 *  2. Aday skorlarına ±`evaluationNoise` gürültüsü eklenir, yeniden sıralanır.
 *  3. En iyi `candidateLimit` hamle aday havuzuna alınır.
 *  3b. Anında-mat koruması (Faz 4, Profil I HARİÇ): rakibe tek hamlelik mat
 *      (veya patsı-kayıp) veren havuz hamlesi elenir (sığ engine yoklamasıyla;
 *      havuz boşalırsa elenmemiş havuza dönülür).
 *  4. Zar atılır: `blunderRate` → rastgele legal hamle; yoksa `mistakeRate` →
 *     havuz-DIŞI rastgele legal hamle (yoksa havuza dönülür); yoksa profildeki
 *     ağırlıklı dağılımla havuzdan seçim — açılışta (`isOpening`) ise havuzdan
 *     uniform seçim (açılış çeşitliliği).
 *
 * Zayıf bot tamamen rastgele OYNAMAZ — havuz Engine'in en iyileridir, seçim
 * olasılıksaldır (eğitsel "insan gibi hata" simülasyonu).
 */

import type { Move } from '../core/move/Move';
import type { Position } from '../core/position/Position';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import { makeMove } from '../core/rules/makeMove';
import { MATE_SCORE, MAX_PLY, scoreRootMoves, STALEMATE_WIN_SCORE, type ScoredMove } from '../engine/search';
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
  /**
   * Açılış çeşitliliği (Faz 4): ilk ~6 hamlede çağrıcı true verir
   * (örn. `position.flags.fullMoveNumber <= 3`); havuz-içi seçim ağırlıklı
   * yerine uniform yapılır. Hata zarları (blunder/mistake) aynen çalışır.
   */
  isOpening?: boolean;
}

/** `applyProfileSelection` için seçim opsiyonları (SelectOptions'un enginesiz alt kümesi). */
export interface ApplyOptions {
  isOpening?: boolean;
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
  // Worker hattıyla aynı anlambilim (engineWorker.handleFindBestMove):
  // MANUEL iterative deepening — SON TAMAMLANAN derinliğin adayları
  // kullanılır, yarım iterasyon atılır. Tek-derinlikli çağrı YOK
  // (fail-soft bound'lı kısmi liste havuzu kirletirdi; V'in
  // maxDepth=Infinity değeri burada MAX_PLY ile sınırlanır).
  const maxDepth = Math.max(1, Math.min(Math.floor(opts.maxDepth ?? profile.maxDepth), MAX_PLY));
  const movetimeMs = opts.movetimeMs ?? profile.movetimeMs;
  const deadline = Date.now() + Math.max(1, movetimeMs);

  let last: ScoredMove[] | null = null;
  let fallback: ScoredMove[] | null = null;
  for (let d = 1; d <= maxDepth; d++) {
    if (Date.now() > deadline) break;
    const r = engine.findTopMoves(position, {
      depth: d,
      movetimeMs: Math.max(1, deadline - Date.now()),
    });
    if (r.scored.length === 0) break; // hamle yok
    if (fallback === null) fallback = r.scored;
    if (r.completed) {
      last = r.scored;
      let best = -Infinity;
      for (const s of r.scored) if (s.score > best) best = s.score;
      if (best > MATE_SCORE - MAX_PLY) break; // zorunlu mat
    } else {
      break; // yarım iterasyon atılır, önceki tamamlanan kullanılır
    }
  }
  const scored = last ?? fallback;
  if (!scored || scored.length === 0) {
    throw new Error(`selectMoveWithProfile: ${profileId} için aday hamle yok`);
  }
  return applyProfileSelection(scored, profile, position, opts.rng ?? Math.random, {
    isOpening: opts.isOpening,
  });
}

/**
 * Aday hamle rakibe ANINDA kayıp hediye ediyor mu? Hamle uygulanır, rakip
 * 1-ply yoklanır: en iyi rakip skoru patsı-kayıp eşiğindeyse rakip tek
 * hamlede mat (veya patsı-galibiyet) buluyor demektir. `scoreRootMoves`
 * pozisyonu klonlar — girdi kirlenmez.
 */
function givesOpponentInstantLoss(position: Position, move: Move): boolean {
  let after: Position;
  try {
    after = makeMove(position, move);
  } catch {
    return false; // uygulanamayan aday zaten havuzda barınamaz (üst katman eler)
  }
  const r = scoreRootMoves(after, 1);
  let best = -Infinity;
  for (const s of r.scored) {
    if (s.score > best) best = s.score;
  }
  return best >= STALEMATE_WIN_SCORE - MAX_PLY;
}

/**
 * Skorlanmış aday havuzuna profil seçimini uygular (saf fonksiyon — engine
 * YOK). Worker kendi ID döngüsünü koşup son tamamlanan derinliğin skorlarıyla
 * bunu çağırır; `selectMoveWithProfile` aynı ID döngüsünün senkron kısayoludur.
 */
export function applyProfileSelection(
  scored: ScoredMove[],
  profile: BotProfile,
  position: Position,
  rng: () => number = Math.random,
  opts: ApplyOptions = {},
): SelectedMove {
  if (scored.length === 0) {
    throw new Error(`applyProfileSelection: ${profile.id} için aday hamle yok`);
  }

  // 1. Gürültü + sıralama. Temiz skorlar ayrı tutulur — `engineScore`
  //    her zaman GÜRÜLTÜSÜZ döner (worker `evaluationCp`'yi bundan yazar).
  const cleanByMove = new Map(scored.map((s) => [s.move, s.score] as [Move, number]));
  const cleanScoreOf = (m: Move): number | null => cleanByMove.get(m) ?? null;
  const noisy: ScoredMove[] = scored.map((s) => ({
    ...s,
    score: s.score + (rng() * 2 - 1) * profile.evaluationNoise,
  }));
  noisy.sort((a, b) => b.score - a.score);

  // 2. Aday havuzu.
  let pool = noisy.slice(0, Math.max(1, Math.min(profile.candidateLimit, noisy.length)));

  // 2b. Anında-mat koruması (Profil I hariç): rakibe tek hamlelik kayıp
  //      veren havuz hamlesini ele. Tek adayda yoklama anlamsız (alternatif
  //      yok) — atlanır. Havuz boşalırsa elenmemiş havuza dönülür.
  if (profile.id !== 'I' && pool.length > 1) {
    const guarded = pool.filter((s) => !givesOpponentInstantLoss(position, s.move));
    if (guarded.length > 0) pool = guarded;
  }
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

  // 5. Havuzdan seçim: açılışta uniform (çeşitlilik), yoksa ağırlıklı.
  //    `kind` bilerek 'weighted' kalır (EngineInterface.selection aynası).
  if (opts.isOpening && pool.length > 1) {
    const picked = pickUniform(pool, rng);
    return {
      move: picked.move,
      kind: 'weighted',
      candidateCount: pool.length,
      engineScore: cleanScoreOf(picked.move),
    };
  }
  const weights = profile.weights.slice(0, pool.length);
  const picked = pool.length === 1 ? pool[0] : pickWeighted(pool, weights, rng);
  return {
    move: picked.move,
    kind: profile.candidateLimit === 1 ? 'best' : 'weighted',
    candidateCount: pool.length,
    engineScore: cleanScoreOf(picked.move),
  };
}
