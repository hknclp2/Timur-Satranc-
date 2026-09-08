/**
 * Bot — 5 zorluk profili (docs/mimari.md §7.5 KESİN PARAMETRE TABLOSU v1).
 *
 * İlke (§3.5): 5 ayrı algoritma DEĞİL, tek Engine + 5 profil. Zayıf bot
 * tamamen rastgele oynamaz — Engine'in en iyi N hamlesi arasından ağırlıklı
 * olasılıkla seçer (satranç mantığı içinde "insan gibi hata").
 *
 * Tablo v1 başlangıç değeridir; Faz 5 self-play/kullanıcı testiyle
 * yeniden ayarlanacak (spec kalibrasyon notu).
 */

export type BotProfileId = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface BotProfile {
  id: BotProfileId;
  /** Görünen ad. */
  name: string;
  /** Zaman bütçesi, ms (engine'e `movetimeMs` olarak verilir). */
  movetimeMs: number;
  /** Maksimum derinlik (ID üst sınırı). V: sonsuz = SADECE süre sınırlar. */
  maxDepth: number;
  /** Aday havuzu: evaluation-sıralı en iyi N hamle. */
  candidateLimit: number;
  /** Aday skorlarına eklenen ± gürültü (cp). */
  evaluationNoise: number;
  /** Aday-dışı hamle seçme olasılığı (0-1). */
  mistakeRate: number;
  /** Rastgele legal hamle seçme olasılığı (0-1). */
  blunderRate: number;
  /**
   * Ağırlıklı seçim dağılımı (aday sırasına göre %, toplam 100).
   * Uzunluğu candidateLimit'e EŞİTTİR (spec tablosu birebir).
   */
  weights: number[];
}

const I: BotProfile = {
  id: 'I',
  name: 'Çok Kolay',
  movetimeMs: 200,
  maxDepth: 3,
  candidateLimit: 8,
  evaluationNoise: 150,
  mistakeRate: 0.35,
  blunderRate: 0.12,
  weights: [35, 25, 15, 10, 6, 4, 3, 2],
};

const II: BotProfile = {
  id: 'II',
  name: 'Kolay',
  movetimeMs: 500,
  maxDepth: 5,
  candidateLimit: 6,
  evaluationNoise: 80,
  mistakeRate: 0.2,
  blunderRate: 0.05,
  weights: [50, 25, 12, 7, 4, 2],
};

const III: BotProfile = {
  id: 'III',
  name: 'Orta',
  movetimeMs: 1000,
  maxDepth: 7,
  candidateLimit: 4,
  evaluationNoise: 30,
  mistakeRate: 0.08,
  blunderRate: 0.01,
  weights: [70, 18, 8, 4],
};

const IV: BotProfile = {
  id: 'IV',
  name: 'Zor',
  movetimeMs: 2000,
  maxDepth: 10,
  candidateLimit: 3,
  evaluationNoise: 10,
  mistakeRate: 0.02,
  blunderRate: 0.002,
  weights: [88, 9, 3],
};

const V: BotProfile = {
  id: 'V',
  name: 'Uzman',
  movetimeMs: 4000,
  maxDepth: Infinity, // movetime sınırlı
  candidateLimit: 1,
  evaluationNoise: 0,
  mistakeRate: 0,
  blunderRate: 0,
  weights: [100],
};

export const BOT_PROFILES: Record<BotProfileId, BotProfile> = { I, II, III, IV, V };

/** Spec §7.5 tutarlılık denetimi (weights uzunluğu = candidateLimit, toplam 100). */
export function validateProfile(p: BotProfile): string[] {
  const errors: string[] = [];
  if (p.weights.length !== p.candidateLimit) {
    errors.push(`${p.id}: weights uzunluğu (${p.weights.length}) != candidateLimit (${p.candidateLimit})`);
  }
  const sum = p.weights.reduce((a, b) => a + b, 0);
  if (sum !== 100) errors.push(`${p.id}: ağırlık toplamı ${sum} != 100`);
  return errors;
}
