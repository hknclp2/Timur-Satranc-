/**
 * Online ELO — Supabase erişim katmanı (sadece online, botlara dokunmaz).
 * getSupabase kullanır; Supabase yapılandırılmamışsa graceful `null` döner, ASLA throw etmez.
 */
import { getSupabase } from '../../lib/supabaseClient';
import { START_RATING, updateRatings, type EloResult } from '../rating/elo';

export interface PlayerRating {
  player_id: string;
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  updated_at: string;
}

export type GameWinner = 'white' | 'black' | 'draw';

export interface RatingApplyResult {
  white: PlayerRating;
  black: PlayerRating;
  /** Beyaz perspektifinden değişim (newWhite - oldWhite). */
  delta: number;
}

function emptyResult<T>(): { data: T | null; error: null } {
  return { data: null, error: null };
}

function rowToRating(row: any, playerId: string): PlayerRating {
  return {
    player_id: (row?.player_id as string) ?? playerId,
    rating: typeof row?.rating === 'number' ? row.rating : START_RATING,
    games: typeof row?.games === 'number' ? row.games : 0,
    wins: typeof row?.wins === 'number' ? row.wins : 0,
    draws: typeof row?.draws === 'number' ? row.draws : 0,
    losses: typeof row?.losses === 'number' ? row.losses : 0,
    updated_at: (row?.updated_at as string) ?? new Date().toISOString(),
  };
}

/** Oyuncunun rating satırını okur. Yoksa / Supabase kapalıysa graceful null döner. */
export async function getRating(
  playerId: string
): Promise<{ data: PlayerRating | null; error: any }> {
  try {
    if (!playerId) return emptyResult<PlayerRating>();
    const supabase = getSupabase();
    if (!supabase) return emptyResult<PlayerRating>();

    const { data, error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return emptyResult<PlayerRating>();
    return { data: rowToRating(data, playerId), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/** Rating satırını garanti eder: varsa döndürür, yoksa START_RATING ile oluşturur. */
export async function ensureRating(
  playerId: string
): Promise<{ data: PlayerRating | null; error: any }> {
  try {
    if (!playerId) return emptyResult<PlayerRating>();
    const supabase = getSupabase();
    if (!supabase) return emptyResult<PlayerRating>();

    const existing = await getRating(playerId);
    if (existing.data || existing.error) return existing;

    const { data, error } = await supabase
      .from('player_ratings')
      .insert({ player_id: playerId, rating: START_RATING })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: rowToRating(data, playerId), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Bitmiş bir online oyunun ELO sonucunu iki oyuncuya da uygular.
 * @param gameId online_games.id
 * @param winner 'white' | 'black' | 'draw'
 */
export async function applyGameResult(
  gameId: string,
  winner: GameWinner
): Promise<{ data: RatingApplyResult | null; error: any }> {
  try {
    if (!gameId) return emptyResult<RatingApplyResult>();
    if (winner !== 'white' && winner !== 'black' && winner !== 'draw') {
      return { data: null, error: new Error('Geçersiz sonuç (white/black/draw olmalı).') };
    }
    const supabase = getSupabase();
    if (!supabase) return emptyResult<RatingApplyResult>();

    // 1) Oyunu bul: iki tarafın player_id'si lazım
    const { data: game, error: gameError } = await supabase
      .from('online_games')
      .select('white_player_id, black_player_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return { data: null, error: gameError ?? new Error('Oyun bulunamadı.') };
    }
    const whiteId = (game as any).white_player_id as string | null;
    const blackId = (game as any).black_player_id as string | null;
    if (!whiteId || !blackId) {
      return { data: null, error: new Error('ELO için iki oyuncu gerekli (rakip henüz katılmamış).') };
    }

    // 2) Mevcut ratingleri garanti et
    const [wRes, bRes] = await Promise.all([ensureRating(whiteId), ensureRating(blackId)]);
    if (wRes.error || bRes.error || !wRes.data || !bRes.data) {
      return { data: null, error: wRes.error ?? bRes.error ?? new Error('Rating okunamadı.') };
    }

    // 3) Saf ELO hesabı (maç öncesi games ile)
    const result: EloResult = winner;
    const calc = updateRatings(wRes.data.rating, bRes.data.rating, result, wRes.data.games, bRes.data.games);
    const now = new Date().toISOString();

    const whiteStats =
      result === 'white'
        ? { wins: wRes.data.wins + 1 }
        : result === 'draw'
          ? { draws: wRes.data.draws + 1 }
          : { losses: wRes.data.losses + 1 };
    const blackStats =
      result === 'black'
        ? { wins: bRes.data.wins + 1 }
        : result === 'draw'
          ? { draws: bRes.data.draws + 1 }
          : { losses: bRes.data.losses + 1 };

    // 4) İki satırı da güncelle
    const [{ data: wRow, error: wErr }, { data: bRow, error: bErr }] = await Promise.all([
      supabase
        .from('player_ratings')
        .update({
          rating: calc.newWhite,
          games: wRes.data.games + 1,
          ...whiteStats,
          updated_at: now,
        })
        .eq('player_id', whiteId)
        .select()
        .single(),
      supabase
        .from('player_ratings')
        .update({
          rating: calc.newBlack,
          games: bRes.data.games + 1,
          ...blackStats,
          updated_at: now,
        })
        .eq('player_id', blackId)
        .select()
        .single(),
    ]);

    if (wErr || bErr || !wRow || !bRow) {
      return { data: null, error: wErr ?? bErr ?? new Error('Rating güncellenemedi.') };
    }

    return {
      data: {
        white: rowToRating(wRow, whiteId),
        black: rowToRating(bRow, blackId),
        delta: calc.delta,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}
