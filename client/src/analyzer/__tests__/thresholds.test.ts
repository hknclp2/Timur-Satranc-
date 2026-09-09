/**
 * Analyzer — thresholds testleri (sınır değerler + accuracy monotonluğu).
 *
 * Desen: mevcut runTests uyumu için `runThresholdTests()` export eder.
 */

import type { TestSummary } from '../../core/__tests__/gameCore.test';
import { accuracyFromLosses, classifyLoss, moveAccuracy } from '../thresholds';

export function runThresholdTests(): TestSummary {
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

  // ---- T1. sınır değerler (spec: 0-20 / 21-60 / 61-150 / 151-300 / 300+)
  ok(classifyLoss(0) === 'Excellent', 'T01: loss 0 → Excellent');
  ok(classifyLoss(20) === 'Excellent', 'T02: loss 20 → Excellent');
  ok(classifyLoss(21) === 'Good', 'T03: loss 21 → Good');
  ok(classifyLoss(60) === 'Good', 'T04: loss 60 → Good');
  ok(classifyLoss(61) === 'Inaccuracy', 'T05: loss 61 → Inaccuracy');
  ok(classifyLoss(150) === 'Inaccuracy', 'T06: loss 150 → Inaccuracy');
  ok(classifyLoss(151) === 'Mistake', 'T07: loss 151 → Mistake');
  ok(classifyLoss(300) === 'Mistake', 'T08: loss 300 → Mistake');
  ok(classifyLoss(301) === 'Blunder', 'T09: loss 301 → Blunder');
  ok(classifyLoss(1200) === 'Blunder', 'T10: loss 1200 → Blunder');

  // ---- T2. accuracy: formül + monotonluk
  ok(accuracyFromLosses([]) === 100, 'T11: boş liste → 100');
  ok(moveAccuracy(0) === 100, 'T12: kayıp 0 → %100');
  ok(
    Math.abs(moveAccuracy(280) - 100 * Math.exp(-1)) < 1e-9,
    'T13: 280cp kayıp → 100/e',
  );
  ok(
    moveAccuracy(0) > moveAccuracy(50) &&
      moveAccuracy(50) > moveAccuracy(150) &&
      moveAccuracy(150) > moveAccuracy(400),
    'T14: hamle doğruluğu kayıpla monoton azalır',
  );
  ok(
    accuracyFromLosses([0]) > accuracyFromLosses([50]) &&
      accuracyFromLosses([50]) > accuracyFromLosses([150]) &&
      accuracyFromLosses([150]) > accuracyFromLosses([400]),
    'T15: oyun doğruluğu kayıpla monoton azalır',
  );
  ok(accuracyFromLosses([0, 0, 0]) === 100, 'T16: hatasız oyun → %100');
  ok(
    accuracyFromLosses([1000]) < 25 && accuracyFromLosses([1000]) >= 0,
    'T17: dev kayıp → düşük ama [0,100] içinde',
  );

  console.log(`thresholds: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
