/**
 * Turnuva Arenası — puan tablosu (MVP iskeleti, Faz 8).
 *
 * Sıralama: puan azalan → galibiyet sayısı (tiebreak) azalan → id artan.
 * Saf fonksiyon — DB yok, G/Ç yok.
 */

export interface StandingPlayer {
  id: string;
  score: number;
}

/** Sonuç: 'white' | 'black' | 'draw' | null (oynanmadı / bilinmiyor). */
export type PairingResult = 'white' | 'black' | 'draw' | null;

export interface StandingPairing {
  whiteId: string;
  blackId: string;
  result: PairingResult;
}

export interface StandingRow {
  id: string;
  score: number;
  /** Bu oyuncunun kazandığı oyun sayısı (tiebreak). */
  wins: number;
  /** 1-tabanlı sıra (eşit puan+galibiyet aynı sırayı paylaşır). */
  rank: number;
}

/**
 * Puan tablosunu hesaplar.
 *
 * @param players  Güncel skorlar (tek kaynak: tournament_players.score).
 * @param pairings Bitmiş/oynanmakta olan eşleşmeler (galibiyet sayımı için).
 * @returns Sıralı tablo (rank dahil).
 */
export function computeStandings(
  players: StandingPlayer[],
  pairings: StandingPairing[],
): StandingRow[] {
  const wins = new Map<string, number>();
  for (const p of players) {
    wins.set(p.id, 0);
  }

  for (const g of pairings) {
    if (g.result === 'white') {
      wins.set(g.whiteId, (wins.get(g.whiteId) ?? 0) + 1);
    } else if (g.result === 'black') {
      wins.set(g.blackId, (wins.get(g.blackId) ?? 0) + 1);
    }
    // draw / null galibiyet saymaz.
  }

  const rows: StandingRow[] = players.map((p) => ({
    id: p.id,
    score: p.score,
    wins: wins.get(p.id) ?? 0,
    rank: 0,
  }));

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Yoğun olmayan ("1,2,2,4" tarzı) sıra: eşit skor+galibiyet aynı rank.
  let currentRank = 0;
  let prevScore: number | null = null;
  let prevWins: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].score !== prevScore || rows[i].wins !== prevWins) {
      currentRank = i + 1;
      prevScore = rows[i].score;
      prevWins = rows[i].wins;
    }
    rows[i].rank = currentRank;
  }

  return rows;
}
