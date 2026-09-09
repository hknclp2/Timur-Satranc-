/**
 * Engine — TimurEngine v0.1: `EngineInterface` implementasyonu (sync TS motor).
 *
 * §3.7 notu: WASM zorunlu başlangıç şartı değil — önce TS referans motor +
 * benchmark. Bu sınıf o referans motordur; arayüz sabit kalır.
 */

import type { Position } from '../core/position/Position';
import { generateLegalMoves } from '../core/rules/generateLegalMoves';
import {
  MATE_SCORE,
  scoreRootMoves,
  searchIterative,
  searchRoot,
  type ScoredMove,
} from './search';
import type {
  AnalysisResult,
  BestMoveResult,
  BotProfile,
  EngineInterface,
  SearchLimits,
} from './EngineInterface';

export const DEFAULT_SEARCH_DEPTH = 3;
/** ID'de derinlik üst sınırı (`depth` verilmezse; V profili movetime ile sınırlar). */
export const DEFAULT_MAX_DEPTH = 64;

/**
 * Engine arama opsiyonları (hardening): özel değerlendirme fonksiyonu.
 * Verilmezse materyal `evaluate` kullanılır (varsayılan davranış korunur).
 * Kullanım: `findBestMove(pos, limits, undefined, { evaluate: fullEvaluate })`
 * ya da `findBestMove(pos, limits, { evaluate: fullEvaluate })`.
 */
export interface TimurEngineSearchOpts {
  evaluate?: (position: Position) => number;
}

/** `findBestMove` 3. parametresinin opts mu profil mi olduğunu ayırt eder. */
function splitProfileOpts(
  profileOrOpts?: BotProfile | TimurEngineSearchOpts,
  maybeOpts?: TimurEngineSearchOpts,
): { profile?: BotProfile; opts?: TimurEngineSearchOpts } {
  if (
    profileOrOpts !== undefined &&
    profileOrOpts !== null &&
    typeof profileOrOpts === 'object' &&
    'evaluate' in (profileOrOpts as Record<string, unknown>)
  ) {
    return { profile: undefined, opts: profileOrOpts as TimurEngineSearchOpts };
  }
  return { profile: profileOrOpts as BotProfile | undefined, opts: maybeOpts };
}

export class TimurEngine implements EngineInterface {
  async findBestMove(
    position: Position,
    limits: SearchLimits,
    profile?: BotProfile,
    opts?: TimurEngineSearchOpts,
  ): Promise<BestMoveResult>;
  async findBestMove(
    position: Position,
    limits: SearchLimits,
    opts?: TimurEngineSearchOpts,
  ): Promise<BestMoveResult>;
  async findBestMove(
    position: Position,
    limits: SearchLimits,
    profileOrOpts?: BotProfile | TimurEngineSearchOpts,
    maybeOpts?: TimurEngineSearchOpts,
  ): Promise<BestMoveResult> {
    const { profile: _profile, opts } = splitProfileOpts(profileOrOpts, maybeOpts);
    void _profile;
    if (generateLegalMoves(position).length === 0) {
      throw new Error('TimurEngine.findBestMove: legal hamle yok (oyun bitmiş olabilir)');
    }
    const started = Date.now();
    if (limits.movetimeMs !== undefined) {
      // Iterative deepening: süre dolunca son tamamlanan derinlik döner.
      const maxDepth = limits.depth ?? DEFAULT_MAX_DEPTH;
      const r = searchIterative(position, {
        maxDepth,
        deadlineMs: started + Math.max(1, limits.movetimeMs),
        nodeLimit: limits.nodes,
        evaluate: opts?.evaluate,
      });
      if (r.pv.length === 0) {
        throw new Error('TimurEngine.findBestMove: arama hat döndürmedi');
      }
      return {
        bestMove: r.pv[0],
        evaluationCp: r.score,
        depthReached: r.depthReached,
        nodesSearched: r.nodes,
        timeMs: Date.now() - started,
        principalVariation: r.pv,
      };
    }
    const depth = limits.depth ?? DEFAULT_SEARCH_DEPTH;
    const { score, pv, nodes } = searchRoot(position, depth, {
      nodeLimit: limits.nodes,
      evaluate: opts?.evaluate,
    });
    if (pv.length === 0) {
      throw new Error('TimurEngine.findBestMove: arama hat döndürmedi');
    }
    return {
      bestMove: pv[0],
      evaluationCp: score,
      depthReached: Math.max(1, Math.floor(depth)),
      nodesSearched: nodes,
      timeMs: Date.now() - started,
      principalVariation: pv,
    };
  }

  async analyze(position: Position, limits: SearchLimits): Promise<AnalysisResult>;
  async analyze(
    position: Position,
    limits: SearchLimits,
    opts?: TimurEngineSearchOpts,
  ): Promise<AnalysisResult>;
  async analyze(
    position: Position,
    limits: SearchLimits,
    opts?: TimurEngineSearchOpts,
  ): Promise<AnalysisResult> {
    const best = await this.findBestMove(position, limits, undefined, opts);
    return {
      position,
      bestMove: best.bestMove,
      evaluationCp: best.evaluationCp,
      depthReached: best.depthReached,
      nodesSearched: best.nodesSearched,
      timeMs: best.timeMs,
      principalVariation: best.principalVariation,
    };
  }

  /**
   * Kök adaylarını skorlar (skora göre AZALAN sıra). Bot top-N havuzu için.
   * NOT: `EngineInterface` DIŞINDA, TimurEngine'e özgü metottur (bot katmanı
   * somut motoru kullanır; WASM motoru aynı metodu sağlayacaktır — §3.7).
   * Skorlar budamalı arama ürünüdür (fail-soft bound olabilir); sıralama
   * yaklaşıktır, mat/pat skorları kesindir.
   */
  findTopMoves(
    position: Position,
    opts: { depth: number; movetimeMs?: number },
  ): { scored: ScoredMove[]; nodes: number; completed: boolean } {
    const started = Date.now();
    const r = scoreRootMoves(position, opts.depth, {
      deadlineMs: opts.movetimeMs !== undefined ? started + Math.max(1, opts.movetimeMs) : undefined,
    });
    r.scored.sort((a, b) => b.score - a.score);
    return r;
  }

  cancel(_requestId: string): void {
    // Senkron v0.1 aramada iptal edilecek asenkron iş yok (Faz 6 Worker).
  }
}

/** Mat eşiği testi için dışa açık sabit (testler `evaluationCp >= MATE_SCORE - MAX` kullanır). */
export { MATE_SCORE };
