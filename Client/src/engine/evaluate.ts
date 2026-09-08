/**
 * Engine — değerlendirme v0.1: SADECE MATERYAL (§7.6).
 *
 * Ölçek: centipawn, 1 piyade = 100cp. Taş değerleri §7.6 v1 katsayılarıdır
 * (self-play ile kalibre edilecek başlangıç varsayımları — mimarinin kendi
 * kalibrasyon notu geçerlidir).
 *
 * v0.1'de KULLANILMAYAN §7.6 bileşenleri (Faz 3+/Engine v0.2 işi):
 * mobility, kingSafety, citadelControl, pieceActivity, pawnStructure.
 * `EVALUATION_WEIGHTS` spec kaydı için tutulur; motor yalnız `material`i okur.
 */

import {
  PieceKind,
  type Position,
} from '../core/position/Position';

export const EVALUATION_WEIGHTS = {
  material: 1.0, // v0.1'de kullanılan TEK bileşen
  mobility: 0.1,
  kingSafety: 0.3,
  citadelControl: 0.4, // Timur'a özgü, yüksek ağırlık (ileride)
  pieceActivity: 0.15,
  pawnStructure: 0.1,
} as const;

/** Taş değerleri, centipawn (§7.6 v1 tablosu). */
export const PIECE_VALUES_CP: Record<PieceKind, number> = {
  [PieceKind.King]: 0, // materyale dahil edilmez (oyun sonu koşulu)
  [PieceKind.General]: 950, // Vezir — en güçlü figür varsayımı
  [PieceKind.Ferz]: 300,
  [PieceKind.Rook]: 500,
  [PieceKind.Knight]: 300,
  [PieceKind.Alfil]: 200, // sınırlı sıçrama menzili
  [PieceKind.Camel]: 250,
  [PieceKind.Dabbaba]: 200,
  [PieceKind.Giraffe]: 350,
  [PieceKind.Picket]: 150, // en zayıf figür varsayımı
  [PieceKind.Pawn]: 100, // 11 piyade türü için tek tip başlangıç değeri
  // --- LEGACY EXTENSION: spec §7.6'da Prince YOK (terfi ürünü, §7.1 notu).
  // Değersiz bırakılamazdı (terfili konumlar yanlış okunurdu); legacy bot
  // tablosundaki 400cp alındı. Self-play kalibrasyonunda revize edilecek.
  [PieceKind.Prince]: 400,
};

/** Beyaz-pozitif materyal farkı (cp). Hisar occupant'ları dahildir (board[110/111]). */
export function materialWhiteCp(position: Position): number {
  let score = 0;
  const board = position.board;
  for (let sq = 0; sq < board.length; sq++) {
    const p = board[sq];
    if (!p) continue;
    const v = PIECE_VALUES_CP[p.kind] ?? 0;
    score += p.side === 'white' ? v : -v;
  }
  return Math.round(score * EVALUATION_WEIGHTS.material);
}

/**
 * Pozisyon skoru, centipawn, **sideToMove lehine pozitif** (§7.3 konvansiyonu).
 * Sessiz (non-terminal) düğümler içindir; mat/pat/draw skorlaması `search.ts`'tedir.
 */
export function evaluate(position: Position): number {
  const whiteCp = materialWhiteCp(position);
  return position.sideToMove === 'white' ? whiteCp : -whiteCp;
}
