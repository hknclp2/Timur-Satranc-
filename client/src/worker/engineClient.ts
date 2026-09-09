/**
 * Engine istemcisi — ana thread API'si (docs/mimari.md §7.4).
 *
 *  - `requestId` üretir (`crypto.randomUUID`, yoksa sayaç-fallback).
 *  - Bekleyen istekleri `Map<requestId, {resolve, reject}>` ile izler;
 *    yanıt gelince ilgili promise çözülür/reddedilir ve map'ten silinir.
 *  - `ready` el-sıkışması: istekler worker hazır olmadan GÖNDERİLMEZ.
 *  - İstekler iptal edilebilir: `{ promise, requestId, cancel }` döner.
 *    `cancel()` worker'a `cancel` mesajı yollar + yerel promise'i reddeder;
 *    geç gelen worker yanıtı eşleşme bulamaz, sessizce düşer.
 *  - Worker oluşturma ENJEKTE edilir (üretimde `createBrowserWorker`,
 *    testte sahte) — bu dosya `Worker`/`import.meta` içermez, node'da
 *    test edilebilir.
 */

import type { BotProfileId } from '../bot/profiles';
import type { AnalysisResult, BestMoveResult, SearchLimits } from '../engine/EngineInterface';
import type { Position } from '../core/position/Position';
import {
  serializePosition,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol';

/** engineClient'ın konuştuğu minimal Worker yüzeyi (gerçek + sahte). */
export interface WorkerLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  terminate?: () => void;
}

export interface Cancellable<T> extends Promise<T> {
  requestId: string;
  cancel: () => void;
}

interface Pending {
  resolve: (value: never) => void;
  reject: (err: never) => void;
}

let fallbackCounter = 0;

export function newRequestId(): string {
  try {
    const cryptoApi = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  } catch {
    /* yoksay, fallback'e düş */
  }
  fallbackCounter += 1;
  return `req-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}

export class EngineClient {
  private readonly worker: WorkerLike;
  private readonly pending = new Map<string, Pending>();
  private readonly readyPromise: Promise<void>;
  private disposed = false;

  constructor(createWorker: () => WorkerLike) {
    this.worker = createWorker();
    this.worker.onmessage = (event) => {
      this.handleMessage(event.data as WorkerResponse);
    };
    const initId = newRequestId();
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.pending.set(initId, {
        resolve: (() => resolve()) as never,
        reject: reject as never,
      });
    });
    this.worker.postMessage({ type: 'init', requestId: initId } satisfies WorkerRequest);
  }

  private handleMessage(res: WorkerResponse): void {
    if (!res || typeof res !== 'object') return;
    const entry = this.pending.get(res.requestId);
    if (!entry) return; // iptal edilmiş/geç yanıt — sessizce düşür
    switch (res.type) {
      case 'ready':
      case 'cancelled':
        this.pending.delete(res.requestId);
        if (res.type === 'ready') entry.resolve(undefined as never);
        else entry.reject(new Error('Engine request cancelled') as never);
        break;
      case 'best_move_result':
      case 'analysis_result':
        this.pending.delete(res.requestId);
        entry.resolve(res.result as never);
        break;
      case 'error':
        this.pending.delete(res.requestId);
        entry.reject(new Error(res.message) as never);
        break;
      default:
        break; // bilinmeyen yanıt — yoksay
    }
  }

  private track<T>(requestId: string): { promise: Promise<T>; cancel: () => void } {
    let cancelFn: () => void = () => undefined;
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: resolve as never,
        reject: reject as never,
      });
      cancelFn = () => this.cancel(requestId);
    });
    return { promise, cancel: () => cancelFn() };
  }

  private async send<R extends WorkerRequest>(req: R): Promise<void> {
    await this.readyPromise;
    if (this.disposed) throw new Error('EngineClient disposed');
    this.worker.postMessage(req);
  }

  findBestMove(
    position: Position,
    profileId: BotProfileId,
    opts: { movetimeMs?: number; maxDepth?: number } = {},
  ): Cancellable<BestMoveResult> {
    const requestId = newRequestId();
    const { promise, cancel } = this.track<BestMoveResult>(requestId);
    const out = promise as Cancellable<BestMoveResult>;
    (out as { requestId?: string }).requestId = requestId;
    (out as { cancel?: () => void }).cancel = cancel;
    void this.send({
      type: 'find_best_move',
      requestId,
      position: serializePosition(position),
      profileId,
      ...(opts.movetimeMs !== undefined ? { movetimeMs: opts.movetimeMs } : {}),
      ...(opts.maxDepth !== undefined ? { maxDepth: opts.maxDepth } : {}),
    }).catch(() => {
      const entry = this.pending.get(requestId);
      if (entry) {
        this.pending.delete(requestId);
        entry.reject(new Error('EngineClient: istek gönderilemedi') as never);
      }
    });
    return out;
  }

  analyze(position: Position, limits: SearchLimits = {}): Cancellable<AnalysisResult> {
    const requestId = newRequestId();
    const { promise, cancel } = this.track<AnalysisResult>(requestId);
    const out = promise as Cancellable<AnalysisResult>;
    (out as { requestId?: string }).requestId = requestId;
    (out as { cancel?: () => void }).cancel = cancel;
    void this.send({
      type: 'analyze',
      requestId,
      position: serializePosition(position),
      limits,
    }).catch(() => {
      const entry = this.pending.get(requestId);
      if (entry) {
        this.pending.delete(requestId);
        entry.reject(new Error('EngineClient: istek gönderilemedi') as never);
      }
    });
    return out;
  }

  /** Hedef isteği iptal et: worker'a bildir + yerel promise'i reddet. */
  cancel(requestId: string): void {
    const entry = this.pending.get(requestId);
    if (!entry) return;
    this.pending.delete(requestId);
    try {
      this.worker.postMessage({ type: 'cancel', requestId } satisfies WorkerRequest);
    } catch {
      /* yoksay */
    }
    entry.reject(new Error('Engine request cancelled') as never);
  }

  dispose(): void {
    this.disposed = true;
    for (const [id, entry] of this.pending) {
      this.pending.delete(id);
      entry.reject(new Error('EngineClient disposed') as never);
    }
    try {
      this.worker.terminate?.();
    } catch {
      /* yoksay */
    }
  }
}

let sharedClient: EngineClient | null = null;

/**
 * Paylaşılan istemci (uygulamada tek worker yeterli). `createWorker`
 * SADECE ilk çağrıda kullanılır; Worker yoksa (SSR/test) null döner.
 */
export function getSharedEngineClient(
  createWorker: () => WorkerLike | null,
): EngineClient | null {
  if (sharedClient) return sharedClient;
  const worker = createWorker();
  if (!worker) return null;
  sharedClient = new EngineClient(() => worker);
  return sharedClient;
}

/** Test izolasyonu: paylaşılan istemciyi sıfırla. */
export function resetSharedEngineClient(): void {
  sharedClient?.dispose();
  sharedClient = null;
}
