/**
 * Game Core — Rules: hamle-üretim hattı (pipeline) (§7.2 orkestrasyon).
 *
 * lichess `Situation` disiplininin 112-kare portu: hamle üretimi üç aşamalı
 * hattır (aşama başına tek sorumluluk):
 *  1. `generatePseudoTargets` — taşın pseudo-legal hedefleri (şah filtresi YOK);
 *     `shared.pseudoTargets`'e delege eder (vektör YOK, kural YOK).
 *  2. `filterKingSafety` — adayı `shared.applyMoveToArrays` ile scratch
 *     tamponlara uygular, `shared.isAttacked` ile kendi şahını denetler,
 *     `shared.revertMoveInArrays` ile geri alır (allocation yok).
 *  3. `buildLegalMoves` — sıra garantisiyle birleştirir: artan kare 0..109,
 *     sonra hisar-çıkış (beyaz SADECE 111, siyah SADECE 110 — legacy quirk,
 *     moveRules.ts:695 birebir), sonra Şah Takası. Sıra, eski
 *     `generateLegalMoves` sırasıyla birebir aynıdır.
 *
 * `generateLegalMoves.ts` bu hatta delege eden ince kabuktur. Vektör / terfi /
 * takas / hisar / pat mantığı `shared.ts`'tedir — burada SADECE orkestrasyon
 * vardır (Faz 1 karar noktası 7'deki board[110/111] senkron değişmezi korunur).
 */

import {
  BOTTOM_RIGHT_CITADEL,
  TOP_LEFT_CITADEL,
  PieceKind,
  isCitadelSquare,
  type CitadelState,
  type Piece,
  type Position,
  type Side,
  type SquareIndex,
} from '../position/Position';
import { MoveSpecialFlag, type Move } from '../move/Move';
import {
  applyMoveToArrays,
  assertBoardSize,
  findKingSquare,
  isAttacked,
  isPromotionTarget,
  kingSwapTargets,
  opponent,
  pieceAt,
  pseudoTargets,
  resolvePawnPromotion,
  revertMoveInArrays,
  type PseudoTarget,
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

// ==================== AŞAMA 1: pseudo-hedefler ====================

/**
 * `from` karesindeki taşın pseudo-legal hedefleri (şah-güvenlik filtresi YOK).
 * Taş yoksa veya kare geçersizse boş döner; aksi hâlde birebir
 * `shared.pseudoTargets`'e delege eder.
 */
export function generatePseudoTargets(
  position: Position,
  from: SquareIndex,
): PseudoTarget[] {
  const piece = pieceAt(position.board, position.citadels, from);
  if (!piece) return [];
  return pseudoTargets(piece, from, position.board, position.citadels);
}

// ==================== AŞAMA 2: şah-güvenlik filtresi ====================

export interface KingSafetyOpts {
  promotion?: PieceKind;
  isKingSwap: boolean;
  relocationTo?: SquareIndex | null;
  newPawnStage?: 0 | 1 | 2;
}

/** Scratch tamponları pozisyondan tazeler (allocation yok, üzerine yazar). */
function syncScratch(
  position: Position,
  scratch: (Piece | null)[],
  scratchCitadels: CitadelState,
): void {
  for (let i = 0; i < position.board.length; i++) {
    scratch[i] = position.board[i];
  }
  scratchCitadels.topLeft = { ...position.citadels.topLeft };
  scratchCitadels.bottomRight = { ...position.citadels.bottomRight };
}

/**
 * Aday hamle kendi şahı açıkta bırakmıyor mu?
 * Simüle et → `isAttacked` → geri al. Şah Takası her zaman `true` döner
 * (takasın kendi doğrulaması `kingSwapTargets` içinde zaten yapıldı).
 */
export function filterKingSafety(
  position: Position,
  from: SquareIndex,
  to: SquareIndex,
  opts: KingSafetyOpts,
  scratch: (Piece | null)[],
  scratchCitadels: CitadelState,
): boolean {
  if (opts.isKingSwap) return true;
  syncScratch(position, scratch, scratchCitadels);
  const side = position.sideToMove;
  const undo = applyMoveToArrays(scratch, scratchCitadels, from, to, {
    promotion: opts.promotion,
    isKingSwap: false,
    relocationTo: opts.relocationTo ?? null,
    newPawnStage: opts.newPawnStage,
  });
  const kingSq = findKingSquare(side, scratch, scratchCitadels);
  const legal =
    kingSq === null || !isAttacked(scratch, scratchCitadels, kingSq, opponent(side));
  revertMoveInArrays(scratch, scratchCitadels, undo, false);
  return legal;
}

/** Hamle sonrası rakip şah saldırı altında mı? (metadata.isCheck — filtre DEĞİL.) */
function givesCheck(
  position: Position,
  from: SquareIndex,
  to: SquareIndex,
  opts: KingSafetyOpts,
  scratch: (Piece | null)[],
  scratchCitadels: CitadelState,
): boolean {
  syncScratch(position, scratch, scratchCitadels);
  const side = position.sideToMove;
  const foe = opponent(side);
  const u = applyMoveToArrays(scratch, scratchCitadels, from, to, {
    promotion: opts.promotion,
    isKingSwap: opts.isKingSwap,
    relocationTo: opts.relocationTo ?? null,
    newPawnStage: opts.newPawnStage,
  });
  const foeKing = findKingSquare(foe, scratch, scratchCitadels);
  const check = foeKing !== null && isAttacked(scratch, scratchCitadels, foeKing, side);
  revertMoveInArrays(scratch, scratchCitadels, u, opts.isKingSwap);
  return check;
}

// ==================== AŞAMA 3: sıralı birleştirme ====================

interface ConsiderOpts {
  promotion?: PieceKind;
  extraFlags?: MoveSpecialFlag[];
  isKingSwap?: boolean;
  relocationTo?: SquareIndex | null;
  newPawnStage?: 0 | 1 | 2;
}

/**
 * Pozisyonun TÜM legal hamleleri (sıra `sideToMove` tarafına aittir).
 * Sıra garantisi: artan kare 0..109, sonra hisar-çıkış (beyaz SADECE 111,
 * siyah SADECE 110), sonra KingSwap. Piyon terfi türü `resolvePawnPromotion`
 * ile çözülür (legacy ile aynı kural).
 */
export function buildLegalMoves(position: Position): Move[] {
  assertBoardSize(position.board);
  const side = position.sideToMove;
  const used = kingSwapUsedOf(position);
  const citadels = position.citadels;
  const moves: Move[] = [];

  // Scratch: şah-güvenlik filtresi + isCheck hesabı için tek yeniden-kullanımlı kopya.
  const scratch: (Piece | null)[] = [...(position.board as (Piece | null)[])];
  const scratchCitadels: CitadelState = {
    topLeft: { ...citadels.topLeft },
    bottomRight: { ...citadels.bottomRight },
  };

  const consider = (
    piece: Piece,
    from: SquareIndex,
    to: SquareIndex,
    captured: Piece | null,
    opts: ConsiderOpts = {},
  ): void => {
    const isKingSwap = opts.isKingSwap === true;
    const safety: KingSafetyOpts = {
      promotion: opts.promotion,
      isKingSwap,
      relocationTo: opts.relocationTo ?? null,
      newPawnStage: opts.newPawnStage,
    };
    if (!filterKingSafety(position, from, to, safety, scratch, scratchCitadels)) return;

    const flags: MoveSpecialFlag[] = [...(opts.extraFlags ?? [])];
    if (opts.promotion) flags.push(MoveSpecialFlag.Promotion);
    if (isCitadelSquare(to)) flags.push(MoveSpecialFlag.CitadelEntry);
    if (isKingSwap) flags.push(MoveSpecialFlag.KingSwap);
    if (opts.relocationTo != null) flags.push(MoveSpecialFlag.Relocation);

    const check = givesCheck(position, from, to, safety, scratch, scratchCitadels);

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
    const p = position.board[sq];
    if (!p || p.side !== side) continue;
    for (const t of pseudoTargets(p, sq, position.board, citadels)) {
      if (p.kind === PieceKind.Pawn && isPromotionTarget(p, t.to)) {
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
  const exitPiece = pieceAt(position.board, citadels, exitSq);
  if (exitPiece && exitPiece.side === side) {
    for (const t of pseudoTargets(exitPiece, exitSq, position.board, citadels)) {
      consider(exitPiece, exitSq, t.to, t.captured);
    }
  }

  // 3. Rule 2 Şah Takası.
  for (const ks of kingSwapTargets(side, position.board, citadels, used)) {
    const king = position.board[ks.from] as Piece;
    consider(king, ks.from, ks.to, null, { isKingSwap: true });
  }

  return moves;
}
