/**
 * Game Core — Rules: generateLegalMoves / isLegalMove (§7.2 immutable API).
 *
 * moveRules.ts:670-713 `getLegalMoves` portu:
 *  1. Her dost taş için pseudo-hedefler (`shared.pseudoTargets`),
 *  2. şahı açıkta bırakanlar elenir (simüle et + `isAttacked`),
 *  3. hisar-çıkış hamleleri aynı filtreden geçer,
 *  4. Rule 2 Şah Takası hamleleri eklenir.
 * Sıra legacy ile aynıdır: tahta kareleri artan sırada, sonra hisar, sonra takas.
 */

import {
  BOTTOM_RIGHT_CITADEL,
  TOP_LEFT_CITADEL,
  isCitadelSquare,
  type Position,
  type Side,
} from '../position/Position';
import { MoveSpecialFlag, type Move } from '../move/Move';
import {
  applyMoveToArrays,
  assertBoardSize,
  isAttacked,
  isPromotionTarget,
  kingSwapTargets,
  opponent,
  pieceAt,
  pseudoTargets,
  resolvePawnPromotion,
  revertMoveInArrays,
  type UndoRecord,
} from './shared';

const TURKISH_LETTERS: Record<string, string> = {
  king: 'Ş',
  general: 'V',
  ferz: 'Fe',
  rook: 'K',
  knight: 'A',
  alfil: 'F',
  camel: 'D',
  dabbaba: 'M',
  giraffe: 'Z',
  picket: 'N',
  pawn: '',
  prince: 'Şz',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];

export function squareName(sq: number): string {
  if (sq === TOP_LEFT_CITADEL) return 'Hisar(S)';
  if (sq === BOTTOM_RIGHT_CITADEL) return 'Hisar(B)';
  const col = sq % 11;
  const row = Math.floor(sq / 11);
  return `${FILES[col]}${row + 1}`;
}

/** Basit SAN: legacy `generateMoveNotation` karşılığı (stub; notation modülü devralacak). */
export function moveNotation(
  kindKey: string,
  from: number,
  to: number,
  isCapture: boolean,
  promotion?: string,
  checkSuffix = '',
): string {
  const L = TURKISH_LETTERS[kindKey] ?? '?';
  const t = squareName(to);
  let s: string;
  if (kindKey === 'pawn') {
    s = isCapture ? `${FILES[from % 11]}x${t}` : t;
    if (promotion) s += `=${TURTLE(promotion)}`;
  } else {
    s = `${L}${isCapture ? 'x' : ''}${t}`;
  }
  return s + checkSuffix;
}

function TURTLE(kindKey: string): string {
  return TURKISH_LETTERS[kindKey] ?? '?';
}

function kingSwapUsedOf(position: Position): Record<Side, boolean> {
  return (
    position.flags.hasUsedKingSwap ?? {
      white: false,
      black: false,
    }
  );
}

/**
 * Pozisyonun TÜM legal hamleleri (sıra `sideToMove` tarafına aittir).
 * Piyon terfi türü legacy ile aynı kuraldan gelir (`resolvePawnPromotion`);
 * UI özel terfi seçimi yaparsa `makeMove` öncesi `move.promotion` ezilebilir.
 */
export function generateLegalMoves(position: Position): Move[] {
  assertBoardSize(position.board);
  const side = position.sideToMove;
  const foe = opponent(side);
  const used = kingSwapUsedOf(position);
  const board = position.board as import('../position/Position').Piece[];
  const citadels = position.citadels;
  const moves: Move[] = [];

  // Scratch: şah-güvenlik filtresi için tek yeniden-kullanımlı kopya.
  const scratch = (position.board as unknown as { [k: string]: unknown }).slice
    ? [...(position.board as unknown[])]
    : [];
  const scratchCitadels = {
    topLeft: { ...citadels.topLeft },
    bottomRight: { ...citadels.bottomRight },
  };

  const consider = (
    piece: import('../position/Position').Piece,
    from: number,
    to: number,
    captured: import('../position/Position').Piece | null,
    opts: {
      promotion?: import('../position/Position').PieceKind;
      extraFlags?: MoveSpecialFlag[];
      isKingSwap?: boolean;
      relocationTo?: number | null;
      newPawnStage?: 0 | 1 | 2;
    } = {},
  ): void => {
    const isKingSwap = opts.isKingSwap === true;
    // Simüle et → kendi şahın saldırı altında kalmamalı (takas hariç:
    // takasın kendi doğrulaması `kingSwapTargets` içinde zaten yapıldı).
    let legal = true;
    let undo: UndoRecord | null = null;
    if (!isKingSwap) {
      const sBoard = scratch as (import('../position/Position').Piece | null)[];
      for (let i = 0; i < position.board.length; i++) {
        sBoard[i] = position.board[i] as import('../position/Position').Piece | null;
      }
      scratchCitadels.topLeft = { ...citadels.topLeft };
      scratchCitadels.bottomRight = { ...citadels.bottomRight };
      undo = applyMoveToArrays(sBoard, scratchCitadels, from, to, {
        promotion: opts.promotion,
        isKingSwap: false,
        relocationTo: opts.relocationTo ?? null,
        newPawnStage: opts.newPawnStage,
      });
      const kingSq = findKing(sBoard, scratchCitadels, side);
      legal =
        kingSq === null || !isAttacked(sBoard, scratchCitadels, kingSq, foe);
      revertMoveInArrays(sBoard, scratchCitadels, undo, false);
      void undo;
    }
    if (!legal) return;

    const flags: MoveSpecialFlag[] = [...(opts.extraFlags ?? [])];
    if (opts.promotion) flags.push(MoveSpecialFlag.Promotion);
    if (isCitadelSquare(to)) flags.push(MoveSpecialFlag.CitadelEntry);
    if (isKingSwap) flags.push(MoveSpecialFlag.KingSwap);
    if (opts.relocationTo != null) flags.push(MoveSpecialFlag.Relocation);

    // metadata.isCheck: hamle sonrası rakip şah saldırı altında mı?
    let check = false;
    {
      const sBoard = scratch as (import('../position/Position').Piece | null)[];
      for (let i = 0; i < position.board.length; i++) {
        sBoard[i] = position.board[i] as import('../position/Position').Piece | null;
      }
      scratchCitadels.topLeft = { ...citadels.topLeft };
      scratchCitadels.bottomRight = { ...citadels.bottomRight };
      const u = applyMoveToArrays(sBoard, scratchCitadels, from, to, {
        promotion: opts.promotion,
        isKingSwap,
        relocationTo: opts.relocationTo ?? null,
        newPawnStage: opts.newPawnStage,
      });
      const foeKing = findKing(sBoard, scratchCitadels, foe);
      check = foeKing !== null && isAttacked(sBoard, scratchCitadels, foeKing, side);
      revertMoveInArrays(sBoard, scratchCitadels, u, isKingSwap);
    }

    moves.push({
      from,
      to,
      piece: { ...piece },
      capturedPiece: captured ? { ...captured } : null,
      promotion: opts.promotion,
      specialFlags: flags,
      metadata: {
        isCheck: check,
        isCapture: captured !== null,
        algebraic: moveNotation(
          piece.kind,
          from,
          opts.relocationTo ?? to,
          captured !== null,
          opts.promotion,
          check ? '+' : '',
        ),
      },
    });
  };

  // 1. Tahtadaki dost taşlar (artan kare sırası — legacy r=0..9, c=0..10).
  for (let sq = 0; sq < 110; sq++) {
    const p = position.board[sq] as import('../position/Position').Piece | null;
    if (!p || p.side !== side) continue;
    for (const t of pseudoTargets(p, sq, position.board, citadels)) {
      if (p.kind === 'pawn' && isPromotionTarget(p, t.to)) {
        const r = resolvePawnPromotion(p, position.board, citadels);
        consider(p, sq, t.to, t.captured, {
          promotion: r.promotedKind,
          relocationTo: r.isRelocation ? r.relocationTo : null,
          newPawnStage: r.newStage,
        });
      } else {
        consider(p, sq, t.to, t.captured);
      }
    }
  }

  // 2. Hisar-çıkış: legacy BİREBİR — beyaz SADECE sağ(111), siyah SADECE sol(110)
  // slotuna bakar (moveRules.ts:695). Diğer slottaki dost taş legacy'de de
  // hamlesizdir; KARAR NOKTASI olarak raporlanır.
  const exitSq = side === 'white' ? BOTTOM_RIGHT_CITADEL : TOP_LEFT_CITADEL;
  const exitPiece = pieceAt(board as never, citadels, exitSq);
  if (exitPiece && exitPiece.side === side) {
    for (const t of pseudoTargets(exitPiece, exitSq, position.board, citadels)) {
      consider(exitPiece, exitSq, t.to, t.captured);
    }
  }

  // 3. Rule 2 Şah Takası.
  for (const ks of kingSwapTargets(side, position.board, citadels, used)) {
    const king = position.board[ks.from] as import('../position/Position').Piece;
    consider(king, ks.from, ks.to, null, { isKingSwap: true });
  }

  return moves;
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

import { findKingSquare } from './shared';

function findKing(
  board: (import('../position/Position').Piece | null)[],
  citadels: import('../position/Position').CitadelState,
  side: Side,
): number | null {
  return findKingSquare(side, board, citadels);
}
