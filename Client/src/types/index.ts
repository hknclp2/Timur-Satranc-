// ─── Uygulama Sayfa Durumları ───────────────────────────────────────────────
export type PageState =
  | 'SPLASH'
  | 'MAIN_MENU'
  | 'PLAY_MENU'
  | 'BOT_SELECT'
  | 'LEARN_MENU'
  | 'ROADMAP'
  | 'LESSON_1'
  | 'RULES'
  | 'GAME_UNITY'; // Unity sahnesinin aktif olduğu oyun modu

// ─── Oyun Modları ────────────────────────────────────────────────────────────
export type GameMode =
  | 'bot_easy'
  | 'bot_medium'
  | 'bot_hard'
  | 'online'
  | 'local_pass_and_play'
  | 'coach_easy'
  | 'coach_medium'
  | 'coach_hard'
  | 'custom'
  | null;

export interface TimeControl {
  category: 'bullet' | 'blitz' | 'rapid' | 'daily' | 'custom' | 'none';
  label: string;
  initialMinutes: number;
  incrementSeconds: number;
  icon?: string;
}

// ─── Toast Bildirimleri ──────────────────────────────────────────────────────
export type NotificationType = 'info' | 'success' | 'error';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

// ─── Unity Bridge ────────────────────────────────────────────────────────────
export interface UnityBridge {
  isLoaded: boolean;
  loadingProgression: number;
  unityProvider: unknown;
  isDemoMode: boolean;
  sendMessage: (gameObject: string, method: string, param?: string) => void;
  startGame: (mode: string) => void;
  exitGame: () => void;
}

// ─── Taş Tipleri ─────────────────────────────────────────────────────────────
export type PieceType = 'Ş' | 'V' | 'Fe' | 'F' | 'D' | 'M' | 'K' | 'A' | 'Z' | 'P';

export interface Piece {
  type: PieceType;
  name: string;
  isWhite: boolean;
}

// ─── Bot Seçenekleri ─────────────────────────────────────────────────────────
export type BotDifficulty = 'kolay' | 'orta' | 'zor';

export interface BotConfig {
  difficulty: BotDifficulty;
  time: string;
  crowns: number;
  label: string;
  timeLimitSeconds: number;
}
