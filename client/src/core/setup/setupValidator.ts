/**
 * Setup System — Validation (oyundan bağımsız, saf fonksiyonlar)
 * İleride analiz motoru buraya bağlanacak.
 */

import type { SetupPosition } from './setupTypes';

export function validateSetupPosition(position: SetupPosition): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  let whiteKing = 0;
  let blackKing = 0;
  let totalPieces = 0;

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 11; x++) {
      const p = position.board?.[y]?.[x];
      if (!p) continue;
      totalPieces++;
      if (p.type === 'king' && p.color === 'white') whiteKing++;
      if (p.type === 'king' && p.color === 'black') blackKing++;
    }
  }

  if (position.citadels.whiteCitadelPiece?.type === 'king') {
    if (position.citadels.whiteCitadelPiece.color === 'white') whiteKing++;
    else blackKing++;
  }
  if (position.citadels.blackCitadelPiece?.type === 'king') {
    if (position.citadels.blackCitadelPiece.color === 'black') blackKing++;
    else whiteKing++;
  }

  if (totalPieces === 0) {
    errors.push('Tahta boş. En az birer şah dizmelisiniz.');
  }
  if (whiteKing === 0) errors.push('Beyaz şah eksik.');
  if (blackKing === 0) errors.push('Siyah şah eksik.');
  if (whiteKing > 1) warnings.push('Beyaz şah sayısı 1’den fazla.');
  if (blackKing > 1) warnings.push('Siyah şah sayısı 1’den fazla.');

  return { valid: errors.length === 0, errors, warnings };
}
