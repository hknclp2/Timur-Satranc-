/**
 * Game Core — paylaşılan hareket çekirdeği (internal).
 *
 * docs/mimari.md §7.2 kuralı: `generateLegalMoves` ile `make/undoMoveInPlace`
 * AYNI alt kural mantığını paylaşır (kod tekrarı yasak). Bu dosya o ortak
 * mantığı tutar; `generateLegalMoves.ts` / `makeMove.ts` / `gameResult.ts`
 * buraya delege eder.
 *
 * Tüm vektörler `core/engine/moveRules.ts` birebir portudur:
 *  - `getValidMoves` (satır 159-433)      → `pseudoTargets()`
 *  - `isKingInCheck` (satır 438-488)      → `isAttacked()` + `findKingSquare()`
 *  - `validateKingSwap`/`generateKingSwapMoves` (499-569) → `kingSwapTargets()`
 *  - `findSafeRelocationSquare` (574-616) → `findSafeRelocationSquare()`
 *  - `processPawnPromotion` (626-664)     → `resolvePawnPromotion()`
 *  - `simulateMove` (86-154)              → `applyMoveToArrays()`
 *
 * İSİM EŞLEME (Position.ts başlığındaki tabloya göre):
 *  legacy `queen` (1 DÜZ)   → `PieceKind.General` (Vezir)
 *  legacy `general` (1 ÇAPRAZ) → `PieceKind.Ferz`
 *  legacy `bishop`           → `PieceKind.Alfil`
 *  legacy `warMachine`       → `PieceKind.Dabbaba`
 *  legacy `prince`           → `PieceKind.Prince` (Şah gibi, hisarsız, royal değil)
 */

import {
  BOARD_COLS,
  BOARD_ROWS,
  BOTTOM_RIGHT_CITADEL,
  TOP_LEFT_CITADEL,
  TOTAL_SQUARES,
  PieceKind,
  coordToSquare,
  isBoardSquare,
  squareToCoord,
  type BoardArray,
  type CitadelState,
  type Piece,
  type Side,
  type SquareIndex,
} from '../position/Position';

export function opponent(side: Side): Side {
  return side === 'white' ? 'black' : 'white';
}

/** karesindeki taş (tahta + hisar occupant'ları dahil). */
export function pieceAt(
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  sq: SquareIndex,
): Piece | null {
  if (sq === TOP_LEFT_CITADEL) return citadels.topLeft.occupant;
  if (sq === BOTTOM_RIGHT_CITADEL) return citadels.bottomRight.occupant;
  if (!isBoardSquare(sq)) return null;
  return (board as (Piece | null)[])[sq];
}

/** Hedef kareye inilebilir mi (boş veya düşman)? — moveRules.ts:50-64 `canLandOn` portu. */
export function canLand(
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  to: SquareIndex,
  movingSide: Side,
): { canMove: boolean; isCapture: boolean; captured: Piece | null } {
  const occupant = pieceAt(board, citadels, to);
  if (!occupant) return { canMove: true, isCapture: false, captured: null };
  if (occupant.side !== movingSide) {
    return { canMove: true, isCapture: true, captured: occupant };
  }
  return { canMove: false, isCapture: false, captured: null };
}

export interface PseudoTarget {
  to: SquareIndex;
  captured: Piece | null;
}

/**
 * Bir taşın pseudo-legal hedefleri (şah güvenliği filtresi YOK).
 * moveRules.ts:159-433 `getValidMoves` portu — vektörler birebir aynıdır.
 */
export function pseudoTargets(
  piece: Piece,
  from: SquareIndex,
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
): PseudoTarget[] {
  const out: PseudoTarget[] = [];
  const side = piece.side;

  const tryAdd = (to: SquareIndex): boolean => {
    // Tahta dışı + hisar-dışı hedef geçersiz (legacy: isCitadel değilse isWithinBoard).
    if (to !== TOP_LEFT_CITADEL && to !== BOTTOM_RIGHT_CITADEL && !isBoardSquare(to)) {
      return false;
    }
    const { canMove, isCapture, captured } = canLand(board, citadels, to, side);
    if (canMove) {
      out.push({ to, captured });
      return !isCapture; // boş kare → kayan ışın devam eder
    }
    return false;
  };

  const slideRay = (dCol: number, dRow: number, minDist = 1, maxDist = 10): void => {
    const start = squareToCoord(from);
    if (!start) return;
    // minDist>1 ise ara kareler boş olmalı (legacy picket kontrolü, satır 201-209).
    if (minDist > 1) {
      for (let step = 1; step < minDist; step++) {
        const mid = coordToSquare(start.col + dCol * step, start.row + dRow * step);
        if (mid === null || (board as (Piece | null)[])[mid] !== null) return;
      }
    }
    let dist = minDist;
    for (;;) {
      const t = coordToSquare(start.col + dCol * dist, start.row + dRow * dist);
      if (t === null || dist > maxDist) break;
      if (!tryAdd(t)) break;
      dist++;
    }
  };

  // Hisar içindeki taş: komşu tahta karelerine çıkar (moveRules.ts:222-236).
  if (from === TOP_LEFT_CITADEL) {
    for (let row = 7; row <= 9; row++) {
      const t = coordToSquare(0, row);
      if (t !== null) tryAdd(t);
    }
    return out;
  }
  if (from === BOTTOM_RIGHT_CITADEL) {
    for (let row = 0; row <= 2; row++) {
      const t = coordToSquare(10, row);
      if (t !== null) tryAdd(t);
    }
    return out;
  }

  const pos = squareToCoord(from);
  if (!pos) return out;
  const { col: x, row: y } = pos;

  switch (piece.kind) {
    // Şah + Şehzade: 8 yön 1 adım (moveRules.ts:240-263). Hisar girişi SADECE Şah.
    case PieceKind.King:
    case PieceKind.Prince: {
      const dirs = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0], [1, 0],
        [-1, 1], [0, 1], [1, 1],
      ];
      for (const [dx, dy] of dirs) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      if (piece.kind === PieceKind.King) {
        // Beyaz Şah (x==0, |y-8|<=1) → sol hisar; Siyah Şah (x==10, |y-1|<=1) → sağ hisar.
        if (side === 'white' && x === 0 && Math.abs(y - 8) <= 1) tryAdd(TOP_LEFT_CITADEL);
        if (side === 'black' && x === 10 && Math.abs(y - 1) <= 1) tryAdd(BOTTOM_RIGHT_CITADEL);
      }
      break;
    }

    // Vezir (= legacy `queen`): 1 kare düz (moveRules.ts:275-281).
    case PieceKind.General: {
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of dirs) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Ferz (= legacy `general`): 1 kare çapraz (moveRules.ts:266-272).
    case PieceKind.Ferz: {
      const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of dirs) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Zürafa: 1 çapraz (boş olmalı) + en az 3 düz, sonra kayar (moveRules.ts:284-329).
    case PieceKind.Giraffe: {
      const groups: { diag: [number, number]; orthos: [number, number][] }[] = [
        { diag: [-1, -1], orthos: [[-1, 0], [0, -1]] },
        { diag: [1, -1], orthos: [[1, 0], [0, -1]] },
        { diag: [-1, 1], orthos: [[-1, 0], [0, 1]] },
        { diag: [1, 1], orthos: [[1, 0], [0, 1]] },
      ];
      const arr = board as (Piece | null)[];
      for (const { diag, orthos } of groups) {
        const dSq = coordToSquare(x + diag[0], y + diag[1]);
        if (dSq === null) continue;
        const dCoord = squareToCoord(dSq);
        if (!dCoord) continue;
        if (arr[dSq] !== null) continue; // ilk çapraz adım boş olmalı
        for (const [ox, oy] of orthos) {
          let step = 1;
          let tx = dCoord.col + ox * step;
          let ty = dCoord.row + oy * step;
          let clear = true;
          while (step < 3 && clear) {
            const mid = coordToSquare(tx, ty);
            if (mid === null || arr[mid] !== null) {
              clear = false;
              break;
            }
            step++;
            tx = dCoord.col + ox * step;
            ty = dCoord.row + oy * step;
          }
          if (clear) {
            for (;;) {
              const t = coordToSquare(tx, ty);
              if (t === null) break;
              if (!tryAdd(t)) break;
              step++;
              tx = dCoord.col + ox * step;
              ty = dCoord.row + oy * step;
            }
          }
        }
      }
      break;
    }

    // Tale'a: çapraz en az 2 kayar (moveRules.ts:332-338).
    case PieceKind.Picket: {
      const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of dirs) slideRay(dx, dy, 2, 10);
      break;
    }

    // At: 2+1 atlama (moveRules.ts:341-350).
    case PieceKind.Knight: {
      const jumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dx, dy] of jumps) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Savaş Arabası: düz kayar (moveRules.ts:353-359).
    case PieceKind.Rook: {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dx, dy] of dirs) slideRay(dx, dy, 1, 10);
      break;
    }

    // Fil (= legacy `bishop`): tam 2 çapraz atlama (moveRules.ts:362-368).
    case PieceKind.Alfil: {
      const jumps = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
      for (const [dx, dy] of jumps) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Deve: 3+1 L atlama (moveRules.ts:371-380).
    case PieceKind.Camel: {
      const jumps = [
        [-3, -1], [-3, 1], [-1, -3], [-1, 3],
        [1, -3], [1, 3], [3, -1], [3, 1],
      ];
      for (const [dx, dy] of jumps) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Mancınık (= legacy `warMachine`): tam 2 düz atlama (moveRules.ts:383-389).
    case PieceKind.Dabbaba: {
      const jumps = [[0, 2], [0, -2], [2, 0], [-2, 0]];
      for (const [dx, dy] of jumps) {
        const t = coordToSquare(x + dx, y + dy);
        if (t !== null) tryAdd(t);
      }
      break;
    }

    // Piyon: 1 ileri (boşsa) + çapraz taş alma (moveRules.ts:392-429).
    // Terfi satırı: beyaz row 9, siyah row 0. Terfi TÜRÜ burada değil,
    // `resolvePawnPromotion()` ile çözülür (legacy `processPawnPromotion`).
    case PieceKind.Pawn: {
      const dir = side === 'white' ? 1 : -1;
      const ty = y + dir;
      const fwd = coordToSquare(x, ty);
      if (fwd !== null && (board as (Piece | null)[])[fwd] === null) {
        out.push({ to: fwd, captured: null });
      }
      for (const cx of [x - 1, x + 1]) {
        const t = coordToSquare(cx, ty);
        if (t === null) continue;
        const victim = (board as (Piece | null)[])[t];
        if (victim && victim.side !== side) out.push({ to: t, captured: victim });
      }
      break;
    }
  }

  return out;
}

/** Piyonun hedefi terfi satırında mı? (legacy satır 395). */
export function isPromotionTarget(pawn: Piece, to: SquareIndex): boolean {
  const c = squareToCoord(to);
  if (!c || pawn.kind !== PieceKind.Pawn) return false;
  return pawn.side === 'white' ? c.row === BOARD_ROWS - 1 : c.row === 0;
}

export interface PawnPromotionResolution {
  promotedKind: PieceKind;
  isRelocation: boolean;
  relocationTo: SquareIndex | null;
  newStage?: 0 | 1 | 2;
}

/**
 * Piyon terfi hattı — moveRules.ts:626-664 `processPawnPromotion` portu.
 *  - Pawn-of-King (pawnOf===King) → Prince.
 *  - Pawn-of-Pawns (pawnOf===Pawn): stage 0 → güvenli-kareye taşıma (taş piyon
 *    kalır, stage 1); stage>=1 → Prince (stage 2).
 *  - Alt-subay piyonları → kendi türü (customType varsa o).
 */
export function resolvePawnPromotion(
  pawn: Piece,
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  customType?: PieceKind,
): PawnPromotionResolution {
  if (pawn.pawnOf === PieceKind.King) {
    return { promotedKind: PieceKind.Prince, isRelocation: false, relocationTo: null };
  }
  const isPawnOfPawns = pawn.pawnOf === PieceKind.Pawn || pawn.pawnStage !== undefined;
  if (isPawnOfPawns) {
    const stage = pawn.pawnStage ?? 0;
    if (stage === 0) {
      const safe = findSafeRelocationSquare(pawn.side, board, citadels);
      if (safe !== null) {
        return { promotedKind: PieceKind.Pawn, isRelocation: true, relocationTo: safe, newStage: 1 };
      }
    }
    return { promotedKind: PieceKind.Prince, isRelocation: false, relocationTo: null, newStage: 2 };
  }
  return { promotedKind: customType ?? pawn.pawnOf ?? PieceKind.General, isRelocation: false, relocationTo: null };
}

/**
 * Pawn-of-Pawns güvenli-kare araması — moveRules.ts:574-616 portu.
 * Rakip saldırı kareleri toplanır; tarafın [2,1,0] (beyaz) / [7,8,9] (siyah)
 * sıralamasında ilk boş+güvenli kare, yoksa aynı bantta ilk boş kare.
 */
export function findSafeRelocationSquare(
  player: Side,
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
): SquareIndex | null {
  const foe = opponent(player);
  const attacked = new Set<number>();
  const arr = board as (Piece | null)[];
  for (let sq = 0; sq < BOARD_COLS * BOARD_ROWS; sq++) {
    const p = arr[sq];
    if (p && p.side === foe) {
      if (p.kind === PieceKind.Pawn) {
        // Piyon SADECE çapraz-yakalama karelerine saldırır (boş olsa bile);
        // düz-ileri itiş saldırı değildir (isAttacked ile aynı model).
        const c = squareToCoord(sq);
        if (c) {
          const dir = p.side === 'white' ? 1 : -1;
          for (const dx of [-1, 1]) {
            const t = coordToSquare(c.col + dx, c.row + dir);
            if (t !== null && isBoardSquare(t)) attacked.add(t);
          }
        }
        continue;
      }
      for (const t of pseudoTargets(p, sq, board, citadels)) {
        if (isBoardSquare(t.to)) attacked.add(t.to);
      }
    }
  }
  const ranks = player === 'white' ? [2, 1, 0] : [7, 8, 9];
  for (const r of ranks) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const sq = coordToSquare(c, r);
      if (sq !== null && arr[sq] === null && !attacked.has(sq)) return sq;
    }
  }
  for (const r of ranks) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const sq = coordToSquare(c, r);
      if (sq !== null && arr[sq] === null) return sq;
    }
  }
  return null;
}

/** Verilen renkten Şah'ın karesi (tahta önce, sonra hisar) — moveRules.ts:443-465 portu. */
export function findKingSquare(
  side: Side,
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
): SquareIndex | null {
  const arr = board as (Piece | null)[];
  for (let sq = 0; sq < BOARD_COLS * BOARD_ROWS; sq++) {
    const p = arr[sq];
    if (p && p.kind === PieceKind.King && p.side === side) return sq;
  }
  // Şah hisardaysa (legacy sıra: önce sol/siyah slot, sonra sağ/beyaz slot).
  if (citadels.topLeft.occupant?.kind === PieceKind.King && citadels.topLeft.occupant.side === side) {
    return TOP_LEFT_CITADEL;
  }
  if (citadels.bottomRight.occupant?.kind === PieceKind.King && citadels.bottomRight.occupant.side === side) {
    return BOTTOM_RIGHT_CITADEL;
  }
  return null;
}

/**
 * Kare saldırısı — moveRules.ts:469-487 portu.
 * QUIRK (birebir korundu): saldırgan taraması SADECE tahta karelerindedir;
 * hisar içindeki rakip taş saldırgan sayılmaz (legacy de saymaz).
 * DÜZELTME (P1): piyonlar SADECE çapraz-yakalama karelerine saldırır
 * (dolu/boş fark etmez); düz-ileri itiş saldırı değildir. Legacy
 * `pseudoTargets` ileri-itmeyi de üretir (boşsa) ve çaprazı SADECE doluysa
 * üretir — `isAttacked` boş-kare sorgularında (relocation-güvenliği) iki
 * yönde de yanlış sonuç verirdi. Dolu şah-karesi sorguları (mat/şah)
 * tesadüfen doğruydu (kurban varken çapraz üretilir, ileri bloklanır).
 */
export function isAttacked(
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  sq: SquareIndex,
  bySide: Side,
): boolean {
  const arr = board as (Piece | null)[];
  for (let s = 0; s < BOARD_COLS * BOARD_ROWS; s++) {
    const p = arr[s];
    if (p && p.side === bySide) {
      if (p.kind === PieceKind.Pawn) {
        const c = squareToCoord(s);
        if (!c) continue;
        const dir = p.side === 'white' ? 1 : -1;
        for (const dx of [-1, 1]) {
          const t = coordToSquare(c.col + dx, c.row + dir);
          if (t !== null && t === sq) return true;
        }
        continue;
      }
      const moves = pseudoTargets(p, s, board, citadels);
      for (const m of moves) {
        if (m.to === sq) return true;
      }
    }
  }
  return false;
}

export interface UndoRecord {
  from: SquareIndex;
  to: SquareIndex;
  landing: SquareIndex; // taşın GERÇEKTE durduğu kare (relocation'da `to`'dan farklı)
  movedBefore: Piece; // hamle-öncesi kopya
  capturedBefore: Piece | null; // `to` karesindeki hamle-öncesi taş (yakalama)
  landingBefore: Piece | null; // relocation'da `landing` karesindeki hamle-öncesi taş (normalde boş)
  targetBefore: Piece | null; // kingSwap'ta takas edilen dost taş (hamle-öncesi kopya)
  prevHalfMoveClock: number;
  prevFullMoveNumber: number;
  prevSideToMove: Side;
  prevKingSwap: Record<Side, boolean>;
  prevHash: bigint;
}

/**
 * Hamleyi MUTABLE dizilere uygular (allocation yok) — moveRules.ts:86-154
 * `simulateMove` + `useGame` terfi/relocation mantığı portu. Bayrak/sıra/hash
 * güncellemesi YAPMAZ (onu `makeMove.ts` yapar); sadece taşları yerleştirir.
 * Dönüş: geri alma kaydı (undo için gerekli tüm hamle-öncesi bilgi).
 */
export function applyMoveToArrays(
  board: (Piece | null)[],
  citadels: CitadelState,
  from: SquareIndex,
  to: SquareIndex,
  opts: {
    promotion?: PieceKind;
    isKingSwap: boolean;
    relocationTo?: SquareIndex | null;
    newPawnStage?: 0 | 1 | 2;
  },
): UndoRecord {
  const read = (sq: SquareIndex): Piece | null =>
    sq === TOP_LEFT_CITADEL
      ? citadels.topLeft.occupant
      : sq === BOTTOM_RIGHT_CITADEL
        ? citadels.bottomRight.occupant
        : board[sq];
  // Senkron değişmezi: board[110/111] ↔ hisar occupant'ı HER ZAMAN aynıdır
  // (Faz-1 karar noktası 7). Okuyucular tek kaynaktan (`read`/`pieceAt`) okur;
  // yazanlar iki aynayı da günceller (stale okuma + materyal sayım kaçağı önlenir).
  const write = (sq: SquareIndex, p: Piece | null): void => {
    if (sq === TOP_LEFT_CITADEL) {
      citadels.topLeft.occupant = p;
      board[TOP_LEFT_CITADEL] = p;
    } else if (sq === BOTTOM_RIGHT_CITADEL) {
      citadels.bottomRight.occupant = p;
      board[BOTTOM_RIGHT_CITADEL] = p;
    } else board[sq] = p;
  };

  // prev* alanları makeMove.ts doldurur (burada bilinmez) — tip için placeholder.
  const undo: UndoRecord = {
    from,
    to,
    landing: to,
    movedBefore: { ...(read(from) as Piece) },
    capturedBefore: null,
    landingBefore: null,
    targetBefore: null,
    prevHalfMoveClock: 0,
    prevFullMoveNumber: 1,
    prevSideToMove: 'white',
    prevKingSwap: { white: false, black: false },
    prevHash: 0n,
  };

  // 1. Şah Takası: iki dost taşın yeri değişir (moveRules.ts:95-114).
  if (opts.isKingSwap) {
    const king = read(from) as Piece;
    const target = read(to) as Piece;
    undo.targetBefore = { ...target };
    undo.capturedBefore = null;
    undo.landingBefore = null;
    write(to, { ...king, hasMoved: true });
    write(from, { ...target });
    // `position` alanı yeni çekirdekte taşın içinde tutulmaz (kare = indeks).
    return undo;
  }

  // 2. Normal hamle (moveRules.ts:117-153).
  // P0 DÜZELTME: relocation'da yakalama `to` karesindedir (piyon çapraz
  // taş alıp güvenli-kareye ışınlanır); eski kod `landing` karesini
  // okuyup `to`'daki düşmanı tahtada BIRAKIYORDU (taş çoğalması).
  const moving = read(from) as Piece;
  write(from, null);
  const effectiveKind = opts.promotion ?? moving.kind;
  // Relocation: taş hedef yerine güvenli-kareye konur (useGame satır ~354-363).
  const landing = opts.relocationTo ?? to;
  undo.landing = landing;
  if (landing !== to) {
    undo.capturedBefore = read(to);
    undo.landingBefore = read(landing);
    write(to, null);
  } else {
    undo.capturedBefore = read(to);
    undo.landingBefore = null;
  }
  const placed: Piece = {
    ...moving,
    kind: effectiveKind,
    hasMoved: true,
    pawnStage: opts.newPawnStage ?? moving.pawnStage,
  };
  write(landing, placed);
  return undo;
}

/** `applyMoveToArrays` tersine çevirir (kayıt üzerinden, allocation yok). */
export function revertMoveInArrays(
  board: (Piece | null)[],
  citadels: CitadelState,
  undo: UndoRecord,
  isKingSwap: boolean,
): void {
  const write = (sq: SquareIndex, p: Piece | null): void => {
    if (sq === TOP_LEFT_CITADEL) {
      citadels.topLeft.occupant = p;
      board[TOP_LEFT_CITADEL] = p;
    } else if (sq === BOTTOM_RIGHT_CITADEL) {
      citadels.bottomRight.occupant = p;
      board[BOTTOM_RIGHT_CITADEL] = p;
    } else board[sq] = p;
  };
  if (isKingSwap) {
    write(undo.from, { ...undo.movedBefore });
    write(undo.to, undo.targetBefore ? { ...undo.targetBefore } : null);
    return;
  }
  if (undo.landing !== undo.to) {
    write(undo.landing, undo.landingBefore ? { ...undo.landingBefore } : null);
    write(undo.to, undo.capturedBefore ? { ...undo.capturedBefore } : null);
    write(undo.from, { ...undo.movedBefore });
    return;
  }
  write(undo.landing, undo.capturedBefore ? { ...undo.capturedBefore } : null);
  write(undo.from, { ...undo.movedBefore });
}

/**
 * Şah Takası hedefleri — moveRules.ts:499-569 portu.
 * Koşullar: takas hakkı kullanılmamış, şah tahtada, hedef tahtadaki
 * şah-dışı dost taş, takas sonrası şah çekilmemiş olmalı.
 */
export function kingSwapTargets(
  side: Side,
  board: BoardArray | (Piece | null)[],
  citadels: CitadelState,
  kingSwapUsed: Record<Side, boolean>,
): { from: SquareIndex; to: SquareIndex }[] {
  const out: { from: SquareIndex; to: SquareIndex }[] = [];
  if (kingSwapUsed[side]) return out;
  const arr = board as (Piece | null)[];
  let kingSq: SquareIndex | null = null;
  for (let sq = 0; sq < BOARD_COLS * BOARD_ROWS; sq++) {
    const p = arr[sq];
    if (p && p.side === side && p.kind === PieceKind.King) {
      kingSq = sq;
      break;
    }
  }
  if (kingSq === null) return out;
  const king = arr[kingSq] as Piece;
  for (let sq = 0; sq < BOARD_COLS * BOARD_ROWS; sq++) {
    const p = arr[sq];
    if (!p || p.side !== side || p.kind === PieceKind.King || p.id === king.id) continue;
    // Takas simülasyonu: şah hedef kareye geçince saldırı altında kalmamalı.
    const scratchBoard = arr.slice();
    const scratchCitadels: CitadelState = {
      topLeft: { ...citadels.topLeft },
      bottomRight: { ...citadels.bottomRight },
    };
    applyMoveToArrays(scratchBoard, scratchCitadels, kingSq, sq, { isKingSwap: true });
    const kingNow = findKingSquareOnArrays(side, scratchBoard, scratchCitadels);
    const attacked =
      kingNow !== null && isAttacked(scratchBoard, scratchCitadels, kingNow, opponent(side));
    if (!attacked) out.push({ from: kingSq, to: sq });
  }
  return out;
}

function findKingSquareOnArrays(
  side: Side,
  board: (Piece | null)[],
  citadels: CitadelState,
): SquareIndex | null {
  return findKingSquare(side, board, citadels);
}

/** Toplam tahta uzunluğu tutarlılık kontrolü (112). */
export function assertBoardSize(board: { length: number }): void {
  if (board.length !== TOTAL_SQUARES) {
    throw new Error(`GameCore: tahta 112 kare olmalı, gelen ${board.length}`);
  }
}
