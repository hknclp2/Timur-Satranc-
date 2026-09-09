import { getSupabase } from '../../lib/supabaseClient';
import type { OnlineGame } from './roomService';

const NOT_CONFIGURED_ERROR = () =>
  new Error('Çevrim içi oyun yapılandırılmadı (Supabase bilgileri eksik).');

export interface OnlineMoveData {
  board_state: any;
  citadels_state: any;
  captured_pieces: { white: any[]; black: any[] };
  current_turn: 'white' | 'black';
  turn_number: number;
  move_count: number;
  last_move: { from: any; to: any; notation: string; player: 'white' | 'black' };
  player: 'white' | 'black';
  from: any;
  to: any;
  notation: string;
  /** Hamleyi yapan taşın tipi (SQL NOT NULL — board snapshot'ından türetilir). */
  piece_type: string;
  captured_piece_type?: string | null;
  promotion?: string | null;
  is_check?: boolean;
  is_checkmate?: boolean;
}

export async function sendMove(
  gameId: string,
  move: OnlineMoveData
): Promise<{ data: any | null; error: any }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  // 1) Once online_games update
  const { data: updatedGame, error: updateError } = await supabase
    .from('online_games')
    .update({
      board_state: move.board_state,
      citadels_state: move.citadels_state,
      captured_pieces: move.captured_pieces,
      current_turn: move.current_turn,
      turn_number: move.turn_number,
      move_count: move.move_count,
      last_move: move.last_move,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  // 2) Sonra online_moves insert (şema: plan ADIM 4 SQL ile birebir)
  const { data: insertedMove, error: insertError } = await supabase
    .from('online_moves')
    .insert({
      game_id: gameId,
      move_number: move.move_count,
      player_color: move.player,
      from_pos: move.from,
      to_pos: move.to,
      piece_type: move.piece_type,
      captured_piece_type: move.captured_piece_type ?? null,
      promotion: move.promotion ?? null,
      notation: move.notation,
      is_check: move.is_check ?? false,
      is_checkmate: move.is_checkmate ?? false,
      board_state_after: move.board_state,
      citadels_state_after: move.citadels_state,
      captured_pieces_after: move.captured_pieces,
    })
    .select()
    .single();

  if (insertError) {
    return { data: null, error: insertError };
  }

  return { data: { game: updatedGame as OnlineGame, move: insertedMove }, error: null };
}

export async function updateGameStatus(
  gameId: string,
  updates: Partial<OnlineGame>
): Promise<{ data: OnlineGame | null; error: any }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  const { data, error } = await supabase
    .from('online_games')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as OnlineGame, error: null };
}

export async function fetchMoveHistory(
  gameId: string
): Promise<{ data: any[] | null; error: any }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: NOT_CONFIGURED_ERROR() };
  }

  const { data, error } = await supabase
    .from('online_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return { data: data as any[], error: null };
}

// ─── Faz 2 — Online protokol: teklif / abort servisleri ──────────────
// NOT: updateGameStatus wrapper kullanılır; updated_at otomatik yazılır.
// Yeni kolonlar (draw_offer_by vb.) migration 02 ile gelir; eski satırlarda
// null olabilir. roomService.OnlineGame tipine dokunmadan `as` cast ile
// ilerlenir (tip genişletmesi protocol.ts'teki OnlineGameWithProtocol'tadır).

export async function sendDrawOffer(
  gameId: string,
  offeredBy: string
): Promise<{ data: OnlineGame | null; error: any }> {
  return updateGameStatus(gameId, {
    draw_offer_by: offeredBy,
  } as Partial<OnlineGame>);
}

export async function respondDrawOffer(
  gameId: string,
  accept: boolean
): Promise<{ data: OnlineGame | null; error: any }> {
  if (accept) {
    return updateGameStatus(gameId, {
      status: 'ended',
      winner: 'draw',
      end_reason: 'agreement',
      status_reason: 'agreement',
      draw_offer_by: null,
    } as Partial<OnlineGame>);
  }
  return updateGameStatus(gameId, {
    draw_offer_by: null,
  } as Partial<OnlineGame>);
}

export async function sendTakebackOffer(
  gameId: string,
  offeredBy: string
): Promise<{ data: OnlineGame | null; error: any }> {
  return updateGameStatus(gameId, {
    takeback_offer_by: offeredBy,
  } as Partial<OnlineGame>);
}

export async function sendRematchOffer(
  gameId: string,
  offeredBy: string
): Promise<{ data: OnlineGame | null; error: any }> {
  return updateGameStatus(gameId, {
    rematch_offer_by: offeredBy,
  } as Partial<OnlineGame>);
}

export async function abortGame(
  gameId: string,
  reason = 'abort'
): Promise<{ data: OnlineGame | null; error: any }> {
  return updateGameStatus(gameId, {
    status: 'ended',
    winner: null,
    end_reason: reason,
    status_reason: reason,
  });
}
