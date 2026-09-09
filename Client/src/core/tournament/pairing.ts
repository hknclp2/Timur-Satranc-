/**
 * Turnuva Arenası — tur eşleştirme (MVP iskeleti, Faz 8).
 *
 * Swiss DEĞİL, arena usulü basit eşleştirme:
 *  - Aynı skor grubunda eşleştir (puanı yakın olanlar oynar).
 *  - Tekrarı önle (pastPairings'te kaydı olan ikili yeniden eşleşmez;
 *    kaçınılmazsa son çare olarak tekrara izin verilir).
 *  - Tek sayıda bay (bye) ver: en düşük skorlu oyuncu turu boş geçer.
 *
 * Saf fonksiyon — DB yok, G/Ç yok, girdi dizilerini mutate etmez.
 */

export interface ArenaPlayer {
  id: string;
  score: number;
}

export interface ArenaPair {
  whiteId: string;
  blackId: string;
}

export interface PairRoundResult {
  pairs: ArenaPair[];
  /** Tek sayıda oyuncu varsa turu boş geçen oyuncu, yoksa null. */
  byePlayerId: string | null;
}

/**
 * İkili anahtarı (sıra bağımsız): "a|b" (a < b sözlük sırasıyla).
 * `pastPairings` set'i bu formatta tutulur; iki yönlü kontrol yapılır.
 */
export function pairingKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function hasPlayedBefore(a: string, b: string, pastPairings: Set<string>): boolean {
  return pastPairings.has(pairingKey(a, b));
}

/**
 * Bir tur için eşleştirme üretir.
 *
 * @param players     Turdaki oyuncular (en az 0; id benzersiz olmalı).
 * @param pastPairings Daha önce eşleşmiş ikililerin set'i (`pairingKey` formatı).
 * @returns pairs + tek sayıda kalan bye oyuncusu.
 */
export function pairRound(
  players: ArenaPlayer[],
  pastPairings: Set<string>,
): PairRoundResult {
  if (players.length === 0) {
    return { pairs: [], byePlayerId: null };
  }

  // Deterministik sıralama: skor azalan, eşitlikte id artan. Kopya üzerinde çalış.
  const sorted: ArenaPlayer[] = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Tek sayı → en düşük skorlu (listenin sonu) bay alır.
  let byePlayerId: string | null = null;
  let pool: ArenaPlayer[] = sorted;
  if (sorted.length % 2 === 1) {
    const bye = sorted[sorted.length - 1];
    byePlayerId = bye.id;
    pool = sorted.slice(0, -1);
  }

  const unpaired: ArenaPlayer[] = [...pool];
  const pairs: ArenaPair[] = [];

  while (unpaired.length >= 2) {
    const current = unpaired.shift() as ArenaPlayer;

    // 1. öncelik: aynı skor + daha önce oynamamış.
    let idx = unpaired.findIndex(
      (cand) => cand.score === current.score && !hasPlayedBefore(current.id, cand.id, pastPairings),
    );
    // 2. öncelik: farklı skor + daha önce oynamamış (skor farkı en küçük).
    if (idx === -1) {
      let bestIdx = -1;
      let bestGap = Number.POSITIVE_INFINITY;
      for (let i = 0; i < unpaired.length; i++) {
        const cand = unpaired[i];
        if (hasPlayedBefore(current.id, cand.id, pastPairings)) continue;
        const gap = Math.abs(cand.score - current.score);
        if (gap < bestGap || (gap === bestGap && (bestIdx === -1 || cand.id < unpaired[bestIdx].id))) {
          bestGap = gap;
          bestIdx = i;
        }
      }
      idx = bestIdx;
    }
    // 3. son çare: tekrar — kaçınılmazsa aynı skorlu ilk aday.
    if (idx === -1) {
      idx = 0;
    }

    const opponent = unpaired.splice(idx, 1)[0];
    // Sıralamada önce gelen (yüksek skorlu / id'si küçük) beyaz.
    pairs.push({ whiteId: current.id, blackId: opponent.id });
  }

  return { pairs, byePlayerId };
}
