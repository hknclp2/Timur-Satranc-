/**
 * Review concurrency testleri: `analyzeFullGame` eşzamanlı arama yolu
 * (GameAnalyzerOptions.concurrency) seri yolla birebir aynı raporu üretmeli;
 * ply sırası, çözüm sırasından bağımsız korunmalı; uçuşan istek sayısı
 * havuz boyunu aşmamalı.
 *
 * Desen: runTests uyumu için `runReviewConcurrencyTests()` export eder.
 * Zamanlayıcı/DOM YOK — saf promise zincirleri (node + es2020 lib uyumlu).
 */

import type { Position } from '../../core/position/Position';
import type { Move } from '../../core/move/Move';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import { createInitialGameState } from '../../core/engine/boardSetup';
import { legacyGameStateToPosition } from '../../worker/legacyAdapter';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { PieceKind } from '../../core/position/Position';
import { analyzeFullGame } from '../gameAnalyzer';

/** Klasik dizilimden ilk-legal-hamle zinciriyle N ply'lik oyun kur. */
function buildGame(plies: number): { initial: Position; moves: Move[] } {
  const initial = legacyGameStateToPosition(createInitialGameState());
  const moves: Move[] = [];
  let pos = initial;
  for (let i = 0; i < plies; i++) {
    const legal = generateLegalMoves(pos);
    if (legal.length === 0) break;
    moves.push(legal[0]);
    pos = makeMove(pos, legal[0]);
  }
  return { initial, moves };
}

function tinyPosition(): Position {
  return createTestPosition('white', [
    { sq: tq(5, 1), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
  ]);
}

/** En iyi hamle olarak o konumun ilk legal hamlesini dönen izleyen stub. */
function trackingStub() {
  const calls: Position[] = [];
  let active = 0;
  let maxActive = 0;
  const findBestMove = (pos: Position) => {
    calls.push(pos);
    active += 1;
    if (active > maxActive) maxActive = active;
    const legal = generateLegalMoves(pos);
    const bestMove = legal[0];
    const result = {
      bestMove,
      evaluationCp: 15,
      depthReached: 1,
      nodesSearched: 1,
      timeMs: 0,
      principalVariation: [bestMove],
    };
    return Promise.resolve().then(() => {
      active -= 1;
      return result;
    });
  };
  return { engine: { findBestMove } as any, stats: () => ({ calls: calls.length, maxActive }) };
}

function signatureOf(report: Awaited<ReturnType<typeof analyzeFullGame>>): string {
  return JSON.stringify({
    moves: report.moves.map((m) => ({
      ply: m.ply,
      notation: m.notation,
      from: m.from,
      to: m.to,
      bestFrom: m.bestFrom,
      bestTo: m.bestTo,
      classification: m.classification,
      lossCp: m.lossCp,
      evalBeforeCp: m.evalBeforeCp,
      evalAfterCp: m.evalAfterCp,
    })),
    whiteAccuracy: report.whiteAccuracy,
    blackAccuracy: report.blackAccuracy,
    evalCurve: report.evalCurve,
  });
}

export async function runReviewConcurrencyTests(): Promise<TestSummary> {
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

  // ---- C1: seri vs paralel rapor özdeşliği
  {
    const { initial, moves } = buildGame(6);
    ok(moves.length === 6, 'P01: 6 ply oyun kurulur (C1 önkoşul)');
    const a = trackingStub();
    const b = trackingStub();
    const repA = await analyzeFullGame(a.engine, initial, moves, { depth: 1 });
    const repB = await analyzeFullGame(b.engine, initial, moves, { depth: 1, concurrency: 4 });
    ok(signatureOf(repA) === signatureOf(repB), 'P02: concurrency 4, seri raporla birebir aynı');
    ok(a.stats().maxActive === 1, 'P03: seri yolda en fazla 1 uçuşan istek');
    ok(b.stats().maxActive === 4, 'P04: paralel yolda 4 runner aynı anda arar');
    ok(b.stats().calls === 6, 'P05: her ply tam 1 kez aranır');
  }

  // ---- C2: ters sırada çözülen yanıtlar ply sırasını bozmaz
  {
    const { initial, moves } = buildGame(4);
    const captured: Position[] = [];
    const deferreds: Array<{ resolve: (v: unknown) => void }> = [];
    const engine = {
      findBestMove: (pos: Position) => {
        captured.push(pos);
        return new Promise((resolve) => {
          deferreds.push({ resolve: resolve as (v: unknown) => void });
        });
      },
    } as any;
    const pending = analyzeFullGame(engine, initial, moves, { depth: 1, concurrency: 4 });
    ok(deferreds.length === 4, 'P06: 4 arama da beklemeye girer (C2 önkoşul)');
    for (let k = deferreds.length - 1; k >= 0; k--) {
      const legal = generateLegalMoves(captured[k]);
      const bestMove = legal[0];
      deferreds[k].resolve({
        bestMove,
        evaluationCp: 20,
        depthReached: 1,
        nodesSearched: 1,
        timeMs: 0,
        principalVariation: [bestMove],
      });
    }
    const report = await pending;
    const inOrder =
      report.moves.length === 4 &&
      report.moves.every((m, idx) => m.ply === idx + 1 && m.from === moves[idx].from && m.to === moves[idx].to);
    ok(inOrder, 'P07: ters sırada çözülse de rapor ply sırasını korur');
  }

  // ---- C3: progress tamamlanma sayısını sırayla bildirir
  {
    const { initial, moves } = buildGame(5);
    const seen: Array<[number, number]> = [];
    const stub = trackingStub();
    await analyzeFullGame(stub.engine, initial, moves, { depth: 1, concurrency: 3 }, (c, t) =>
      seen.push([c, t]),
    );
    const values = seen.map(([c]) => c);
    ok(
      seen.length === 5 && values.join(',') === '1,2,3,4,5' && seen.every(([, t]) => t === 5),
      'P08: progress 1..total sırayla ve toplamla birlikte gelir',
    );
  }

  // ---- C4: concurrency hamle sayısından büyükse kırpılır + boş oyun çökmez
  {
    const { initial, moves } = buildGame(2);
    const stub = trackingStub();
    const rep = await analyzeFullGame(stub.engine, initial, moves, { depth: 1, concurrency: 99 });
    ok(rep.moves.length === 2 && stub.stats().maxActive === 2, 'P09: havuz hamle sayısına kırpılır');
    const empty = await analyzeFullGame(trackingStub().engine, tinyPosition(), [], {
      depth: 1,
      concurrency: 4,
    });
    ok(empty.moves.length === 0, 'P10: boş hamle listesi çökmeden boş rapor döner');
  }

  console.log(`reviewConcurrency: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
