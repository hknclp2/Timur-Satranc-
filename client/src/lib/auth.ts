const PLAYER_ID_KEY = 'timur_player_id';
const PLAYER_NAME_KEY = 'timur_player_name';
// Oyuncu adı üst sınırı (PlayAFriendModal input maxLength=20 ile aynı).
const MAX_PLAYER_NAME_LEN = 20;
// Bozuk/şişirilmiş saklı ID'leri onarmak için üst sınır.
const MAX_PLAYER_ID_LEN = 64;

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
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored && stored.trim().length > 0 && stored.length <= MAX_PLAYER_ID_LEN) {
      return stored;
    }
    const id = generateShortId();
    localStorage.setItem(PLAYER_ID_KEY, id);
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
    localStorage.setItem(PLAYER_NAME_KEY, (name ?? '').trim().slice(0, MAX_PLAYER_NAME_LEN));
  } catch {
    // storage yazilamazsa sessiz gec
  }
}
