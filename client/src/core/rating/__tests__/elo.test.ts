/**
 * Online ELO testleri — saf matematik (DB yok).
 * Çalıştırma: `src/core/__tests__/runTests.ts` entry'si üzerinden
 * (tsc → node; proje build'ine dahil olur, `tsc --noEmit` temiz kalmalı).
 */
import {
  START_RATING,
  K,
  K_NEW,
  expectedScore,
  getKFactor,
  isProvisional,
  updateRatings,
} from '../elo';

export interface TestSummary {
  passed: number;
  failed: number;
}

export function runEloTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`FAIL: ${name}`);
    }
  }
  function approx(a: number, b: number, eps = 1e-9): boolean {
    return Math.abs(a - b) < eps;
  }

  // ---- 1. beklenen skor simetrisi
  ok(approx(expectedScore(1200, 1200), 0.5), 'ELO-01: esit rating beklenen skor 0.5');
  ok(
    approx(expectedScore(1200, 1600) + expectedScore(1600, 1200), 1),
    'ELO-02: karsilikli beklenen skor toplami 1'
  );
  ok(expectedScore(1600, 1200) > 0.9, 'ELO-03: 400 fark ustunu yuksek skor verir');

  // ---- 2. kazanma: kazanan artar, kaybeden azalir, sifir toplamli degil (bagimsiz K)
  const win = updateRatings(1200, 1200, 'white', 20, 20);
  ok(win.newWhite === 1216 && win.newBlack === 1184, 'ELO-04: esitlerde beyaz kazanirsa 1216/1184');
  ok(win.delta === 16, 'ELO-05: delta beyaz degisimine esittir (+16)');

  // ---- 3. kaybetme (siyah kazanir)
  const loss = updateRatings(1200, 1200, 'black', 20, 20);
  ok(loss.newWhite === 1184 && loss.newBlack === 1216, 'ELO-06: esitlerde siyah kazanirsa 1184/1216');
  ok(loss.delta === -16, 'ELO-07: kaybeden beyaz delta negatiftir (-16)');

  // ---- 4. beraberlik: esitler degismez
  const draw = updateRatings(1200, 1200, 'draw', 20, 20);
  ok(draw.newWhite === 1200 && draw.newBlack === 1200, 'ELO-08: esitler berabere kalirsa rating degismez');
  ok(draw.delta === 0, 'ELO-09: beraberlik delta 0');

  // ---- 5. beraberlik: guclu taraf kucuk kaybeder, zayif taraf kucuk kazanir
  const drawUpset = updateRatings(1400, 1200, 'draw', 20, 20);
  ok(drawUpset.newWhite < 1400 && drawUpset.newBlack > 1200, 'ELO-10: berabere zayif kazanir, guclu kaybeder');

  // ---- 6. K farki: yeni oyuncu (ilk 10 mac) ayni sonucda daha cok degisir
  const fresh = updateRatings(1200, 1200, 'white', 0, 0);
  const settled = updateRatings(1200, 1200, 'white', 20, 20);
  ok(fresh.newWhite === 1220 && fresh.newBlack === 1180, 'ELO-11: yeni oyuncular K=40 ile 1220/1180');
  ok(
    Math.abs(fresh.delta) > Math.abs(settled.delta),
    'ELO-12: yeni oyuncu degisimi yerlesikten buyuktur'
  );
  ok(getKFactor(0) === K_NEW && getKFactor(9) === K_NEW, 'ELO-13: 0-9 mac K_NEW');
  ok(getKFactor(10) === K && getKFactor(100) === K, 'ELO-14: 10+ mac K');

  // ---- 7. karma K: biri yeni biri yerlesik
  const mixed = updateRatings(1200, 1200, 'white', 0, 50);
  ok(mixed.newWhite === 1220 && mixed.newBlack === 1184, 'ELO-15: karma K bagimsiz uygulanir (1220/1184)');

  // ---- 8. yeni oyuncu helper'lari
  ok(isProvisional(0) === true && isProvisional(9) === true, 'ELO-16: 10 mac alti provisional');
  ok(isProvisional(10) === false, 'ELO-17: 10 mac ve ustu yerlesik');
  ok(START_RATING === 1200, 'ELO-18: baslangic rating 1200');

  console.log(`elo: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
