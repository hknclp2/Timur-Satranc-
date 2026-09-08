const PLAYER_ID_KEY = 'timur_player_id';
const PLAYER_NAME_KEY = 'timur_player_name';

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined';
}

function generateShortId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return ((crypto as any).randomUUID() as string).slice(0, 8);
    }
  } catch {
    // fallback'e dus
  }
  return Math.random().toString(36).substring(2, 10);
}

export function getOrCreatePlayerId(): string {
  if (!isBrowser()) {
    return generateShortId();
  }
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = generateShortId();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return generateShortId();
  }
}

export function getPlayerName(): string {
  if (!isBrowser()) {
    return '';
  }
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPlayerName(name: string): void {
  if (!isBrowser()) {
    return;
  }
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // storage yazilamazsa sessiz gec
  }
}
