/**
 * Bot tam-oyun simülasyon testleri (Faz 6: "Bota Karşı Oyna" bağlantısı).
 *
 *  - Profil I ve Profil III ile baştan sona oyun — GERÇEK worker hattı
 *    (`handleFindBestMove`: ID + profil seçimi), hamleler `core/rules`
 *    `makeMove` ile uygulanır, bitiş `getGameResult` ile okunur.
 *  - Mat-in-1 düzeneğinde botun matı bulması + sonucun doğru okunması.
 *  - Gerçek thread'de arama sürerken ana thread event loop'unun atmaya
 *    devam etmesi (`node:worker_threads` heartbeat).
 *
 * Oyun sonu iddiası bilerek sonuç-bağımsızdır (profiller olasılıksal):
 * her hamle legal uygulanır, bitiş tutarlı bir GameResult olur ya da
 * hamle tavanına takılır.
 */
import { PieceKind } from '../../core/position/Position';
import type { Position } from '../../core/position/Position';
import type { GameResult } from '../../core/position/Position';
import { createInitialGameState } from '../../core/engine/boardSetup';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import { getGameResult } from '../../core/rules/gameResult';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { handleFindBestMove } from '../../worker/engineWorker';
import { serializePosition } from '../../worker/protocol';
import { legacyGameStateToPosition } from '../../worker/legacyAdapter';
import type { BotProfileId } from '../profiles';

declare const require: any;
declare const __dirname: string;

const FAST = { movetimeMs: 30, maxDepth: 3 };
const PLY_CAP = 60;

interface GameOutcome {
  result: GameResult | null;
  plies: number;
  capped: boolean;
}

async function playFullGame(
  whiteProfile: BotProfileId,
  blackProfile: BotProfileId,
): Promise<GameOutcome> {
  let pos: Position = legacyGameStateToPosition(createInitialGameState());
  let plies = 0;
  for (;;) {
    const result = getGameResult(pos);
    if (result !== null) return { result, plies, capped: false };
    if (plies >= PLY_CAP) return { result: null, plies, capped: true };
    const profile = pos.sideToMove === 'white' ? whiteProfile : blackProfile;
    const resp = await handleFindBestMove(
      {
        type: 'find_best_move',
        requestId: `game-${whiteProfile}-${blackProfile}-${plies}`,
        position: serializePosition(pos),
        profileId: profile,
        movetimeMs: FAST.movetimeMs,
        maxDepth: FAST.maxDepth,
      },
      new Set<string>(),
    );
    if (resp.type !== 'best_move_result') {
      throw new Error(`Bot hamle üretemedi: ${resp.type}`);
    }
    pos = makeMove(pos, resp.result.bestMove);
    plies++;
  }
}

function isValidResult(r: GameResult): boolean {
  if (r.type === 'checkmate' || r.type === 'stalemate_win') {
    return r.winner === 'white' || r.winner === 'black';
  }
  return r.type === 'draw';
}

export async function runBotGameTests(): Promise<TestSummary> {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  }

  // ---- G1. Profil III (beyaz) vs Profil I (siyah): tam oyun
  const g1 = await playFullGame('III', 'I');
  console.log(
    `   oyun III-beyaz/I-siyah: ${g1.plies} hamle, ` +
      (g1.result ? `sonuç=${g1.result.type}` : 'tavan (berabere say)'),
  );
  ok(g1.plies > 0, 'G01: oyun ilerledi (hamle uygulandı)');
  ok(g1.result === null || isValidResult(g1.result), 'G02: bitiş tutarlı GameResult ya da tavan');

  // ---- G2. Profil I (beyaz) vs Profil III (siyah): tam oyun
  const g2 = await playFullGame('I', 'III');
  console.log(
    `   oyun I-beyaz/III-siyah: ${g2.plies} hamle, ` +
      (g2.result ? `sonuç=${g2.result.type}` : 'tavan (berabere say)'),
  );
  ok(g2.plies > 0, 'G03: ikinci oyun ilerledi');
  ok(g2.result === null || isValidResult(g2.result), 'G04: ikinci bitiş tutarlı');

  // ---- G3. Mat-in-1: bot matı bulur, sonuç doğru okunur
  const matePos = createTestPosition('white', [
    { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
    { sq: tq(0, 5), kind: PieceKind.Rook, side: 'white' },
  ]);
  const mateResp = await handleFindBestMove(
    {
      type: 'find_best_move',
      requestId: 'mate-1',
      position: serializePosition(matePos),
      profileId: 'V',
      maxDepth: 2,
      movetimeMs: 300,
    },
    new Set<string>(),
  );
  const mated =
    mateResp.type === 'best_move_result' &&
    mateResp.result.bestMove.to === tq(0, 9);
  ok(mated, 'G05: bot mat-in-1 hamlesini bulur');
  if (mateResp.type === 'best_move_result') {
    const endPos = makeMove(matePos, mateResp.result.bestMove);
    const endResult = getGameResult(endPos);
    ok(
      endResult !== null && endResult.type === 'checkmate' && endResult.winner === 'white',
      'G06: mat sonrası getGameResult checkmate + kazanan=beyaz',
    );
  } else {
    ok(false, 'G06: mat sonrası getGameResult checkmate + kazanan=beyaz');
  }

  // ---- G4. Gerçek thread'de arama sürerken ana thread atmaya devam eder
  const { Worker: NodeWorker } = require('node:worker_threads') as any;
  const workerMod = __dirname + '/../../worker/engineWorker';
  const opening = serializePosition(legacyGameStateToPosition(createInitialGameState()));
  const threadCode = `
    const { parentPort } = require('node:worker_threads');
    const mod = require(${JSON.stringify(workerMod)});
    parentPort.on('message', async (req) => {
      try {
        parentPort.postMessage(await mod.handleFindBestMove(req, new Set()));
      } catch (e) {
        parentPort.postMessage({ type: 'error', requestId: req.requestId, message: String((e && (e as any).message) || e) });
      }
    });
  `;
  const thread = new NodeWorker(threadCode, { eval: true });
  let ticks = 0;
  const heartbeat = setInterval(() => {
    ticks++;
  }, 10);
  const threadResult: any = await new Promise((resolve, reject) => {
    const guard = setTimeout(() => reject(new Error('thread zaman aşımı')), 30000);
    thread.once('message', (msg: any) => {
      clearTimeout(guard);
      resolve(msg);
    });
    thread.once('error', (err: any) => {
      clearTimeout(guard);
      reject(err);
    });
    thread.postMessage({
      type: 'find_best_move',
      requestId: 'thread-1',
      position: opening,
      profileId: 'III',
      movetimeMs: 800,
      maxDepth: 6,
    });
  }).catch((e) => ({ type: 'error', message: String(e) }));
  clearInterval(heartbeat);
  try {
    thread.terminate();
  } catch {
    /* yoksay */
  }
  console.log(`   thread testi: heartbeat=${ticks} tick, sonuç=${threadResult?.type}`);
  ok(ticks >= 5, `G07: arama sürerken ana thread event loop döndü (${ticks} tick)`);
  const threadMoveOk =
    threadResult?.type === 'best_move_result' &&
    generateLegalMoves(legacyGameStateToPosition(createInitialGameState())).some(
      (m) => m.from === threadResult.result.bestMove.from && m.to === threadResult.result.bestMove.to,
    );
  ok(threadMoveOk, 'G08: thread’den dönen hamle açılışta legal');

  console.log(`botgame: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
