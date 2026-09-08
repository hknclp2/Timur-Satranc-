/**
 * Worker protokolü (docs/mimari.md §7.4).
 *
 * Kimlik: her istek `requestId` taşır; ana thread bekleyen istekleri
 * `Map<requestId, {resolve, reject}>` ile izler. `bigint` hash, WASM uyumu
 * için `string` taşınır (spec §7.4).
 */

import type { BotProfileId } from '../bot/profiles';
import type { AnalysisResult, BestMoveResult, SearchLimits } from '../engine/EngineInterface';
import type { Position } from '../core/position/Position';

/** `Position`ın `postMessage`/`structuredClone` ile taşınabilir hâli. */
export interface SerializedPosition {
  board: Position['board'];
  sideToMove: Position['sideToMove'];
  citadels: Position['citadels'];
  flags: Position['flags'];
  zobristHash: string; // bigint → string (§7.4)
}

export function serializePosition(position: Position): SerializedPosition {
  return {
    board: position.board,
    sideToMove: position.sideToMove,
    citadels: position.citadels,
    flags: position.flags,
    zobristHash: position.zobristHash.toString(),
  };
}

export function deserializePosition(sp: SerializedPosition): Position {
  return {
    board: sp.board,
    sideToMove: sp.sideToMove,
    citadels: sp.citadels,
    flags: sp.flags,
    zobristHash: BigInt(sp.zobristHash),
  };
}

// ---- Ana Thread → Worker ----

export interface FindBestMoveRequest {
  type: 'find_best_move';
  requestId: string;
  position: SerializedPosition;
  profileId: BotProfileId;
  /** Profil bütçesini ezer (test için). */
  movetimeMs?: number;
  /** Profil derinliğini ezer (test için). */
  maxDepth?: number;
}

export interface AnalyzeRequest {
  type: 'analyze';
  requestId: string;
  position: SerializedPosition;
  limits: SearchLimits;
}

export interface CancelRequest {
  /** İptal edilecek isteğin requestId'si. */
  type: 'cancel';
  requestId: string;
}

export interface InitRequest {
  type: 'init';
  requestId: string;
}

export type WorkerRequest = FindBestMoveRequest | AnalyzeRequest | CancelRequest | InitRequest;

// ---- Worker → Ana Thread ----

export interface ReadyResponse {
  type: 'ready';
  requestId: string;
}

export interface BestMoveResultResponse {
  type: 'best_move_result';
  requestId: string;
  result: BestMoveResult;
}

export interface AnalysisResultResponse {
  type: 'analysis_result';
  requestId: string;
  result: AnalysisResult;
}

export interface CancelledResponse {
  type: 'cancelled';
  requestId: string;
}

export interface ErrorResponse {
  type: 'error';
  requestId: string;
  message: string;
}

export type WorkerResponse =
  | ReadyResponse
  | BestMoveResultResponse
  | AnalysisResultResponse
  | CancelledResponse
  | ErrorResponse;
