/**
 * Engine — Transposition Table (§3.4).
 *
 * Anahtar: `Position.zobristHash` (bigint; sideToMove hash'e dahildir —
 * bkz. `computeZobristForArrays`). Değer: derinlik + skor + bayrak +
 * en iyi hamle. Replacement: always-replace (en basit politika; spec §8
 * madde 6'daki "TT replacement policy" açık kararı olarak not edildi).
 *
 * Basitleştirme (v0.1, bilinçli): tekrar/fifty-move sayaçları ve
 * halfMoveClock TT anahtarına DAHİL DEĞİLDİR — aynı hash farklı sayaçla
 * çakışırsa eski skor okunabilir. Derin aramada nadir ve zararsız kabul
 * edildi (klasik motorlarda da benzer yaklaşımlar vardır); istenirse
 * anahtara sayaç katılarak sıkılaştırılabilir.
 */

import type { Move } from '../../core/move/Move';

export enum TTFlag {
  Exact = 0,
  Lower = 1,
  Upper = 2,
}

export interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  /** Kökte olmasa da sıralama için saklanan en iyi hamle (from/to karşılaştırılır). */
  bestFrom: number;
  bestTo: number;
}

export class TranspositionTable {
  private table = new Map<bigint, TTEntry>();
  hits = 0;
  stores = 0;

  get(hash: bigint): TTEntry | undefined {
    const e = this.table.get(hash);
    if (e) this.hits++;
    return e;
  }

  set(hash: bigint, entry: TTEntry): void {
    this.table.set(hash, entry); // always-replace
    this.stores++;
  }

  get size(): number {
    return this.table.size;
  }

  clear(): void {
    this.table.clear();
    this.hits = 0;
    this.stores = 0;
  }
}

/** TT hamlesi mi? (sıralamada öne almak için from/to eşleşmesi). */
export function isTTMove(entry: TTEntry | undefined, move: Move): boolean {
  return entry !== undefined && entry.bestFrom === move.from && entry.bestTo === move.to;
}
