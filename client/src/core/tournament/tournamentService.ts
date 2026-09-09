/**
 * Turnuva Arenası — Supabase CRUD wrapper (MVP iskeleti, Faz 8).
 *
 * Kurallar:
 *  - Supabase yapılandırılmamışsa ASLA throw etmez; `{ data: null, error }`
 *    döner (bkz. roomService.ts deseni).
 *  - Bu servis hamle protokolü / bot / ELO / kural motoruna dokunmaz.
 *  - TournamentModal.tsx statik listesinden bağımsızdır.
 */

import { getSupabase } from '../../lib/supabaseClient';
import { computeStandings, type StandingRow } from './standing';

const NOT_CONFIGURED_ERROR = () =>
  new Error('Turnuva servisi yapılandırılmadı (Supabase bilgileri eksik).');

export type TournamentStatus = 'upcoming' | 'active' | 'ended';

export interface Tournament {
  id: string;
  title: string;
  time_control: string;
  max_players: number;
  status: TournamentStatus;
  starts_at: string | null;
  created_at: string;
}

export interface TournamentPlayer {
  tournament_id: string;
  player_id: string;
  joined_at: string;
  score: number;
}

export async function listTournaments(): Promise<{ data: Tournament[] | null; error: unknown }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('starts_at', { ascending: true, nullsFirst: false });

  if (error) {
    return { data: null, error };
  }
  return { data: (data ?? []) as Tournament[], error: null };
}

export async function listPlayers(
  tournamentId: string,
): Promise<{ data: TournamentPlayer[] | null; error: unknown }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  const { data, error } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false });

  if (error) {
    return { data: null, error };
  }
  return { data: (data ?? []) as TournamentPlayer[], error: null };
}

export async function joinTournament(
  tournamentId: string,
  playerId: string,
): Promise<{ data: TournamentPlayer | null; error: unknown }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  if (!tournamentId || !playerId) {
    return { data: null, error: new Error('tournamentId ve playerId zorunludur.') };
  }

  const { data, error } = await supabase
    .from('tournament_players')
    .insert({
      tournament_id: tournamentId,
      player_id: playerId,
      score: 0,
    })
    .select()
    .single();

  if (error) {
    // 23505 = PK çakışması → zaten kayıtlı.
    if ((error as { code?: string }).code === '23505') {
      return { data: null, error: new Error('Bu turnuvaya zaten kayıtlısın.') };
    }
    return { data: null, error };
  }

  return { data: data as TournamentPlayer, error: null };
}

/**
 * Puan tablosu: players + pairings çekip saf `computeStandings` ile birleştirir.
 *
 * Saf hesaplama service dışında tutulur (bkz. standing.ts); bu fonksiyon
 * sadece veri toplar + birleştirir, sıralama mantığı içermez.
 * Supabase yapılandırılmamışsa ASLA throw etmez; `{ data: null, error }` döner.
 */
export async function getStandings(
  tournamentId: string,
): Promise<{ data: StandingRow[] | null; error: unknown }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  if (!tournamentId) {
    return { data: null, error: new Error('tournamentId zorunludur.') };
  }

  const { data: players, error: playersError } = await listPlayers(tournamentId);
  if (playersError || !players) {
    return { data: null, error: playersError };
  }

  const { data: pairingRows, error: pairingsError } = await supabase
    .from('tournament_pairings')
    .select('white_id, black_id, result')
    .eq('tournament_id', tournamentId);

  if (pairingsError) {
    return { data: null, error: pairingsError };
  }

  const standings = computeStandings(
    players.map((p) => ({ id: p.player_id, score: p.score })),
    ((pairingRows ?? []) as Array<{ white_id: string; black_id: string; result: unknown }>).map(
      (r) => ({
        whiteId: r.white_id,
        blackId: r.black_id,
        result:
          r.result === 'white' || r.result === 'black' || r.result === 'draw'
            ? r.result
            : null,
      }),
    ),
  );

  return { data: standings, error: null };
}
