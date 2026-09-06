/**
 * Timur Chess Rule Engine
 * Handles move generation, legal moves validation, board state transitions, check/checkmate detection
 */

import { BoardMatrix, BoardPosition, GameState, Move, Piece, PieceType, PlayerColor } from '../../types/chess';

export const BOARD_COLS = 11;
export const BOARD_ROWS = 10;

/**
 * Checks if coordinates are within the main 11x10 board
 */
export function isWithinBoard(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_COLS && y >= 0 && y < BOARD_ROWS;
}

/**
 * Validates if a position is valid (either on the 11x10 board or in one of the 2 Citadels)
 */
export function isValidPosition(pos: BoardPosition): boolean {
  if (pos.isCitadel) {
    return Boolean(pos.citadelSide);
  }
  return isWithinBoard(pos.x, pos.y);
}

/**
 * Creates a fresh initial empty 11x10 board matrix
 */
export function createEmptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLS }, () => null));
}

export * from './boardSetup';
export * from './moveRules';
