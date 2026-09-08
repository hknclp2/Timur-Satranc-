import type { Move } from '../core/move/Move';
import type { Position, Side } from '../core/position/Position';

export type MoveClassificationType =
  | 'brilliant'   // !! Mükemmel
  | 'great'       // ! Harika
  | 'best'        // ★ En İyi
  | 'good'        // ✓ İyi
  | 'book'        // 📖 Kitap / Açılış
  | 'inaccuracy'  // ?! Ufak Hata
  | 'mistake'     // ? Hata
  | 'miss'        // ✕ Kaçırılan Fırsat
  | 'blunder';    // ?? Büyük Hata

export interface ClassificationBadgeMeta {
  key: MoveClassificationType;
  labelTR: string;
  symbol: string;
  badgeBg: string;
  badgeText: string;
  ringColor: string;
  iconName: string;
}

export const CLASSIFICATION_METAS: Record<MoveClassificationType, ClassificationBadgeMeta> = {
  brilliant: {
    key: 'brilliant',
    labelTR: 'Mükemmel',
    symbol: '!!',
    badgeBg: 'bg-cyan-500',
    badgeText: 'text-[#052127]',
    ringColor: 'ring-cyan-400',
    iconName: 'Sparkle',
  },
  great: {
    key: 'great',
    labelTR: 'Harika',
    symbol: '!',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
    ringColor: 'ring-blue-400',
    iconName: 'ThumbsUp',
  },
  best: {
    key: 'best',
    labelTR: 'En İyi',
    symbol: '★',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    ringColor: 'ring-emerald-400',
    iconName: 'Star',
  },
  good: {
    key: 'good',
    labelTR: 'İyi',
    symbol: '✓',
    badgeBg: 'bg-emerald-700',
    badgeText: 'text-emerald-100',
    ringColor: 'ring-emerald-600',
    iconName: 'Check',
  },
  book: {
    key: 'book',
    labelTR: 'Kitap',
    symbol: '📖',
    badgeBg: 'bg-[#987554]',
    badgeText: 'text-amber-50',
    ringColor: 'ring-[#b8956e]',
    iconName: 'BookOpen',
  },
  inaccuracy: {
    key: 'inaccuracy',
    labelTR: 'Küçük Hata',
    symbol: '?!',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-[#241a02]',
    ringColor: 'ring-amber-300',
    iconName: 'Warning',
  },
  mistake: {
    key: 'mistake',
    labelTR: 'Hata',
    symbol: '?',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    ringColor: 'ring-orange-400',
    iconName: 'WarningCircle',
  },
  miss: {
    key: 'miss',
    labelTR: 'Kaçırılan Fırsat',
    symbol: '✕',
    badgeBg: 'bg-[#e04f5f]',
    badgeText: 'text-white',
    ringColor: 'ring-red-400',
    iconName: 'XCircle',
  },
  blunder: {
    key: 'blunder',
    labelTR: 'Büyük Hata',
    symbol: '??',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white',
    ringColor: 'ring-red-500',
    iconName: 'Skull',
  },
};

export interface ReviewedMove {
  ply: number; // 1-based (1, 2, 3...)
  moveNumber: number; // 1. White, 1. Black => 1, 1, 2, 2
  playedBy: Side;
  notation: string;
  from: number;
  to: number;
  bestFrom: number;
  bestTo: number;
  bestMoveNotation: string;
  classification: MoveClassificationType;
  lossCp: number;
  evalBeforeCp: number;
  evalAfterCp: number;
  coachComment: string;
  tacticalNote?: string;
  bestMoveReason?: string;
  positionBefore: Position;
  positionAfter: Position;
}

export interface ReviewPerformanceArea {
  ratingLevel: 'excellent' | 'good' | 'average' | 'inaccurate';
  score: number; // 0..100
  noteTR: string;
}

export interface FullGameReviewReport {
  whiteName: string;
  blackName: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteRatingEstimate: number;
  blackRatingEstimate: number;
  coachIntro: {
    title: string;
    summary: string;
    tone: 'praise' | 'neutral' | 'critical';
  };
  evalCurve: number[]; // centipawn eval values for each move
  evalCurveNodes: {
    ply: number;
    evalCp: number;
    classification: MoveClassificationType;
    isKeyMoment: boolean;
  }[];
  counts: {
    white: Record<MoveClassificationType, number>;
    black: Record<MoveClassificationType, number>;
  };
  areas: {
    opening: ReviewPerformanceArea;
    tactics: ReviewPerformanceArea;
    strategy: ReviewPerformanceArea;
    citadels: ReviewPerformanceArea;
  };
  moves: ReviewedMove[];
  criticalPlies: number[]; // Key moments to jump to
}
