/**
 * Game Review worker hattı — tek mod (derinlemesine, derinlik SABİT 4).
 *
 * `GameReviewView` buradaki adapter üzerinden `analyzeFullGame`'i besler:
 * oyun-sonu incelemesi her ply için worker `analyze(position, { depth: 4 })`
 * çağrısı yapar; `gameAnalyzer.ts`'e DOKUNMADAN ince bir `findBestMove`
 * uyarlaması sunulur.
 *
 *  - İstekler `EngineClient` içinde `requestId` ile takip edilir;
 *    yarım kalan hesap `cancelPending()` ile durdurulur (cleanup'ta çağrılır).
 *  - Worker yoksa (SSR / eski tarayıcı / fabrika null) sessizce
 *    `TimurEngine` yoluna düşülür.
 */

import { useEffect, useMemo } from 'react';
import { TimurEngine } from '../engine/timurEngine';
import type {
  AnalysisResult,
  BestMoveResult,
  EngineInterface,
  SearchLimits,
} from '../engine/EngineInterface';
import type { Position } from '../core/position/Position';
import {
  getSharedEngineClient,
  type Cancellable,
  type EngineClient,
} from '../worker/engineClient';
import {
  createBrowserWorker,
  isWorkerSupported,
} from '../worker/createBrowserWorker';

/** Derinlemesine tek mod — kullanıcı seçeneği YOK (karar). */
export const REVIEW_ANALYSIS_DEPTH = 4;

export interface ReviewEngine extends Pick<EngineInterface, 'findBestMove'> {
  /** Devam eden worker isteğini (varsa) iptal et. */
  cancelPending: () => void;
  /** true: worker hattı; false: sessiz TimurEngine fallback'u. */
  readonly isWorkerBacked: boolean;
}

function tryGetSharedClient(): EngineClient | null {
  try {
    if (!isWorkerSupported()) return null;
    return getSharedEngineClient(() => {
      try {
        return createBrowserWorker();
      } catch {
        return null;
      }
    });
  } catch {
    return null;
  }
}

/**
 * `analyzeFullGame(engine, ...)` imzasına uyan ince adapter.
 * Worker yolunda `findBestMove` çağrısı `client.analyze(pos, { depth: 4 })`
 * sonucunu `BestMoveResult` şekline çevirir; fallback yolunda aynı
 * derinlikle doğrudan `TimurEngine` çalışır.
 */
export function createReviewEngine(): ReviewEngine {
  const client = tryGetSharedClient();
  if (!client) {
    const fallback = new TimurEngine();
    return {
      isWorkerBacked: false,
      cancelPending: () => undefined,
      findBestMove: (
        position: Position,
        _limits?: SearchLimits,
      ): Promise<BestMoveResult> =>
        fallback.findBestMove(position, { depth: REVIEW_ANALYSIS_DEPTH }),
    };
  }

  let active: Cancellable<AnalysisResult> | null = null;
  return {
    isWorkerBacked: true,
    cancelPending: () => {
      try {
        active?.cancel();
      } catch {
        /* yoksay */
      } finally {
        active = null;
      }
    },
    findBestMove: async (
      position: Position,
      _limits?: SearchLimits,
    ): Promise<BestMoveResult> => {
      void _limits;
      const req = client.analyze(position, { depth: REVIEW_ANALYSIS_DEPTH });
      active = req;
      try {
        const res = await req;
        return {
          bestMove: res.bestMove,
          evaluationCp: res.evaluationCp,
          depthReached: res.depthReached,
          nodesSearched: res.nodesSearched,
          timeMs: res.timeMs,
          principalVariation: res.principalVariation,
        };
      } finally {
        if (active === req) active = null;
      }
    },
  };
}

/** İptal / dispose reddi mi? (StrictMode ilk çalışması + unmount sessiz geçer.) */
export function isReviewCancelledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /cancelled|disposed|gönderilemedi/i.test(msg);
}

/**
 * Kalıcı worker motoru isteyen bileşenler için.
 * Unmount'ta yarım kalan hesabı durdurur.
 */
export function useReviewEngine(): ReviewEngine {
  const engine = useMemo(() => createReviewEngine(), []);
  useEffect(() => () => engine.cancelPending(), [engine]);
  return engine;
}
