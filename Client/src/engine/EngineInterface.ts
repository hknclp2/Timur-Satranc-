/**
 * Engine — arayüz (docs/mimari.md §7.3).
 *
 * v0.2: `SearchLimits` artık `depth` + `movetimeMs` + `nodes` taşır.
 * `movetimeMs` verilirse iterative deepening çalışır (süre dolunca SON
 * TAMAMLANAN derinliğin sonucu döner); yoksa sabit derinlik araması yapılır.
 * `infinite` (yalnızca cancel ile durma) senkron motorda desteklenmez —
 * iptal Worker fazının (Faz 6) işidir; imzada YOK, bilinçli karar.
 * TS Engine ↔ (ileride) WASM Engine AYNI arayüzü implemente eder (§3.7).
 */

import type { Move } from '../core/move/Move';
import type { Position } from '../core/position/Position';

export interface SearchLimits {
  /** Sabit derinlik (ply). `movetimeMs` YOKSA kullanılır; yoksa engine varsayılanı (3). */
  depth?: number;
  /** Zaman bütçesi, ms (bot oyunu için asıl kullanılan). Varsa ID çalışır. */
  movetimeMs?: number;
  /** Node sınırı (opsiyonel, benchmark için). Süreyle BİRLİKTE de verilebilir. */
  nodes?: number;
}

export interface PVLine {
  moves: Move[];
  evaluationCp: number; // centipawn, sideToMove lehine pozitif
}

export interface BestMoveResult {
  bestMove: Move;
  evaluationCp: number; // centipawn, aranan pozisyonda sideToMove lehine pozitif
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
  principalVariation: Move[];
  /**
   * Worker/bot katmanı uzantısı: hamle nasıl seçildi (profil ağırlığı/hata).
   * Düz engine aramasında tanımsız. Tip bilerek string-literal (bot
   * `SelectionKind` aynası; engine→bot bağımlılık yönünü bozmamak için).
   */
  selection?: 'best' | 'weighted' | 'mistake' | 'blunder';
}

export interface AnalysisResult {
  position: Position;
  bestMove: Move;
  evaluationCp: number;
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
  principalVariation: Move[];
  alternativeLines?: PVLine[]; // opsiyonel top-N aday hat (Faz 8+)
}

/**
 * Bot zorluk profili — Faz 5'te doldurulacak yer tutucu (§3.5/§7.5).
 * v0.1 `findBestMove` profili YOK SAYAR (her zaman en iyi hamle).
 */
export interface BotProfile {
  id: string;
}

export interface EngineInterface {
  findBestMove(
    position: Position,
    limits: SearchLimits,
    profile?: BotProfile, // verilmezse "en iyi hamle" (Profil V davranışı)
  ): Promise<BestMoveResult>;

  analyze(
    position: Position,
    limits: SearchLimits,
  ): Promise<AnalysisResult>;

  /** Senkron v0.1 motorda işlem yok (iptal Worker fazında anlamlıdır). */
  cancel(requestId: string): void;
}
