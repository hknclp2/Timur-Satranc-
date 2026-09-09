/**
 * Analyzer — rapor çıktısı (docs/mimari.md §3.6 örnek format).
 *
 * ```
 * OYUN ANALİZİ
 * ------------
 * Beyaz doğruluk   %87
 * Siyah doğruluk   %74
 * İyi hamle        21
 * Hata              4
 * Büyük hata        1
 * Kritik an: Hamle 27
 * ```
 * Eşleme: İyi = Excellent+Good; Hata = Inaccuracy+Mistake; Büyük hata = Blunder.
 */

import type { GameReport } from './gameAnalyzer';

export interface FormatOptions {
  /** true ise hamle-hamle döküm + açıklamalar eklenir. */
  verbose?: boolean;
}

export function formatReport(report: GameReport, opts: FormatOptions = {}): string {
  const acc = (v: number | null): string => (v === null ? '—' : `%${v}`);
  const out: string[] = [
    'OYUN ANALİZİ',
    '------------',
    `Beyaz doğruluk   ${acc(report.whiteAccuracy)}`,
    `Siyah doğruluk   ${acc(report.blackAccuracy)}`,
    `İyi hamle        ${report.goodMoves}`,
    `Hata              ${report.mistakes}`,
    `Büyük hata        ${report.blunders}`,
    report.criticalMove !== null
      ? `Kritik an: Hamle ${report.criticalMove.ply} (${report.criticalMove.classification}, -${report.criticalMove.lossCp}cp)`
      : 'Kritik an: —',
  ];
  if (opts.verbose) {
    out.push('');
    for (const line of report.lines) {
      out.push(
        `${line.ply}. [${line.playedBy === 'white' ? 'B' : 'S'}] ${line.algebraic} — ${line.classification} (-${line.lossCp}cp)` +
          (line.explanation ? ` :: ${line.explanation}` : ''),
      );
    }
  }
  return out.join('\n');
}
