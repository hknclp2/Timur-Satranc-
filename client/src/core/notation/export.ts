/**
 * Faz 9 — Timur PGN / JSON dışa aktarım (ek modül).
 *
 * - Mevcut `notation/index.ts`'e DOKUNMAZ; sadece okur (boardToFEN).
 * - 112-kare SAN kullanır: `moves[].notation` aynen korunur, yeni format dayatılmaz
 *   (e4, Zf4, Mxg6, Hisar(S)/Hisar(B) vb. olduğu gibi yazılır).
 * - `exportToJSON` / `parseFromJSON`: SetupPosition (BoardMatrix 10x11 + hisarlar
 *   = 112 mantıksal kare) round-trip yapar; FEN sadece bilgi amaçlı gömülür.
 */

import { boardToFEN } from './index';
import type { BoardMatrix, CitadelState, PlayerColor } from '../../types/chess';
import type { SetupPosition } from '../setup/setupTypes';

export interface TimurPGNMove {
  notation: string;
  player: PlayerColor;
  moveNumber: number;
}

export interface TimurPGNMeta {
  event?: string;
  site?: string;
  date?: string;
  white?: string;
  black?: string;
  /** 'white' | 'black' | 'draw' veya PGN sonucu ('1-0','0-1','1/2-1/2','*'). */
  result?: string;
  /** Açılış FEN'i (11x10+hisar Timur FEN'i); verilirse header'a yazılır. */
  fen?: string;
}

export interface TimurJSONEnvelope {
  version: 1;
  variant: 'timur';
  board: BoardMatrix;
  citadels: CitadelState;
  startingTurn: PlayerColor;
  fen: string;
}

function escapePGNHeader(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeResult(result?: string): string {
  if (!result) return '*';
  const r = result.trim();
  if (r === '1-0' || r === '0-1' || r === '1/2-1/2' || r === '*') return r;
  const lower = r.toLowerCase();
  if (lower === 'white') return '1-0';
  if (lower === 'black') return '0-1';
  if (lower === 'draw') return '1/2-1/2';
  return '*';
}

function todayDate(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * 112-kare SAN listesinden Timur PGN metni üretir.
 * Hamleler moveNumber'a göre gruplanır (beyaz önce, siyah sonra).
 */
export function exportToTimurPGN(moves: TimurPGNMove[], meta: TimurPGNMeta = {}): string {
  const event = meta.event ?? 'Timur Satrancı';
  const site = meta.site ?? '?';
  const date = meta.date ?? todayDate();
  const white = meta.white ?? '?';
  const black = meta.black ?? '?';
  const result = normalizeResult(meta.result);

  const headers: string[] = [
    `[Event "${escapePGNHeader(event)}"]`,
    `[Site "${escapePGNHeader(site)}"]`,
    `[Date "${escapePGNHeader(date)}"]`,
    `[White "${escapePGNHeader(white)}"]`,
    `[Black "${escapePGNHeader(black)}"]`,
    `[Result "${escapePGNHeader(result)}"]`,
    `[Variant "Timur"]`,
    `[Board "11x10+2"]`,
  ];
  if (meta.fen) {
    headers.push(`[FEN "${escapePGNHeader(meta.fen)}"]`);
  }

  if (!moves || moves.length === 0) {
    return `${headers.join('\n')}\n\n${result}`;
  }

  // 112-kare SAN aynen korunur: sadece trim, sıralama moveNumber+renk ile.
  const cleaned = moves
    .filter((m) => m && typeof m.notation === 'string' && m.notation.trim().length > 0)
    .map((m) => ({ notation: m.notation.trim(), player: m.player, moveNumber: m.moveNumber }))
    .sort((a, b) => {
      if (a.moveNumber !== b.moveNumber) return a.moveNumber - b.moveNumber;
      if (a.player === b.player) return 0;
      return a.player === 'white' ? -1 : 1;
    });

  const byNumber = new Map<number, { white?: string; black?: string }>();
  for (const m of cleaned) {
    let entry = byNumber.get(m.moveNumber);
    if (!entry) {
      entry = {};
      byNumber.set(m.moveNumber, entry);
    }
    if (m.player === 'white') {
      entry.white = entry.white === undefined ? m.notation : `${entry.white} ${m.notation}`;
    } else {
      entry.black = entry.black === undefined ? m.notation : `${entry.black} ${m.notation}`;
    }
  }

  const numbers = [...byNumber.keys()].sort((a, b) => a - b);
  const parts: string[] = [];
  for (const n of numbers) {
    const entry = byNumber.get(n) as { white?: string; black?: string };
    let token = `${n}.`;
    if (entry.white !== undefined) token += ` ${entry.white}`;
    if (entry.black !== undefined) token += ` ${entry.black}`;
    parts.push(token);
  }
  parts.push(result);

  return `${headers.join('\n')}\n\n${parts.join(' ')}`;
}

/**
 * SetupPosition'u JSON metnine çevirir (FEN bilgi amaçlı gömülür).
 */
export function exportToJSON(position: SetupPosition): string {
  const fen = boardToFEN(position.board, position.citadels, position.startingTurn);
  const envelope: TimurJSONEnvelope = {
    version: 1,
    variant: 'timur',
    board: position.board,
    citadels: position.citadels,
    startingTurn: position.startingTurn,
    fen,
  };
  return JSON.stringify(envelope);
}

function isBoardMatrix(value: unknown): value is BoardMatrix {
  if (!Array.isArray(value) || value.length !== 10) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 11) return false;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      if (typeof cell !== 'object') return false;
      const piece = cell as Record<string, unknown>;
      if (typeof piece.type !== 'string' || typeof piece.color !== 'string') return false;
      if (piece.color !== 'white' && piece.color !== 'black') return false;
    }
  }
  return true;
}

function isCitadelState(value: unknown): value is CitadelState {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (!('whiteCitadelPiece' in c) || !('blackCitadelPiece' in c)) return false;
  for (const key of ['whiteCitadelPiece', 'blackCitadelPiece'] as const) {
    const slot = c[key];
    if (slot === null || slot === undefined) continue;
    if (typeof slot !== 'object') return false;
    const piece = slot as Record<string, unknown>;
    if (typeof piece.type !== 'string' || typeof piece.color !== 'string') return false;
    if (piece.color !== 'white' && piece.color !== 'black') return false;
  }
  return true;
}

/**
 * exportToJSON çıktısını geri okur. Bozuk girişte throw ETMEZ, null döner.
 */
export function parseFromJSON(json: string): SetupPosition | null {
  try {
    if (typeof json !== 'string' || json.trim().length === 0) return null;
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return null;

    // Zarf (version/variant/fen) varsa doğrula, yoksa çıplak pozisyonu da kabul et.
    const body = ('board' in parsed && 'citadels' in parsed && 'startingTurn' in parsed
      ? parsed
      : null) as Record<string, unknown> | null;
    if (!body) return null;

    if (!isBoardMatrix(body.board)) return null;
    if (!isCitadelState(body.citadels)) return null;
    if (body.startingTurn !== 'white' && body.startingTurn !== 'black') return null;

    return {
      board: body.board as BoardMatrix,
      citadels: body.citadels as CitadelState,
      startingTurn: body.startingTurn as PlayerColor,
    };
  } catch {
    return null;
  }
}
