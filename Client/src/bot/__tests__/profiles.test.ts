/**
 * Bot — profil tablosu + I-vs-V davranış testi + mini benchmark (v0.2).
 *
 * Demo kurgusu (beyaz oynar): BK(10,9) WK(0,0) Kale(5,5)-beyaz,
 * Kale(5,8)-siyah (asılı, korumasız), At(2,2)-beyaz.
 * K(5,5)×K(5,8) taş alışı net +500cp kazançtır; Profil V bunu bulmalı,
 * Profil I tohumlara bağlı olarak bazen sapmalı.
 */

import { PieceKind, type Position } from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import { materialWhiteCp } from '../../engine/evaluate';
import { searchIterative, searchRoot } from '../../engine/search';
import { TimurEngine } from '../../engine/timurEngine';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { BOT_PROFILES, validateProfile, type BotProfileId } from '../profiles';
import { selectMoveWithProfile } from '../selectMoveWithProfile';

/** Deterministik RNG (mulberry32) — tekrarlanabilir test tohumları. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoPosition(): Position {
  return createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(5, 8), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(2, 2), kind: PieceKind.Knight, side: 'white' },
  ]);
}

const FAST = { maxDepth: 2, movetimeMs: 1000 };

export function runBotTests(): TestSummary {
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
  const engine = new TimurEngine();

  // ---- P1. tablo bütünlüğü (§7.5 birebir)
  const ids: BotProfileId[] = ['I', 'II', 'III', 'IV', 'V'];
  for (const id of ids) {
    ok(validateProfile(BOT_PROFILES[id]).length === 0, `P01-${id}: profil tablosu tutarlı`);
  }
  const v = BOT_PROFILES.V;
  ok(
    v.movetimeMs === 4000 && v.candidateLimit === 1 && v.evaluationNoise === 0 &&
    v.mistakeRate === 0 && v.blunderRate === 0 && v.weights.length === 1 && v.weights[0] === 100,
    'P02: Profil V = hatasız en-iyi-hamle',
  );
  const one = BOT_PROFILES.I;
  ok(
    one.movetimeMs === 150 && one.maxDepth === 2 && one.candidateLimit === 10 &&
    one.evaluationNoise === 220 && one.mistakeRate === 0.4 && one.blunderRate === 0.15,
    'P03: Profil I parametreleri tablodaki gibi',
  );

  // ---- P2. Profil V asılı kaleyi alır (engine-best ile aynı)
  const pos = demoPosition();
  const pickV = selectMoveWithProfile(engine, pos, 'V', FAST);
  ok(pickV.kind === 'best', 'P04: V seçimi "best" türündendir');
  ok(pickV.move.to === tq(5, 8), `P05: V asılı kaleyi alır (gelen ${pickV.move.from}→${pickV.move.to})`);

  // ---- P3. Profil I tohumlar arasında sapar (rastgelelik çalışıyor)
  const TRIALS = 30;
  let deviated = 0;
  let alwaysLegal = true;
  for (let s = 1; s <= TRIALS; s++) {
    const pick = selectMoveWithProfile(engine, demoPosition(), 'I', { ...FAST, rng: seededRng(s) });
    const legal = generateLegalMoves(demoPosition()).some(
      (m) => m.from === pick.move.from && m.to === pick.move.to,
    );
    if (!legal) alwaysLegal = false;
    if (pick.move.to !== tq(5, 8)) deviated++;
  }
  console.log(`   profil I: ${TRIALS} denemede ${deviated} sapma`);
  ok(alwaysLegal, 'P06: I seçimleri her zaman legal');
  ok(deviated >= 1, `P07: I en az bir kez en-iyiden sapar (${deviated}/${TRIALS})`);
  ok(deviated < TRIALS, `P08: I her zaman sapmaz, satranç mantığında kalır (${deviated}/${TRIALS})`);

  // ---- P4. V'nin sonucu I'in sonucundan kötü değil (sabit tohum demosu)
  const pickI7 = selectMoveWithProfile(engine, demoPosition(), 'I', { ...FAST, rng: seededRng(7) });
  const evalV = materialWhiteCp(makeMove(demoPosition(), pickV.move));
  const evalI = materialWhiteCp(makeMove(demoPosition(), pickI7.move));
  console.log(`   V sonucu: ${pickV.move.from}→${pickV.move.to} (${evalV}cp), I(tohum7) sonucu: ${pickI7.move.from}→${pickI7.move.to} [${pickI7.kind}] (${evalI}cp)`);
  ok(evalV >= evalI, `P09: V materyal sonucu I'inkinden kötü değil (${evalV} >= ${evalI})`);

  // ---- P5. mini benchmark (dallar açık mini-ortaoyun)
  const bench = createTestPosition('white', [
    { sq: tq(4, 1), kind: PieceKind.King, side: 'white' },
    { sq: tq(6, 8), kind: PieceKind.King, side: 'black' },
    { sq: tq(0, 4), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(10, 5), kind: PieceKind.Rook, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(7, 6), kind: PieceKind.Knight, side: 'black' },
    { sq: tq(2, 2), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(8, 7), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
  ]);
  const t0 = Date.now();
  const r3 = searchRoot(bench, 3);
  const ms3 = Math.max(1, Date.now() - t0);
  const nps = Math.round((r3.nodes / ms3) * 1000);
  console.log(`   bench depth3: nodes=${r3.nodes} time=${ms3}ms → ${nps} node/sn`);
  ok(r3.nodes > 0 && r3.pv.length > 0, 'P10: derinlik-3 arama hat döndürür');
  const t1 = Date.now();
  const rid = searchIterative(bench, { maxDepth: 64, deadlineMs: Date.now() + 300 });
  const msid = Math.max(1, Date.now() - t1);
  console.log(
    `   bench ID 300ms: depth=${rid.depthReached} nodes=${rid.nodes} ttHits=${rid.ttHits} time=${msid}ms → ${Math.round((rid.nodes / msid) * 1000)} node/sn`,
  );
  ok(rid.depthReached >= 1 && rid.pv.length > 0, 'P11: ID 300ms en az derinlik-1 tamamlar');

  console.log(`bot: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
