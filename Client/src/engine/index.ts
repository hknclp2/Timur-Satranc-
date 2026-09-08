/**
 * Engine public API (v0.2: ID + TT + ordering + movetime + full eval + bot).
 */

export type {
  AnalysisResult,
  BestMoveResult,
  BotProfile,
  EngineInterface,
  PVLine,
  SearchLimits,
} from './EngineInterface';
export {
  EVALUATION_WEIGHTS,
  PIECE_VALUES_CP,
  evaluate,
  materialWhiteCp,
} from './evaluate';
export {
  MATE_SCORE,
  MAX_PLY,
  STALEMATE_WIN_SCORE,
  searchIterative,
  searchRoot,
  scoreRootMoves,
  type IterativeResult,
  type ScoredMove,
  type SearchOptions,
  type SearchResult,
} from './search';
export { TranspositionTable, TTFlag, isTTMove, type TTEntry } from './tt/transpositionTable';
export {
  CITADEL_WEIGHTS,
  fullEvaluate,
  fullEvaluationBreakdown,
  type FullEvalBreakdown,
} from './fullEvaluation';
export { DEFAULT_MAX_DEPTH, DEFAULT_SEARCH_DEPTH, TimurEngine } from './timurEngine';
