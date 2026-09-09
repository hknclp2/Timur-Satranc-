/**
 * Turnuva Arenası — Faz 8 MVP iskelet testleri.
 *
 * Kapsam: 8 oyunculu mock pairing (skor grubu + tekrarsızlık) +
 * standing sıralaması (puan + galibiyet tiebreak) + tek-sayı bye.
 *
 * Çalıştırma: `src/core/__tests__/runTests.ts` entry'si üzerinden
 * (tsc → node; proje build'ine dahil olur, `tsc --noEmit` temiz kalmalı).
 */

import { pairRound, pairingKey } from '../pairing';
import { computeStandings } from '../standing';

export interface TestSummary {
  passed: number;
  failed: number;
}

export function runTournamentTests(): TestSummary {
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

  // ---- A. 8 oyunculu mock pairing (skor grupları)
  const eight = [
    { id: 'p1', score: 3 },
    { id: 'p2', score: 3 },
    { id: 'p3', score: 2 },
    { id: 'p4', score: 2 },
    { id: 'p5', score: 1 },
    { id: 'p6', score: 1 },
    { id: 'p7', score: 0 },
    { id: 'p8', score: 0 },
  ];
  const r1 = pairRound(eight, new Set<string>());
  ok(r1.pairs.length === 4, 'A1: 8 oyuncu → 4 eşleşme');
  ok(r1.byePlayerId === null, 'A2: çift sayıda bye yok');
  const seen = new Set<string>();
  let dup = false;
  for (const pr of r1.pairs) {
    if (seen.has(pr.whiteId) || seen.has(pr.blackId) || pr.whiteId === pr.blackId) dup = true;
    seen.add(pr.whiteId);
    seen.add(pr.blackId);
  }
  ok(!dup && seen.size === 8, 'A3: her oyuncu tam bir kez eşleşir');
  // Aynı skor grubunda eşleşme: ilk turda p1-p2, p3-p4, p5-p6, p7-p8 beklenir.
  const keys = new Set(r1.pairs.map((pr) => pairingKey(pr.whiteId, pr.blackId)));
  ok(keys.has(pairingKey('p1', 'p2')), 'A4: 3 puanlılar kendi arasında (p1-p2)');
  ok(keys.has(pairingKey('p3', 'p4')), 'A5: 2 puanlılar kendi arasında (p3-p4)');
  ok(keys.has(pairingKey('p5', 'p6')), 'A6: 1 puanlılar kendi arasında (p5-p6)');
  ok(keys.has(pairingKey('p7', 'p8')), 'A7: 0 puanlılar kendi arasında (p7-p8)');

  // ---- B. tekrar önleme
  const past = new Set<string>([pairingKey('p1', 'p2')]);
  const r2 = pairRound(eight, past);
  const keys2 = new Set(r2.pairs.map((pr) => pairingKey(pr.whiteId, pr.blackId)));
  ok(!keys2.has(pairingKey('p1', 'p2')), 'B1: geçmiş eşleşme tekrarlanmaz (p1-p2)');
  ok(r2.pairs.length === 4 && r2.byePlayerId === null, 'B2: tekrara rağmen 4 eşleşme, bye yok');

  // ---- C. tek sayı → bye
  const seven = eight.slice(0, 7);
  const r3 = pairRound(seven, new Set<string>());
  ok(r3.pairs.length === 3, 'C1: 7 oyuncu → 3 eşleşme');
  ok(r3.byePlayerId === 'p7', 'C2: en düşük skorlu (p7) bay alır');
  const inPairs = new Set<string>();
  for (const pr of r3.pairs) {
    inPairs.add(pr.whiteId);
    inPairs.add(pr.blackId);
  }
  ok(r3.byePlayerId !== null && !inPairs.has(r3.byePlayerId as string), 'C3: bye oyuncusu eşleşmede yer almaz');

  // ---- D. standing: puan + galibiyet tiebreak
  const standings = computeStandings(
    [
      { id: 'p1', score: 3 },
      { id: 'p2', score: 3 },
      { id: 'p3', score: 2 },
    ],
    [
      { whiteId: 'p1', blackId: 'p3', result: 'white' },
      { whiteId: 'p2', blackId: 'p3', result: 'draw' },
      { whiteId: 'p1', blackId: 'p2', result: 'black' },
    ],
  );
  // p2: 3 puan + 1 galibiyet, p1: 3 puan + 1 galibiyet → id kırar (p1 önce).
  // Not: tiebreak farkını net görmek için ikinci senaryo:
  const standings2 = computeStandings(
    [
      { id: 'a', score: 2 },
      { id: 'b', score: 2 },
    ],
    [
      { whiteId: 'a', blackId: 'b', result: 'white' },
      { whiteId: 'b', blackId: 'a', result: 'black' },
    ],
  );
  ok(standings.length === 3, 'D1: 3 satır döner');
  ok(standings[0].score >= standings[1].score && standings[1].score >= standings[2].score, 'D2: puan azalan sıralanır');
  ok(standings2[0].id === 'a', 'D3: eşit puanda çok galibiyetli (a:2, b:0) önce gelir');
  ok(standings2[0].wins === 2 && standings2[1].wins === 0, 'D4: galibiyet sayımı doğru (2-0)');
  ok(standings[0].rank === 1, 'D5: lider rank 1');

  // ---- E. computeStandings boş-liste edge durumu
  const emptyStandings = computeStandings([], []);
  ok(Array.isArray(emptyStandings) && emptyStandings.length === 0, 'E1: boş oyuncu + boş eşleşme → boş tablo');
  const noPairings = computeStandings(
    [
      { id: 'x', score: 1 },
      { id: 'y', score: 0 },
    ],
    [],
  );
  ok(noPairings.length === 2, 'E2: eşleşmesiz tablo oyuncu sayısını korur');
  ok(noPairings[0].id === 'x' && noPairings[0].wins === 0 && noPairings[0].rank === 1, 'E3: eşleşmesiz lider doğru (puan + rank 1, 0 galibiyet)');

  console.log(`tournament: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
