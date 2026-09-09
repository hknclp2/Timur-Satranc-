/**
 * Game Core — Rules: isCheck / isGameOver / getGameResult (§7.2 immutable API).
 *
 * moveRules.ts:736-815 `calculateGameStatus` portu:
 *  - Hisar: rakip hisardaki Şah → beraberlik (legacy `DRAW_BY_CITADEL`).
 *  - Hamlesiz + şah çekiliyor → mat (rakip kazanır).
 *  - Hamlesiz + şah çekilmiyor → PAT = hamlesiz kalan KAYBEDER (Timur kuralı,
 *    legacy `LOSS_BY_STALEMATE`, spec `stalemate_win`).
 *  - Rok yok, en-passant yok (legacy'de ikisi de yoktur — korundu).
 *
 * Spec eşleme notu: spec `GameResult.draw.reason` üçlüsü
 * (agreement|repetition|fifty_move) hisar beraberliğini KAPSAMAZ. Legacy
 * hisarı "beraberlik" saydığı için `agreement`e eşlendi — KARAR NOKTASI
 * olarak raporlanır (spec'e `citadel` reason eklenmesi önerilir).
 */

import {
  BOTTOM_RIGHT_CITADEL,
  TOP_LEFT_CITADEL,
  PieceKind,
  type GameResult,
  type Position,
  type Side,
} from '../position/Position';
import {
  assertBoardSize,
  findKingSquare,
  isAttacked,
  opponent,
} from './shared';
import { generateLegalMoves } from './generateLegalMoves';

/** Verilen taraf şah çekiyor mu? — moveRules.ts:438 `isKingInCheck` portu. */
export function isCheck(position: Position, side: Side): boolean {
  assertBoardSize(position.board);
  const kingSq = findKingSquare(
    side,
    position.board,
    position.citadels,
  );
  if (kingSq === null) return false; // Şahsız dizilimde şah yok (legacy ile aynı)
  return isAttacked(position.board, position.citadels, kingSq, opponent(side));
}

function citadelKingSide(
  position: Position,
): { whiteInLeft: boolean; blackInRight: boolean } {
  const tl = position.citadels.topLeft.occupant;
  const br = position.citadels.bottomRight.occupant;
  void TOP_LEFT_CITADEL;
  void BOTTOM_RIGHT_CITADEL;
  return {
    whiteInLeft: tl !== null && tl.kind === PieceKind.King && tl.side === 'white',
    blackInRight: br !== null && br.kind === PieceKind.King && br.side === 'black',
  };
}

/**
 * Oyun sonucu (bitmediyse null). Resignation/timeout pozisyondan TÜRETİLEMEZ
 * (dış olaydır); bu fonksiyon SADECE tahta-içi sonuçları üretir.
 */
export function getGameResult(position: Position): GameResult | null {
  assertBoardSize(position.board);
  const side = position.sideToMove;
  const foe = opponent(side);

  // Rule 3: Hisar beraberliği (legacy satır 741-763 — mesajlar korundu mantığıyla).
  const { whiteInLeft, blackInRight } = citadelKingSide(position);
  if (whiteInLeft || blackInRight) {
    return { type: 'draw', reason: 'agreement' }; // bkz. dosya başı notu
  }

  // Elli-hamle (spec reason üçlüsünden; legacy saati bağlanmamıştı, burada bağlı).
  if (position.flags.halfMoveClock >= 100) {
    return { type: 'draw', reason: 'fifty_move' };
  }

  // Üç-tekrar (spec §7.1 repetitionCount; legacy'de yoktu, burada bağlı).
  const rep = position.flags.repetitionCount[position.zobristHash.toString()] ?? 0;
  if (rep >= 3) {
    return { type: 'draw', reason: 'repetition' };
  }

  const check = isCheck(position, side);
  const legal = generateLegalMoves(position);
  if (legal.length === 0) {
    if (check) return { type: 'checkmate', winner: foe };
    return { type: 'stalemate_win', winner: foe }; // PAT = kayıp (Rule 1)
  }
  return null;
}

/** Oyun bitti mi? */
export function isGameOver(position: Position): boolean {
  return getGameResult(position) !== null;
}

/**
 * Hisar beraberliği mi? (arama içi terminal kontrolü için; `getGameResult`
 * ile AYNI koşul — tek doğruluk kaynağı burasıdır, kopyası değil.)
 */
export function isCitadelDraw(position: Position): boolean {
  const { whiteInLeft, blackInRight } = citadelKingSide(position);
  return whiteInLeft || blackInRight;
}
