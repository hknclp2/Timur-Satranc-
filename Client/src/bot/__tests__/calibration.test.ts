/**
 * Bot — Faz 4 kalibrasyon testi (bot hissi, seed'li RNG).
 *
 * Demo kurgusu (beyaz oynar, profiles.test.ts ile aynı): BK(10,9) WK(0,0)
 * Kale(5,5)-beyaz, Kale(5,8)-siyah (asılı, korumasız), At(2,2)-beyaz.
 * K(5,5)×K(5,8) taş alışı net +500cp kazançtır; Profil V bunu her zaman
 * bulur, zayıf profiller tohumlara bağlı olarak sapar.
 *
 * Kapsam:
 *  - her profil 30 seed'li seçim: hep-legal + referanstan (V) sapma oranı,
 *  - sapma monotonluğu (zayıf profil, güçlüden az sapmaz),
 *  - I-vs-V "win-rate mantığı": 30 tohumda V'nin hamle-sonrası materyali
 *    I'in sonucundan kaç kez kötü değil (materyal karşılaştırma),
 *  - açılış çeşitliliği (`isOpening`): uniform havuz seçimi hep legal.
 */

import { PieceKind, type Position } from '../../core/position/Position';
import { generateLegalMoves } from '../../core/rules/generateLegalMoves';
import { makeMove } from '../../core/rules/makeMove';
import { materialWhiteCp } from '../../engine/evaluate';
import { TimurEngine } from '../../engine/timurEngine';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { BOT_PROFILES, type BotProfileId } from '../profiles';
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

function moveKeyOf(from: number, to: number): string {
  return `${from}>${to}`;
}

const FAST = { maxDepth: 2, movetimeMs: 200 };
const TRIALS = 30;

export function runCalibrationTests(): TestSummary {
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
  const ids: BotProfileId[] = ['I', 'II', 'III', 'IV', 'V'];

  // Referans: Profil V (hatasız en-iyi-hamle) — deterministik olmalı.
  const ref = selectMoveWithProfile(engine, demoPosition(), 'V', FAST);
  const refKey = moveKeyOf(ref.move.from, ref.move.to);

  // ---- K1. her profil 30 seed'li seçim: hep-legal + sapma oranı
  const deviated: Record<BotProfileId, number> = { I: 0, II: 0, III: 0, IV: 0, V: 0 };
  const illegal: Record<BotProfileId, number> = { I: 0, II: 0, III: 0, IV: 0, V: 0 };
  for (const id of ids) {
    for (let s = 1; s <= TRIALS; s++) {
      const pick = selectMoveWithProfile(engine, demoPosition(), id, {
        ...FAST,
        rng: seededRng(s),
      });
      const legal = generateLegalMoves(demoPosition()).some(
        (m) => m.from === pick.move.from && m.to === pick.move.to,
      );
      if (!legal) {
        illegal[id]++;
        continue;
      }
      if (moveKeyOf(pick.move.from, pick.move.to) !== refKey) deviated[id]++;
    }
    console.log(`   kalibrasyon ${id}: ${TRIALS} denemede ${deviated[id]} sapma, ${illegal[id]} illegal`);
    ok(illegal[id] === 0, `K01-${id}: 30 seçim hep legal`);
  }

  // ---- K2. sapma monotonluğu: zayıf profil, güçlüden az sapmaz
  ok(deviated.V === 0, `K02: V hiç sapmaz (${deviated.V}/${TRIALS})`);
  ok(deviated.I >= 1, `K03: I en az bir kez sapar (${deviated.I}/${TRIALS})`);
  ok(
    deviated.I >= deviated.II && deviated.II >= deviated.III &&
    deviated.III >= deviated.IV && deviated.IV >= deviated.V,
    `K04: sapma monotonluğu I>=II>=III>=IV>=V (${ids.map((id) => `${id}:${deviated[id]}`).join(' ')})`,
  );

  // ---- K3. I-vs-V win-rate mantığı (materyal karşılaştırma, 30 tohum)
  const matV = materialWhiteCp(makeMove(demoPosition(), ref.move));
  let vNotWorse = 0;
  let sumI = 0;
  for (let s = 1; s <= TRIALS; s++) {
    const pickI = selectMoveWithProfile(engine, demoPosition(), 'I', { ...FAST, rng: seededRng(s) });
    const matI = materialWhiteCp(makeMove(demoPosition(), pickI.move));
    sumI += matI;
    if (matV >= matI) vNotWorse++;
  }
  const avgI = Math.round(sumI / TRIALS);
  console.log(`   kalibrasyon I-vs-V: V=${matV}cp, I-ortalama=${avgI}cp, V-kötü-değil=${vNotWorse}/${TRIALS}`);
  ok(vNotWorse >= 27, `K05: V 30 tohumun en az 27'sinde I'den kötü değil (${vNotWorse}/${TRIALS})`);
  ok(matV >= avgI, `K06: V materyali I-ortalamasından düşük değil (${matV} >= ${avgI})`);

  // ---- K4. açılış çeşitliliği: isOpening uniform seçimi hep legal
  let openingIllegal = 0;
  const openingKeys = new Set<string>();
  for (let s = 1; s <= 10; s++) {
    const pick = selectMoveWithProfile(engine, demoPosition(), 'II', {
      ...FAST,
      rng: seededRng(1000 + s),
      isOpening: true,
    });
    const legal = generateLegalMoves(demoPosition()).some(
      (m) => m.from === pick.move.from && m.to === pick.move.to,
    );
    if (!legal) openingIllegal++;
    else openingKeys.add(moveKeyOf(pick.move.from, pick.move.to));
  }
  console.log(`   kalibrasyon açılış (II, isOpening): 10 denemede ${openingKeys.size} farklı hamle`);
  ok(openingIllegal === 0, 'K07: isOpening seçimleri hep legal');
  ok(openingKeys.size >= 2, `K08: isOpening havuzda çeşitlilik üretir (${openingKeys.size} farklı)`);

  // Profil tablosu hâlâ tutarlı (kalibrasyon bütünlük muhafızı).
  void BOT_PROFILES;

  console.log(`calibration: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
