/**
 * Game Core — Rules: generateLegalMoves / isLegalMove (§7.2 immutable API).
 *
 * İnce kabuk: üretim hattı `pipeline.ts` (`buildLegalMoves`) içindedir;
 * bu dosya SADECE public API'yi korur (davranış değişmez).
 * Sıra garantisi: 0..109 artan, sonra hisar-çıkış (beyaz 111 / siyah 110),
 * sonra KingSwap — bkz. `pipeline.buildLegalMoves`.
 */

import type { Position } from '../position/Position';
import { MoveSpecialFlag, type Move } from '../move/Move';
import { buildLegalMoves } from './pipeline';

export { moveNotation, squareName } from './pipeline';

/**
 * Pozisyonun TÜM legal hamleleri (sıra `sideToMove` tarafına aittir).
 * Piyon terfi türü legacy ile aynı kuraldan gelir (`resolvePawnPromotion`);
 * UI özel terfi seçimi yaparsa `makeMove` öncesi `move.promotion` ezilebilir.
 */
export function generateLegalMoves(position: Position): Move[] {
  return buildLegalMoves(position);
}

/** Hamle, pozisyonda legal mi? (from/to/flags eşleşmesi; terfi TÜRÜ seçimi serbest). */
export function isLegalMove(position: Position, move: Move): boolean {
  if (move.from === move.to) return false;
  const all = generateLegalMoves(position);
  return all.some(
    (m) =>
      m.from === move.from &&
      m.to === move.to &&
      sameFlags(m.specialFlags, move.specialFlags),
  );
}

function sameFlags(a: MoveSpecialFlag[], b: MoveSpecialFlag[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join('|');
  const sb = [...b].sort().join('|');
  return sa === sb;
}
