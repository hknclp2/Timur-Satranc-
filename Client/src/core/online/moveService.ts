import { supabase } from '../../lib/supabaseClient';
import type { OnlineGame } from './roomService';

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
