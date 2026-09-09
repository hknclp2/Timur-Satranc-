/**
 * Online ELO — saf fonksiyonlar (DB yok, bot yok).
 * Sadece çevrim içi (online) oyunlar için kullanılır.
 */

export const START_RATING = 1200;

/** İlk 10 maçta uygulanan K faktörü (provisional / yeni oyuncu). */
export const K_NEW = 40;

/** Yerleşik oyuncu K faktörü (10+ maç). */
export const K = 32;

/** Provisional eşik: bu sayıdan AZ maçı olan oyuncu yeni sayılır. */
export const PROVISIONAL_GAMES = 10;

export type EloResult = 'white' | 'black' | 'draw';

export interface RatingUpdate {
  newWhite: number;
  newBlack: number;
  /** Beyaz perspektifinden rating değişimi (newWhite - whiteRating). */
  delta: number;
}

/**
 * K faktörü seçimi: maç sayısı < 10 ise K_NEW, değilse K.
 * @param gamesPlayed Bu maçtan ÖNCE oynanmış maç sayısı.
 */
export function getKFactor(gamesPlayed: number): number {
  const games = Number.isFinite(gamesPlayed) ? Math.max(0, Math.floor(gamesPlayed)) : 0;
  return games < PROVISIONAL_GAMES ? K_NEW : K;
}

/** Yeni oyuncu (provisional) mu? */
export function isProvisional(gamesPlayed: number): boolean {
  const games = Number.isFinite(gamesPlayed) ? Math.max(0, Math.floor(gamesPlayed)) : 0;
  return games < PROVISIONAL_GAMES;
}

/**
 * Klasik ELO beklenen skor: a rating'li oyuncunun b'ye karşı beklenen skoru.
 * E(a,b) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function toScore(result: EloResult): { white: number; black: number } {
  if (result === 'white') return { white: 1, black: 0 };
  if (result === 'black') return { white: 0, black: 1 };
  return { white: 0.5, black: 0.5 };
}

/**
 * İki oyuncunun yeni rating'lerini hesaplar (yuvarlanmış tam sayı).
 * @param whiteRating Beyazın maç öncesi rating'i
 * @param blackRating Siyahın maç öncesi rating'i
 * @param result Oyun sonucu (beyaz perspektifiyle 'white' | 'black' | 'draw')
 * @param whiteGames Beyazın maç öncesi maç sayısı (K seçimi için)
 * @param blackGames Siyahın maç öncesi maç sayısı (K seçimi için)
 */
export function updateRatings(
  whiteRating: number,
  blackRating: number,
  result: EloResult,
  whiteGames: number,
  blackGames: number
): RatingUpdate {
  const wRating = Number.isFinite(whiteRating) ? whiteRating : START_RATING;
  const bRating = Number.isFinite(blackRating) ? blackRating : START_RATING;
  const actual = toScore(result);
  const expectedWhite = expectedScore(wRating, bRating);
  const expectedBlack = 1 - expectedWhite;

  const kWhite = getKFactor(whiteGames);
  const kBlack = getKFactor(blackGames);

  const newWhite = Math.round(wRating + kWhite * (actual.white - expectedWhite));
  const newBlack = Math.round(bRating + kBlack * (actual.black - expectedBlack));

  return { newWhite, newBlack, delta: newWhite - wRating };
}
