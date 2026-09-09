import type { OnlineGame } from './roomService';

/**
 * Faz 2 — Online protokol event tipleri.
 * Realtime / servis katmanında ortak dil olarak kullanılır.
 * Supabase şemasını değiştirmez; sadece tip + helper sağlar.
 */
export type OnlineProtocolEventType =
  | 'move'
  | 'draw_offer'
  | 'draw_accept'
  | 'draw_decline'
  | 'takeback_offer'
  | 'rematch_offer'
  | 'resign'
  | 'abort'
  | 'timeout';

export interface OnlineProtocolEvent {
  type: OnlineProtocolEventType;
  gameId: string;
  /** Teklifi / hamleyi yapan tarafın rengi (mümkünse). */
  actorColor?: 'white' | 'black' | null;
  /** Teklifi yapan oyuncu id'si (anonim timur_player_id de olabilir). */
  actorId?: string | null;
  createdAt: string;
  /** Teklifin sona erme zamanı (ISO). Yoksa OFFER_TTL_MS ile hesaplanır. */
  expiresAt?: string | null;
}

export interface OnlineGameProtocolExtension {
  draw_offer_by: string | null;
  takeback_offer_by: string | null;
  rematch_offer_by: string | null;
  rematch_of: string | null;
}

/** OnlineGame + Faz 2 protokol alanları (kısmi — eski satırlarda null/undefined olabilir). */
export type OnlineGameWithProtocol = OnlineGame & Partial<OnlineGameProtocolExtension>;

/** Tekliflerin varsayılan geçerlilik süresi (60 sn). */
export const OFFER_TTL_MS = 60_000;

/**
 * Teklif süresi doldu mu?
 * - `createdAt` yoksa/parse edilemiyorsa süresi dolmuş sayılır (aktif teklif yok).
 * - `nowMs` verilmezse Date.now() kullanılır.
 */
export function isOfferExpired(
  createdAt: string | null | undefined,
  nowMs: number = Date.now(),
  ttlMs: number = OFFER_TTL_MS,
): boolean {
  if (!createdAt) return true;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return true;
  return nowMs - created > ttlMs;
}
