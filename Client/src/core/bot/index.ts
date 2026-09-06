/**
 * Timur Chess Bot Engine (Minimax / Alpha-Beta Pruning)
 * Prepares async bot calculation, evaluation heuristics, and search depth controls
 */

import { GameState, Move, PlayerColor } from '../../types/chess';

export interface BotSearchOptions {
  depth: number;
  timeLimitMs?: number;
  color: PlayerColor;
}

export interface BotEvaluationResult {
  bestMove: Move | null;
  score: number;
  depthReached: number;
  nodesEvaluated: number;
}

/**
 * Heuristic material values for Timur Chess pieces
 */
export const PIECE_VALUES: Record<string, number> = {
  pawn: 100,
  general: 150,
  queen: 150,
  warMachine: 250,
  knight: 300,
  bishop: 300,
  camel: 320,
  picket: 350,
  giraffe: 400,
  rook: 500,
  king: 10000,
  prince: 400,
};
