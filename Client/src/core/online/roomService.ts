import { supabase } from '../../lib/supabaseClient';
import { createInitialBoardSetup } from '../engine/boardSetup';

export interface OnlineGame {
  id: string;
  code: string;
  white_player_id: string;
  black_player_id: string | null;
  white_name: string;
  black_name: string | null;
  status: 'waiting' | 'active' | 'ended';
  current_turn: 'white' | 'black';
  board_state: any;
  citadels_state: any;
  captured_pieces: { white: any[]; black: any[] };
  has_used_king_swap: { white: boolean; black: boolean };
  turn_number: number;
  half_move_clock: number;
  winner: 'white' | 'black' | 'draw' | null;
  end_reason: string | null;
  status_reason: string | null;
  last_move: { from: any; to: any; notation: string; player: 'white' | 'black' } | null;
  move_count: number;
  created_at: string;
  updated_at: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    suffix += CODE_ALPHABET[idx];
  }
  return `TM${suffix}`;
}

function normalizeCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

function isValidCode(code: string): boolean {
  return code.length === 6;
}

export async function createRoom(
  whitePlayerId: string,
  whiteName: string
): Promise<{ data: OnlineGame | null; error: any }> {
  const { board, citadels } = createInitialBoardSetup();

  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
      .from('online_games')
      .insert({
        code,
        white_player_id: whitePlayerId,
        black_player_id: null,
        white_name: whiteName,
        black_name: null,
        status: 'waiting',
        current_turn: 'white',
        board_state: board,
        citadels_state: citadels,
        captured_pieces: { white: [], black: [] },
        has_used_king_swap: { white: false, black: false },
        turn_number: 1,
        half_move_clock: 0,
        winner: null,
        end_reason: null,
        status_reason: null,
        last_move: null,
        move_count: 0,
      })
      .select()
      .single();

    if (!error) {
      return { data: data as OnlineGame, error: null };
    }

    lastError = error;

    // 23505 = unique violation (code collision) -> retry
    if ((error as any)?.code !== '23505') {
      return { data: null, error };
    }
  }

  return { data: null, error: lastError };
}

export async function findRoom(
  code: string
): Promise<{ data: OnlineGame | null; error: any }> {
  const normalized = normalizeCode(code);

  if (!isValidCode(normalized)) {
    return { data: null, error: new Error('Oda kodu 6 karakter olmali (ornek: TMAB12).') };
  }

  const { data, error } = await supabase
    .from('online_games')
    .select('*')
    .eq('code', normalized)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as OnlineGame, error: null };
}

export async function joinRoom(
  code: string,
  playerId: string,
  playerName: string
): Promise<{ data: OnlineGame | null; error: any }> {
  const normalized = normalizeCode(code);

  if (!isValidCode(normalized)) {
    return { data: null, error: new Error('Oda kodu 6 karakter olmali (ornek: TMAB12).') };
  }

  // 1) Odayi bul
  const { data: room, error: findError } = await supabase
    .from('online_games')
    .select('*')
    .eq('code', normalized)
    .single();

  if (findError || !room) {
    return { data: null, error: findError ?? new Error('Oda bulunamadi.') };
  }

  const game = room as OnlineGame;

  // 2) waiting kontrolu
  if (game.status !== 'waiting') {
    return { data: null, error: new Error('Oda artik katilima kapali.') };
  }

  // 3) Kendi odasina katilma engeli
  if (game.white_player_id === playerId) {
    return { data: null, error: new Error('Kendi odana katilamazsin.') };
  }

  // 4) Race korumasi: sadece status hala 'waiting' ise guncelle
  const { data: updated, error: updateError } = await supabase
    .from('online_games')
    .update({
      black_player_id: playerId,
      black_name: playerName,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', game.id)
    .eq('status', 'waiting')
    .select()
    .single();

  if (updateError || !updated) {
    return {
      data: null,
      error: updateError ?? new Error('Oda baska bir oyuncu tarafindan alindi.'),
    };
  }

  return { data: updated as OnlineGame, error: null };
}
