/**
 * Web Worker for Asynchronous Bot Calculation & Move Analysis
 */

import { GameState, Move, PlayerColor } from '../types/chess';

export interface WorkerCalculatePayload {
  type: 'CALCULATE_BEST_MOVE';
  gameState: GameState;
  depth: number;
  color: PlayerColor;
  timeLimitMs?: number;
}

export interface WorkerResponsePayload {
  type: 'BEST_MOVE_RESULT';
  bestMove: Move | null;
  score: number;
  depth: number;
  evaluationTimeMs: number;
}

// Worker event listener
self.onmessage = (event: MessageEvent<WorkerCalculatePayload>) => {
  const { type, depth, color } = event.data;
  if (type === 'CALCULATE_BEST_MOVE') {
    const startTime = performance.now();

    // Placeholder calculation response (to be connected with core/bot evaluation engine)
    const response: WorkerResponsePayload = {
      type: 'BEST_MOVE_RESULT',
      bestMove: null,
      score: 0,
      depth,
      evaluationTimeMs: performance.now() - startTime,
    };

    self.postMessage(response);
  }
};
