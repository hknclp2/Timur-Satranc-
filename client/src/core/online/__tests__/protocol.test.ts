/**
 * Online protokol + oda kodu sözleşme testleri (saf birimler, DB yok).
 *
 * Kapsam: protocol.isOfferExpired sınır koşulları + roomService.generateRoomCode
 * format sözleşmesi (TM öneki, 6 hane, karışmayan karakter alfabesi).
 *
 * NOT: `src/core/__tests__/runTests.ts`'e kayıtlı DEĞİLDİR (bilinçli — ajan
 * talimatı runTests.ts'e kayıt eklemeyi yasaklar). Bağımsız derlenebilir:
 * `tsc` ile proje tip kontrolüne (`npx tsc --noEmit`) dahildir.
 */
import { isOfferExpired, OFFER_TTL_MS } from '../protocol';
import { generateRoomCode } from '../roomService';

export interface TestSummary {
  passed: number;
  failed: number;
}

const CODE_RE = /^TM[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function runProtocolTests(): TestSummary {
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

  // ---- 1. isOfferExpired: geçersiz/girdi-yok → süresi dolmuş sayılır
  ok(isOfferExpired(null) === true, 'P-01: null createdAt süresi dolmuş sayılır');
  ok(isOfferExpired(undefined) === true, 'P-02: undefined createdAt süresi dolmuş sayılır');
  ok(isOfferExpired('') === true, 'P-03: boş createdAt süresi dolmuş sayılır');
  ok(isOfferExpired('geçersiz-tarih') === true, 'P-04: parse edilemeyen createdAt süresi dolmuş sayılır');

  // ---- 2. isOfferExpired: TTL sınırları (deterministik sabit zamanla)
  const created = '2026-01-01T00:00:00.000Z';
  const createdMs = Date.parse(created);
  ok(isOfferExpired(created, createdMs) === false, 'P-05: yeni teklif aktif sayılır');
  ok(
    isOfferExpired(created, createdMs + OFFER_TTL_MS - 1) === false,
    'P-06: TTL dolmadan hemen önce aktif sayılır'
  );
  ok(
    isOfferExpired(created, createdMs + OFFER_TTL_MS) === false,
    'P-07: tam TTL sınırında katı-büyüktür kuralıyla aktif sayılır'
  );
  ok(
    isOfferExpired(created, createdMs + OFFER_TTL_MS + 1) === true,
    'P-08: TTL aşıldıktan sonra süresi dolmuş sayılır'
  );
  ok(OFFER_TTL_MS === 60_000, 'P-09: varsayılan teklif TTL 60 sn');
  ok(
    isOfferExpired(created, createdMs + 5_000, 10_000) === false &&
      isOfferExpired(created, createdMs + 15_000, 10_000) === true,
    'P-10: özel ttlMs parametresi dikkate alınır'
  );
  ok(
    isOfferExpired(created, createdMs - 1_000) === false,
    'P-11: gelecek zamanlı createdAt aktif sayılır'
  );

  // ---- 3. generateRoomCode: format sözleşmesi
  const sample = generateRoomCode();
  ok(sample.length === 6, 'P-12: oda kodu 6 karakter');
  ok(sample.startsWith('TM'), 'P-13: oda kodu TM öneki taşır');
  ok(CODE_RE.test(sample), 'P-14: oda kodu beklenen alfabededir (karışan I/O/0/1 yok)');
  let allValid = true;
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const code = generateRoomCode();
    if (!CODE_RE.test(code)) {
      allValid = false;
      break;
    }
    seen.add(code);
  }
  ok(allValid, 'P-15: 200 örnek kodun tamamı formata uyar');
  ok(seen.size > 100, 'P-16: üretilen kodlar çeşitlilik gösterir (tekrar sıkışması yok)');

  console.log(`protocol: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
