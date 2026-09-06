/**
 * Timur Chess Material Score & Advantage Calculator
 * 
 * Provides extensible material value heuristics and net advantage calculations
 * for standard and custom Timur Chess piece sets.
 */

import { Piece, PieceType, PlayerColor } from '../../types/chess';

export const DEFAULT_TIMUR_PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  general: 2,
  queen: 2,
  warMachine: 3,
  knight: 3,
  bishop: 3,
  camel: 3,
  picket: 3,
  giraffe: 4,
  rook: 5,
  king: 0, // King value is non-material (royal)
  prince: 4, // Prince value
};

export interface MaterialAdvantageResult {
  whiteAdvantage: number; // Positive if White has higher material, negative if Black has higher
  whiteScore: number;     // Total material points captured by White (Black pieces taken)
  blackScore: number;     // Total material points captured by Black (White pieces taken)
  leader: PlayerColor | 'equal';
  advantage: number;      // Absolute difference (e.g. 3)
}

export class MaterialCalculator {
  private values: Record<PieceType, number>;

  constructor(customValues?: Partial<Record<PieceType, number>>) {
    this.values = {
      ...DEFAULT_TIMUR_PIECE_VALUES,
      ...customValues,
    };
  }

  /**
   * Gets the material score for a single piece type
   */
  public getPieceValue(type: PieceType): number {
    return this.values[type] ?? 1;
  }

  /**
   * Computes the total material value of a list of pieces
   */
  public calculateTotal(pieces: Piece[]): number {
    return pieces.reduce((sum, p) => sum + this.getPieceValue(p.type), 0);
  }

  /**
   * Computes material advantage between two players given the captured pieces.
   * Note:
   * `capturedPieces.black` = Black pieces captured BY White (White's score)
   * `capturedPieces.white` = White pieces captured BY Black (Black's score)
   */
  public calculateAdvantage(capturedPieces: {
    white: Piece[]; // White pieces captured by Black
    black: Piece[]; // Black pieces captured by White
  }): MaterialAdvantageResult {
    const whiteScore = this.calculateTotal(capturedPieces.black);
    const blackScore = this.calculateTotal(capturedPieces.white);
    const diff = whiteScore - blackScore;

    let leader: PlayerColor | 'equal' = 'equal';
    if (diff > 0) leader = 'white';
    else if (diff < 0) leader = 'black';

    return {
      whiteAdvantage: diff,
      whiteScore,
      blackScore,
      leader,
      advantage: Math.abs(diff),
    };
  }

  /**
   * Groups a list of captured pieces by type and returns their counts
   */
  public groupPieces(pieces: Piece[]): Record<PieceType, number> {
    const counts: Partial<Record<PieceType, number>> = {};
    for (const piece of pieces) {
      counts[piece.type] = (counts[piece.type] || 0) + 1;
    }
    return counts as Record<PieceType, number>;
  }
}

// Global default singleton instance
export const defaultMaterialCalculator = new MaterialCalculator();
