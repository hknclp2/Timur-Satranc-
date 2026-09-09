/**
 * Bot — 5 zorluk profili (docs/mimari.md §7.5 KESİN PARAMETRE TABLOSU v1).
 *
 * İlke (§3.5): 5 ayrı algoritma DEĞİL, tek Engine + 5 profil. Zayıf bot
 * tamamen rastgele oynamaz — Engine'in en iyi N hamlesi arasından ağırlıklı
 * olasılıkla seçer (satranç mantığı içinde "insan gibi hata").
 *
 * Faz 4 kalibrasyonu (bot hissi): I bariz zayıf (sığ arama + geniş havuz +
 * yüksek hata), II-III orta bant, IV neredeyse hatasız, V tam güç.
 * I'in kuyruğu 10 adaya uzatıldı (candidateLimit=10 → weights 10 eleman).
 * Değerler `bot/__tests__/calibration.test.ts` sapma/win-rate testleriyle
 * doğrulanır; Faz 5 self-play/kullanıcı testiyle yeniden ayarlanabilir.
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
  movetimeMs: 150,
  maxDepth: 2,
  candidateLimit: 10,
  evaluationNoise: 220,
  mistakeRate: 0.4,
  blunderRate: 0.15,
  // Düzleştirilmiş dağılım (10 aday, toplam 100).
  weights: [22, 18, 15, 12, 10, 8, 6, 4, 3, 2],
};

const II: BotProfile = {
  id: 'II',
  name: 'Kolay',
  movetimeMs: 400,
  maxDepth: 3,
  candidateLimit: 7,
  evaluationNoise: 120,
  mistakeRate: 0.25,
  blunderRate: 0.07,
  weights: [35, 22, 15, 11, 8, 5, 4],
};

const III: BotProfile = {
  id: 'III',
  name: 'Orta',
  movetimeMs: 800,
  maxDepth: 5,
  candidateLimit: 4,
  evaluationNoise: 40,
  mistakeRate: 0.08,
  blunderRate: 0.01,
  weights: [60, 22, 11, 7],
};

const IV: BotProfile = {
  id: 'IV',
  name: 'Zor',
  movetimeMs: 1500,
  maxDepth: 8,
  candidateLimit: 3,
  evaluationNoise: 10,
  mistakeRate: 0.02,
  blunderRate: 0,
  weights: [80, 14, 6],
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
