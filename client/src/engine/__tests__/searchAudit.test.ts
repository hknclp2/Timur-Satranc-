/**
 * Engine — arama/değerlendirme denetim testleri (Ajan-2: ARAMA & DEĞERLENDİRME).
 *
 * Kapsar (hedefli, minimal):
 *  - S01/S02: searchRoot timeout güvenliği — SearchTimeout dışarı sızmaz,
 *    girdi pozisyonu kirlenmez (klon üzerinde koşar), fallback cevap vardır.
 *  - S03: searchIterative terminal fallback — oyunu bitmiş konumda statik
 *    eval DEĞİL mat/pat bandı döner.
 *  - S04: nodeLimit sıkı yoklama — küçük limitte düğüm sayısı saçılmaz.
 *  - S05: determinizm — aynı arama iki kez aynı skor/PV verir (TT açık).
 *  - S06: TT açık/kapalı tutarlılık — aynı derinlikte skor bandı aynı.
 *
 * NOT: runTests.ts'e kayıt EKLEMEYİN (görev talimatı); dosya adı raporda belirtilir.
 */

import { PieceKind } from '../../core/position/Position';
import {
  createTestPosition,
  tq,
  type TestSummary,
} from '../../core/__tests__/gameCore.test';
import { MATE_SCORE, searchIterative, searchRoot } from '../search';

function snapshot(pos: Parameters<typeof searchRoot>[0]): string {
  return JSON.stringify({
    h: pos.zobristHash.toString(),
    side: pos.sideToMove,
    half: pos.flags.halfMoveClock,
    full: pos.flags.fullMoveNumber,
    rep: pos.flags.repetitionCount,
    board: (pos.board as unknown[]).map((p) =>
      p === null
        ? null
        : `${(p as { kind: string }).kind}:${(p as { side: string }).side}`,
    ),
  });
}

function densePosition(): ReturnType<typeof createTestPosition> {
  return createTestPosition('white', [
    { sq: tq(0, 0), kind: PieceKind.King, side: 'white' },
    { sq: tq(10, 9), kind: PieceKind.King, side: 'black' },
    { sq: tq(5, 5), kind: PieceKind.Rook, side: 'white' },
    { sq: tq(4, 5), kind: PieceKind.Knight, side: 'white' },
    { sq: tq(6, 5), kind: PieceKind.Knight, side: 'black' },
    { sq: tq(5, 4), kind: PieceKind.Ferz, side: 'black' },
    { sq: tq(3, 3), kind: PieceKind.Pawn, side: 'white', pawnOf: PieceKind.Rook },
    { sq: tq(7, 6), kind: PieceKind.Pawn, side: 'black', pawnOf: PieceKind.Rook },
  ]);
}

export function runSearchAuditTests(): TestSummary {
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

  // ---- S01: searchRoot nodeLimit=1 — throw yok, pozisyon kirlenmez, fallback pv var
  {
    const pos = densePosition();
    const before = snapshot(pos);
    let threw = false;
    let r: ReturnType<typeof searchRoot> | null = null;
    try {
      r = searchRoot(pos, 4, { nodeLimit: 1 });
    } catch {
      threw = true;
    }
    ok(!threw, 'S01: searchRoot nodeLimit=1 throw atmaz (fallback döner)');
    ok(r !== null && r.pv.length >= 1, 'S02: searchRoot fallback pv boş değil');
    ok(snapshot(pos) === before, 'S03: searchRoot timeout sonrası girdi pozisyonu değişmez');
  }

  // ---- S02: searchRoot geçmiş deadline — aynı garantiler
  {
    const pos = densePosition();
    const before = snapshot(pos);
    let threw = false;
    let r: ReturnType<typeof searchRoot> | null = null;
    try {
      r = searchRoot(pos, 3, { deadlineMs: Date.now() - 1 });
    } catch {
      threw = true;
    }
    ok(!threw, 'S04: searchRoot geçmiş deadline throw atmaz');
    ok(r !== null && r.pv.length >= 1, 'S05: searchRoot deadline fallback pv boş değil');
    ok(snapshot(pos) === before, 'S06: searchRoot deadline sonrası pozisyon değişmez');
  }

  // ---- S03: searchIterative terminal konumda mat bandı (statik eval değil)
  {
    const dead = createTestPosition('black', [
      { sq: tq(0, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 9), kind: PieceKind.Rook, side: 'white' },
      { sq: tq(1, 7), kind: PieceKind.King, side: 'white' },
    ]);
    const r = searchIterative(dead, { maxDepth: 3 });
    ok(
      r.score <= -(MATE_SCORE - 128),
      `S07: terminal searchIterative mat bandında (gelen ${r.score})`,
    );
  }

  // ---- S04: nodeLimit sıkı — 1 limitte düğüm sayısı küçük kalır
  {
    const pos = densePosition();
    const r = searchRoot(pos, 4, { nodeLimit: 1 });
    ok(r.nodes <= 16, `S08: nodeLimit=1 düğüm aşımı yok (gelen ${r.nodes})`);
  }

  // ---- S05: determinizm — aynı arama aynı sonuç
  {
    const pos = densePosition();
    const a = searchRoot(pos, 2, {});
    const b = searchRoot(pos, 2, {});
    ok(
      a.score === b.score &&
        a.pv.length === b.pv.length &&
        a.pv.every((m, i) => m.from === b.pv[i].from && m.to === b.pv[i].to),
      'S09: aynı arama deterministik (skor+PV aynı)',
    );
  }

  // ---- S06: TT açık/kapalı aynı bandı verir (mat-in-1)
  {
    const m1 = createTestPosition('white', [
      { sq: tq(5, 9), kind: PieceKind.King, side: 'black' },
      { sq: tq(5, 7), kind: PieceKind.King, side: 'white' },
      { sq: tq(0, 5), kind: PieceKind.Rook, side: 'white' },
    ]);
    const ttOn = searchRoot(m1, 1, {});
    const ttOff = searchRoot(m1, 1, { useTT: false });
    ok(
      ttOn.score === ttOff.score &&
        ttOn.pv.length >= 1 &&
        ttOff.pv.length >= 1 &&
        ttOn.pv[0].from === ttOff.pv[0].from &&
        ttOn.pv[0].to === ttOff.pv[0].to,
      'S10: TT açık/kapalı mat-in-1 aynı hamle+skor',
    );
  }

  console.log(`searchAudit: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
