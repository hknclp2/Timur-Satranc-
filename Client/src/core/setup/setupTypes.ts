/**
 * Setup System — Types (Oyun motorundan bağımsız)
 *
 * Serbest Dizilim editörü ile oyun motoru arasındaki sözleşme.
 * İleride analiz motoru / FEN import-export bu tipler üzerinden eklenecek.
 */

import type { BoardMatrix, CitadelState, PieceType, PlayerColor } from '../../types/chess';

export interface PaletteSelection {
  type: PieceType;
  color: PlayerColor;
}

export interface SetupPosition {
  board: BoardMatrix;
  citadels: CitadelState;
  startingTurn: PlayerColor;
}

export interface SetupGameConfig extends SetupPosition {
  whiteName: string;
  blackName: string;
  initialTimeSeconds: number;
  incrementSeconds: number;
  boardRotates: boolean;
}

/** Editörden oyuna geçerken App.tsx'in beklediği config şekli */
export type StartFromSetupConfig = SetupGameConfig;

export interface SetupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Gelecek: analiz motoru bu arayüzü kullanacak */
export interface SetupAnalyzer {
  validate(position: SetupPosition): SetupValidationResult;
}
