/**
 * Engine Worker (docs/mimari.md §3.7 + §7.4): ağır hesap burada, ana thread
 * bloklanmaz. İçeride Engine + Bot birlikte çalışır (§3.2 ilke 3).
 *
 *  - `find_best_move`: profil bütçesiyle MANUEL iterative deepening
 *    (derinlik 1'den başlar; `searchIterative` kullanılmaz çünkü botun
 *    top-N aday listesine ihtiyacı var). Derinlik-ARASI iptal kontrolü
 *    (spec §7.4 MVP: basit Set bayrağı; SharedArrayBuffer YOK).
 *  - `analyze`: aynı engine, farklı çağrı (§3.6).
 *  - `cancel`: hedef requestId'yi iptal kümesine yazar; derinlik bitiminde
 *    `cancelled` yanıtı döner. Derinlik-İÇİ kesinti YOK (Faz 7 işi).
 *
 * Node testleri için handler'lar export edilir; `self.onmessage` bağlantısı
 * sadece worker bağlamında kurulur (`typeof self` guard).
 */

import { TimurEngine } from '../engine/timurEngine';
import { MATE_SCORE, MAX_PLY, scoreRootMoves, type ScoredMove } from '../engine/search';
import { TranspositionTable } from '../engine/tt/transpositionTable';
import { BOT_PROFILES, type BotProfileId } from '../bot/profiles';
import { applyProfileSelection } from '../bot/selectMoveWithProfile';
import {
  deserializePosition,
  type AnalyzeRequest,
  type FindBestMoveRequest,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol';

/** İptal kümesi — derinlik-arası kontrol bayrağı (spec §7.4 MVP). */
const cancelledIds = new Set<string>();
const engine = new TimurEngine();

function argmax(scored: ScoredMove[]): ScoredMove {
  let best = scored[0];
  for (const s of scored) {
    if (s.score > best.score) best = s;
  }
  return best;
}

function errorResponse(requestId: string, message: string): WorkerResponse {
  return { type: 'error', requestId, message };
}

/**
 * Profil bot araması: manuel ID + son tamamlanan derinlikte profil seçimi.
 * `cancelled` kümesi dışarıdan enjekte edilebilir (test) ya da modül
 * kümesi kullanılır (gerçek worker).
 */
export async function handleFindBestMove(
  req: FindBestMoveRequest,
  cancelled: Set<string> = cancelledIds,
): Promise<WorkerResponse> {
  const profile = BOT_PROFILES[req.profileId as BotProfileId];
  if (!profile) {
    return errorResponse(req.requestId, `Bilinmeyen profil: ${req.profileId}`);
  }
  const movetimeMs = req.movetimeMs ?? profile.movetimeMs;
  const maxDepth = Math.min(req.maxDepth ?? profile.maxDepth, MAX_PLY);
  const deadline = Date.now() + Math.max(1, movetimeMs);
  const position = deserializePosition(req.position);

  const tt = new TranspositionTable();
  let last: ScoredMove[] | null = null;
  let depthReached = 0;
  let nodes = 0;
  const started = Date.now();

  for (let d = 1; d <= maxDepth; d++) {
    if (cancelled.has(req.requestId)) {
      cancelled.delete(req.requestId);
      return { type: 'cancelled', requestId: req.requestId };
    }
    if (Date.now() > deadline) break;
    const r = scoreRootMoves(position, d, { deadlineMs: deadline, tt });
    nodes += r.nodes;
    if (r.scored.length === 0) break; // hamle yok
    if (r.completed) {
      last = r.scored;
      depthReached = d;
      if (argmax(r.scored).score > MATE_SCORE - MAX_PLY) break; // zorunlu mat
    } else {
      break; // yarım iterasyon atılır, önceki tamamlanan kullanılır
    }
  }
  if (cancelled.has(req.requestId)) {
    cancelled.delete(req.requestId);
    return { type: 'cancelled', requestId: req.requestId };
  }
  if (!last) {
    return errorResponse(req.requestId, 'Aday hamle üretilemedi (oyun bitmiş olabilir)');
  }

  const selected = applyProfileSelection(last, profile, position, Math.random);
  const argmaxScore = argmax(last).score;
  const pickedPv = last.find((s) => s.move.from === selected.move.from && s.move.to === selected.move.to)?.pv ?? [];
  return {
    type: 'best_move_result',
    requestId: req.requestId,
    result: {
      bestMove: selected.move,
      evaluationCp: selected.engineScore ?? argmaxScore,
      depthReached,
      nodesSearched: nodes,
      timeMs: Date.now() - started,
      principalVariation: pickedPv,
      selection: selected.kind,
    },
  };
}

export async function handleAnalyze(req: AnalyzeRequest): Promise<WorkerResponse> {
  try {
    const result = await engine.analyze(deserializePosition(req.position), req.limits ?? {});
    return { type: 'analysis_result', requestId: req.requestId, result };
  } catch (err) {
    return errorResponse(req.requestId, err instanceof Error ? err.message : String(err));
  }
}

async function route(req: WorkerRequest): Promise<WorkerResponse | null> {
  switch (req.type) {
    case 'init':
      return { type: 'ready', requestId: req.requestId };
    case 'find_best_move':
      return handleFindBestMove(req);
    case 'analyze':
      return handleAnalyze(req);
    case 'cancel':
      cancelledIds.add(req.requestId);
      return null; // yanıt yok — client isteği zaten reddetti
    default:
      return errorResponse(
        (req as { requestId?: string }).requestId ?? 'unknown',
        `Bilinmeyen istek tipi: ${(req as { type?: string }).type}`,
      );
  }
}

// Sadece gerçek worker bağlamında kablo bağla (node testleri import edebilir).
// Kriter: postMessage var + window YOK (ana thread'e yanlışlıkla bağlanmayı önler).
const workerScope = globalThis as unknown as {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};
if (
  typeof workerScope.postMessage === 'function' &&
  typeof (globalThis as unknown as { window?: unknown }).window === 'undefined'
) {
  workerScope.onmessage = (event: { data: WorkerRequest }) => {
    const req = event.data;
    if (!req || typeof req !== 'object' || typeof (req as { requestId?: unknown }).requestId !== 'string') {
      return; // yönlendirilemez istek — sessiz geç
    }
    void route(req).then((res) => {
      if (res) workerScope.postMessage(res);
    });
  };
}
