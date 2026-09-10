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
  EngineClient,
  getSharedEngineClient,
  type Cancellable,
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
  /** Havuzlu motorlarda worker'ları sonlandırır (tekil motorlarda tanımsız). */
  dispose?: () => void;
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

/** Paralel analiz havuzu boyutu: çekirdek sayısına göre, 2–6 aralığında. */
export function getReviewEnginePoolSize(): number {
  let cores = 4;
  try {
    const hc = (globalThis as unknown as { navigator?: { hardwareConcurrency?: unknown } })
      .navigator?.hardwareConcurrency;
    if (typeof hc === 'number' && Number.isFinite(hc) && hc > 0) {
      cores = Math.floor(hc);
    }
  } catch {
    /* yoksay — varsayılan 4 çekirdek */
  }
  return Math.min(6, Math.max(2, cores - 1));
}

/**
 * Paralel review motoru: her biri kendi worker'ında N bağımsız istemci.
 * Hamle aramaları round-robin dağıtılır; arama deterministik olduğu için
 * sonuçlar seri çalışmayla birebir aynıdır, duvar-saati ~N'de birine iner.
 * Worker kurulamazsa sessizce seri `createReviewEngine` yoluna düşülür.
 */
export function createReviewEnginePool(size: number = getReviewEnginePoolSize()): ReviewEngine {
  const count = Math.max(1, Math.floor(size));
  const clients: EngineClient[] = [];
  try {
    if (!isWorkerSupported()) throw new Error('worker desteklenmiyor');
    for (let i = 0; i < count; i++) {
      const worker = createBrowserWorker();
      if (!worker) throw new Error('worker üretilemedi');
      clients.push(new EngineClient(() => worker));
    }
  } catch {
    for (const c of clients) {
      try {
        c.dispose();
      } catch {
        /* yoksay */
      }
    }
    return createReviewEngine();
  }

  let cursor = 0;
  let active: Cancellable<AnalysisResult>[] = [];
  const untrack = (req: Cancellable<AnalysisResult>): void => {
    const idx = active.indexOf(req);
    if (idx >= 0) active.splice(idx, 1);
  };
  const cancelAll = (): void => {
    const pending = active;
    active = [];
    for (const req of pending) {
      try {
        req.cancel();
      } catch {
        /* yoksay */
      }
    }
  };

  return {
    isWorkerBacked: true,
    cancelPending: cancelAll,
    dispose: () => {
      cancelAll();
      for (const c of clients) {
        try {
          c.dispose();
        } catch {
          /* yoksay */
        }
      }
    },
    findBestMove: (position: Position, _limits?: SearchLimits): Promise<BestMoveResult> => {
      void _limits;
      const client = clients[cursor++ % clients.length];
      const req = client.analyze(position, { depth: REVIEW_ANALYSIS_DEPTH });
      active.push(req);
      return req.then(
        (res) => {
          untrack(req);
          return {
            bestMove: res.bestMove,
            evaluationCp: res.evaluationCp,
            depthReached: res.depthReached,
            nodesSearched: res.nodesSearched,
            timeMs: res.timeMs,
            principalVariation: res.principalVariation,
          };
        },
        (err) => {
          untrack(req);
          throw err;
        },
      );
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
