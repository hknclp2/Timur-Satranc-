/**
 * Engine — tam değerlendirme v0.2 (§7.6: 6 bileşenli Evaluation).
 *
 *   Evaluation = material×1.0 + mobility×0.10 + kingSafety×0.30
 *              + citadelControl×0.40 + pieceActivity×0.15 + pawnStructure×0.10
 *
 * Bileşen tanımları (§7.6 sayısal çerçevesi + Timur'a özgü yorum):
 *  - material: `materialWhiteCp` aynen (baskın bileşen).
 *  - mobility: iki tarafın pseudo-hamle sayısı farkı (legality filtresi YOK —
 *    yaprak düğümde ucuz olsun diye; pseudo, mobility için yeterli yaklaşıktır).
 *    Hamle başına 10cp ham değer × 0.10 → net 1cp/hamle.
 *  - kingSafety: rakip saldırı altındaki komşu kare (şahın 8 komşusu) başına
 *    20cp tehlike; skor = (rakip şah tehlikesi − kendi şah tehlikesi) × 0.30.
 *  - citadelControl: §7.6 CITADEL_WEIGHTS birebir — hisar occupant'ı (kontrol)
 *    +60, şahın giriş karelerinde olması (erişim) +40, kendi kilitli hisar −80,
 *    rakip kilitli hisar +80; toplam × 0.40.
 *  - pieceActivity: merkez kuşakta (kolon 3-7, satır 3-6) duran şah/piyon-dışı
 *    taş başına +12cp × 0.15.
 *  - pawnStructure: aynı dikeyde 2.+ piyonlar (katmerli) başına −15cp × 0.10.
 *
 * Tüm ham katsayılar (10cp, 20cp, 12cp, −15cp) v1 TAHMİNİDİR — §7.6'nın kendi
 * kalibrasyon notu geçerli: self-play ile revize edilecek. `fullEvaluate`
 * sideToMove-görelidir (§7.3 konvansiyonu); `fullEvaluationBreakdown`
 * beyaz-görelidir (analiz/debug için).
 *
 * NOT: arama varsayılanı hâlâ materyal `evaluate` (hız). Tam eval,
 * `TimurEngine` / `search*` fonksiyonlarına `evaluate: fullEvaluate`
 * opsiyonuyla verilebilir.
 */

import {
  PieceKind,
  squareToCoord,
  type Piece,
  type Position,
  type Side,
  type SquareIndex,
} from '../core/position/Position';
import { pseudoTargets } from '../core/rules/shared';
import { EVALUATION_WEIGHTS, materialWhiteCp } from './evaluate';

/** Hisar alt bileşenleri (§7.6 v1 — verbatim). */
export const CITADEL_WEIGHTS = {
  controlBonus: 60, // hisarı kontrol eden taraf için sabit bonus
  kingAccessBonus: 40, // şahın hisara güvenli erişimi varsa bonus
  sealedPenalty: -80, // kendi hisarın kilitliyse ceza
  sealedOpponentBonus: 80, // rakip hisarı kilitliyse bonus
} as const;

// Giriş kareleri (şahın hisara girebildiği komşu kareler — bkz. shared.pseudoTargets).
const WHITE_ENTRY_SQUARES: SquareIndex[] = [77, 88, 99]; // kol 0, satır 7-9
const BLACK_ENTRY_SQUARES: SquareIndex[] = [10, 21, 32]; // kol 10, satır 0-2

const MOBILITY_CP_PER_MOVE = 10;
const KING_DANGER_CP_PER_SQUARE = 20;
const ACTIVITY_CP_PER_PIECE = 12;
const DOUBLED_PAWN_CP = -15;

export interface FullEvalBreakdown {
  material: number;
  mobility: number;
  kingSafety: number;
  citadelControl: number;
  pieceActivity: number;
  pawnStructure: number;
  /** Ağırlıklı toplam (beyaz-göreli cp). */
  total: number;
}

function piecesOf(position: Position, side: Side): { piece: Piece; sq: number }[] {
  const out: { piece: Piece; sq: number }[] = [];
  const board = position.board;
  for (let sq = 0; sq < board.length; sq++) {
    const p = board[sq];
    if (p && p.side === side) out.push({ piece: p, sq });
  }
  return out;
}

/** Bir tarafın TÜM pseudo-hedef kareleri (set; mobility + kingSafety ortak kullanır). */
function attackSet(
  position: Position,
  side: Side,
): { targets: Set<number>; moveCount: number } {
  const targets = new Set<number>();
  let moveCount = 0;
  for (const { piece, sq } of piecesOf(position, side)) {
    for (const t of pseudoTargets(piece, sq, position.board, position.citadels)) {
      targets.add(t.to);
      moveCount++;
    }
  }
  return { targets, moveCount };
}

function kingSquareOf(position: Position, side: Side): SquareIndex | null {
  const board = position.board;
  for (let sq = 0; sq < 110; sq++) {
    const p = board[sq];
    if (p && p.kind === PieceKind.King && p.side === side) return sq;
  }
  const tl = position.citadels.topLeft.occupant;
  if (tl && tl.kind === PieceKind.King && tl.side === side) return 110;
  const br = position.citadels.bottomRight.occupant;
  if (br && br.kind === PieceKind.King && br.side === side) return 111;
  return null;
}

function neighborSquares(kingSq: SquareIndex): SquareIndex[] {
  const c = squareToCoord(kingSq);
  if (!c) return []; // hisardaki şahın "komşu" hesabı yok (v1 basitleştirme)
  const out: SquareIndex[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue;
      const col = c.col + dc;
      const row = c.row + dr;
      if (col >= 0 && col < 11 && row >= 0 && row < 10) out.push(row * 11 + col);
    }
  }
  return out;
}

/** Beyaz-göreli 6 bileşen + ağırlıklı toplam. */
export function fullEvaluationBreakdown(position: Position): FullEvalBreakdown {
  const material = materialWhiteCp(position);

  const white = attackSet(position, 'white');
  const black = attackSet(position, 'black');
  const mobility =
    Math.round((white.moveCount - black.moveCount) * MOBILITY_CP_PER_MOVE * EVALUATION_WEIGHTS.mobility);

  const wk = kingSquareOf(position, 'white');
  const bk = kingSquareOf(position, 'black');
  const whiteDanger =
    wk === null ? 0 : neighborSquares(wk).filter((sq) => black.targets.has(sq)).length;
  const blackDanger =
    bk === null ? 0 : neighborSquares(bk).filter((sq) => white.targets.has(sq)).length;
  const kingSafety = Math.round(
    (blackDanger - whiteDanger) * KING_DANGER_CP_PER_SQUARE * EVALUATION_WEIGHTS.kingSafety,
  );

  let citadel = 0;
  // Kontrol bonusu occupant'ın tarafına yazılır (tarafsız tanım).
  for (const slot of [position.citadels.topLeft, position.citadels.bottomRight]) {
    if (slot.occupant) {
      citadel +=
        slot.occupant.side === 'white' ? CITADEL_WEIGHTS.controlBonus : -CITADEL_WEIGHTS.controlBonus;
    }
  }
  // Kilit: legacy eşlemeye göre topLeft (sol) SİYAHIN, bottomRight (sağ) BEYAZIN
  // hisarıdır (bkz. Position.ts madde 3). sealedPenalty (sahibe −80) ile
  // sealedOpponentBonus (rakibe +80) AYNI kuralın iki yüzüdür:
  // kilitli hisar sahibine −80, rakibine +80 yazar.
  if (position.citadels.topLeft.sealed) citadel += CITADEL_WEIGHTS.sealedOpponentBonus; // siyah −80 → beyaz-göreli +80
  if (position.citadels.bottomRight.sealed) citadel += CITADEL_WEIGHTS.sealedPenalty; // beyaz −80
  // Erişim bonusu: şah (rakip) hisar giriş karelerindeyse.
  if (wk !== null && WHITE_ENTRY_SQUARES.includes(wk)) citadel += CITADEL_WEIGHTS.kingAccessBonus;
  if (bk !== null && BLACK_ENTRY_SQUARES.includes(bk)) citadel -= CITADEL_WEIGHTS.kingAccessBonus;
  const citadelControl = Math.round(citadel * EVALUATION_WEIGHTS.citadelControl);

  let activity = 0;
  for (let sq = 0; sq < 110; sq++) {
    const p = position.board[sq];
    if (!p || p.kind === PieceKind.King || p.kind === PieceKind.Pawn) continue;
    const c = squareToCoord(sq);
    if (c && c.col >= 3 && c.col <= 7 && c.row >= 3 && c.row <= 6) {
      activity += p.side === 'white' ? ACTIVITY_CP_PER_PIECE : -ACTIVITY_CP_PER_PIECE;
    }
  }
  const pieceActivity = Math.round(activity * EVALUATION_WEIGHTS.pieceActivity);

  const filesWhite = new Array<number>(11).fill(0);
  const filesBlack = new Array<number>(11).fill(0);
  for (let sq = 0; sq < 110; sq++) {
    const p = position.board[sq];
    if (!p || p.kind !== PieceKind.Pawn) continue;
    const c = squareToCoord(sq);
    if (!c) continue;
    if (p.side === 'white') filesWhite[c.col]++;
    else filesBlack[c.col]++;
  }
  let pawnStruct = 0;
  for (let f = 0; f < 11; f++) {
    if (filesWhite[f] > 1) pawnStruct += (filesWhite[f] - 1) * DOUBLED_PAWN_CP;
    if (filesBlack[f] > 1) pawnStruct -= (filesBlack[f] - 1) * DOUBLED_PAWN_CP;
  }
  const pawnStructure = Math.round(pawnStruct * EVALUATION_WEIGHTS.pawnStructure);

  const total = material + mobility + kingSafety + citadelControl + pieceActivity + pawnStructure;
  return { material, mobility, kingSafety, citadelControl, pieceActivity, pawnStructure, total };
}

/**
 * Tam skor, centipawn, **sideToMove lehine pozitif** (§7.3 konvansiyonu).
 * `search*` fonksiyonlarına `evaluate: fullEvaluate` olarak verilebilir.
 */
export function fullEvaluate(position: Position): number {
  const total = fullEvaluationBreakdown(position).total;
  return position.sideToMove === 'white' ? total : -total;
}
