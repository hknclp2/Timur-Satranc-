# Frozen Rules — Timur Satrancı Çekirdek Kuralları (Faz 0 Kilidi)

Bu dosya, oyun kuralı çekirdeğinin **değiştirilemez** anlık görüntüsüdür.
Aşağıdaki maddeler `boardSetup.ts`, `shared.ts` (+ port kaynağı `moveRules.ts`),
`Position.ts` ve `Move.ts` dosyalarının Faz 0 sonundaki hâlini kilitler.
Bu maddelere aykırı hiçbir değişiklik yapılamaz; değişiklik gerekiyorsa önce
bu dosya güncellenir ve tüm süitler yeniden yeşile döndürülür.

Dondurulan dosyalar (tek doğruluk kaynağı):

- `src/core/engine/boardSetup.ts`
- `src/core/rules/shared.ts` (port kaynağı: `src/core/engine/moveRules.ts`)
- `src/core/engine/moveRules.ts` (legacy referans motor — davranış korunur)
- `src/core/position/Position.ts`
- `src/core/move/Move.ts`

> İSİM NOTU (kritik): `boardSetup.ts` / `moveRules.ts` **legacy** isimleri kullanır,
> yeni çekirdek (`Position.ts` / `shared.ts`) spec isimlerini kullanır. Eşleme birebir:
> legacy `queen` (1 DÜZ giden Vezir) → `PieceKind.General`;
> legacy `general` (1 ÇAPRAZ giden Fers) → `PieceKind.Ferz`;
> legacy `bishop` (Fil) → `PieceKind.Alfil`;
> legacy `warMachine` (Mancınık) → `PieceKind.Dabbaba`;
> legacy `prince` (Şehzade) → `PieceKind.Prince`.
> Ters eşleme YASAKTIR (Vezir/Fers hareketleri yer değiştirir).

## 1. Başlangıç Dizilimi — `boardSetup.ts`

Tahta: 11 sütun (x = 0..10 / a..k) × 10 satır (y = 0..9) + 2 hisar.

### 1.1 `BACK_ROW_SETUP` (beyaz Y=0, siyah Y=9; 1., 4., 6., 9. sütunlar BOŞ)

```ts
export const BACK_ROW_SETUP: { [x: number]: PieceType } = {
  0: 'bishop',     // Fil
  2: 'camel',      // Deve
  4: 'warMachine', // Mancınık
  6: 'warMachine', // Mancınık
  8: 'camel',      // Deve
  10: 'bishop',    // Fil
};
```

### 1.2 `MIDDLE_ROW_SETUP` (beyaz Y=1, siyah Y=8; 11 sütun dolu)

```ts
export const MIDDLE_ROW_SETUP: { [x: number]: PieceType } = {
  0: 'rook',       // Kale
  1: 'knight',     // At
  2: 'picket',     // Tale'a (Piket)
  3: 'giraffe',    // Zürafa
  4: 'general',    // Fers (1 çapraz)
  5: 'king',       // Şah
  6: 'queen',      // Vezir (1 düz)
  7: 'giraffe',    // Zürafa
  8: 'picket',     // Tale'a (Piket)
  9: 'knight',     // At
  10: 'rook',      // Kale
};
```

### 1.3 `PAWN_COLUMN_PROMOTIONS` (beyaz Y=2, siyah Y=7 piyon dizisi; her sütunun alt-subay türü)

```ts
export const PAWN_COLUMN_PROMOTIONS: PieceType[] = [
  'rook',      // x=0: Kale piyonu
  'knight',    // x=1: At piyonu
  'picket',    // x=2: Tale'a piyonu
  'giraffe',   // x=3: Zürafa piyonu
  'general',   // x=4: Fers piyonu  (→ yeni çekirdekte Ferz)
  'king',      // x=5: Şah piyonu   (→ Şehzade hattı; Pawn-of-Pawns değil, Prince hattı)
  'queen',     // x=6: Vezir piyonu (→ yeni çekirdekte General)
  'giraffe',   // x=7: Zürafa piyonu
  'picket',    // x=8: Tale'a piyonu
  'knight',    // x=9: At piyonu
  'rook',      // x=10: Kale piyonu
];
```

Yerleşim sırası (`createInitialBoardSetup`): siyah arka (Y=9) → siyah orta (Y=8) →
siyah piyon (Y=7) → beyaz piyon (Y=2) → beyaz orta (Y=1) → beyaz arka (Y=0).
Piyonlar `promotedFrom = PAWN_COLUMN_PROMOTIONS[x]` ile kurulur. Hisarlar başlangıçta boştur.

## 2. Taş Hareket Vektörleri — `shared.ts` `pseudoTargets()` (şah-güvenliği filtresi YOK)

`moveRules.ts` `getValidMoves` birebir portudur. Kilitli vektör listesi:

- **Şah + Şehzade** (`King`, `Prince`): 8 yön × 1 adım. Hisar girişi SADECE Şah:
  beyaz Şah `x==0 ve |y-8|<=1` → 110; siyah Şah `x==10 ve |y-1|<=1` → 111.
  Şehzade hisara GİREMEZ.
- **Vezir** (`General` = legacy `queen`): 4 düz yön × 1 kare.
- **Fers** (`Ferz` = legacy `general`): 4 çapraz yön × 1 kare.
- **Zürafa** (`Giraffe`): 1 çapraz adım (BOŞ olmalı) + ardından en az 3 kare düz,
  sonra o düz doğrultuda kayar (4 çapraz grup × 2 düz kol).
- **Tale'a** (`Picket`): 4 çapraz yönde EN AZ 2 kareden başlayıp kayar
  (`slideRay(dx, dy, minDist=2, maxDist=10)`; ara kareler boş olmalı).
- **At** (`Knight`): 2+1 atlama, 8 hedef (engel atlar).
- **Kale** (`Rook`): 4 düz yönde kayar (`minDist=1, maxDist=10`).
- **Fil** (`Alfil` = legacy `bishop`): TAM 2 kare çapraz atlama, 4 hedef (engel atlar).
- **Deve** (`Camel`): 3+1 L atlama, 8 hedef (engel atlar).
- **Mancınık** (`Dabbaba` = legacy `warMachine`): TAM 2 kare düz atlama, 4 hedef (engel atlar).
- **Piyon** (`Pawn`): yön beyaza +1 satır / siyaha −1 satır; 1 ileri SADECE boşsa;
  çapraz 1 kare SADECE düşman varsa (alma). **Çift-sürüş YOK, terfi türü burada
  çözülmez** (bkz. Madde 3).

Hisar-içi taş çıkışı: 110'daki taş → `(0,7),(0,8),(0,9)`; 111'deki taş →
`(10,0),(10,1),(10,2)` komşu tahta karelerine çıkar.

## 3. Piyon Terfisi — `resolvePawnPromotion()` (`processPawnPromotion` portu)

- Terfi satırı: beyaz `row == 9`, siyah `row == 0` (`isPromotionTarget`).
- Şah piyonu (`pawnOf === King`, yani x=5 sütunu) → **Şehzade (`Prince`)**,
  relocation YOK.
- Pawn-of-Pawns (`pawnOf === Pawn` veya `pawnStage` tanımlı):
  - `stage == 0` → taş terfi etmez, **güvenli-kareye taşınır** (piyon kalır, `newStage: 1`,
    `isRelocation: true`). Güvenli-kare: `findSafeRelocationSquare` —
    rakip saldırı kareleri dışında, beyaz `[2,1,0]` / siyah `[7,8,9]` satır
    önceliğinde ilk boş kare; yoksa aynı bantta ilk boş kare.
  - `stage >= 1` (veya güvenli-kare yoksa) → **Şehzade (`Prince`)**, `newStage: 2`.
- Alt-subay piyonları → kendi türüne terfi eder (`customType ?? pawn.pawnOf`).

## 4. Şah Takası — `kingSwapTargets()` (`validateKingSwap`/`generateKingSwapMoves` portu)

- Maçta taraf başına EN FAZLA 1 kez (`hasUsedKingSwap[side]` true ise liste boş).
- Şah tahtada olmalı (hisardaki şah takas yapamaz/yaptıramaz).
- Hedef: tahtadaki, şah-dışı, aynı-renk taş (hisardaki taş hedef OLAMAZ).
- Takas simülasyonu sonrası şah saldırı altında kalmamalı
  (`isAttacked` ile doğrulanır).
- Takas iki dost taşın yer değiştirmesidir; taş alma DEĞİLDİR.

## 5. Hisar Koordinatları

- `110` = üst-sol hisar (`topLeft`): **beyaz Şah'ın hedefi**
  (legacy: `x=-1,y=8` + `blackCitadelPiece`).
- `111` = alt-sağ hisar (`bottomRight`): **siyah Şah'ın hedefi**
  (legacy: `x=11,y=1` + `whiteCitadelPiece`).
- Toplam kare: `BOARD_SQUARES = 110`, `TOTAL_SQUARES = 112`.
- Senkron değişmezi: `board[110/111]` ↔ hisar `occupant` HER ZAMAN aynıdır;
  yazanlar iki aynayı da günceller (`applyMoveToArrays`/`revertMoveInArrays`).
- QUIRK (birebir korunur): `isAttacked` saldırgan taraması SADECE tahta
  karelerindedir; hisar içindeki rakip taş saldırgan sayılmaz.
- Hisar beraberliği: beyaz Şah rakip (sol) hisara girerse veya siyah Şah rakip
  (sağ) hisara girerse oyun BERABERE biter (`DRAW_BY_CITADEL`).

## 6. Pat = Galibiyet (stalemate_win)

- Yasal hamlesi kalmayan taraf **KAYBEDER**; karşı taraf KAZANIR.
- Yeni çekirdek: `GameResult = { type: 'stalemate_win'; winner: Side }`
  (`Position.ts`).
- Legacy motor karşılığı: `calculateGameStatus` → `status: 'LOSS_BY_STALEMATE'`,
  `winner: opponentColor` (`moveRules.ts`).
- Standart satrançtaki "pat = beraberlik" bu oyunda YOKTUR.
- Şah çekilirken hamlesiz kalmak = mat (`checkmate`/`CHECKMATE`); şah çekilmeden
  hamlesiz kalmak = pat-kaybı (yukarıdaki kural).

## 7. Yasak Hamleler: Rok YOK, En-Passant YOK

- **Rok kesinlikle yoktur.** Şah yalnızca 8 komşu kareye 1 adım gider (+ hisar
  girişi, + Madde 4'teki Şah Takası). Kodda rok/castling mantığı yoktur.
- **Geçerken alma (en-passant) yoktur.** Piyon hareketi Madde 2'deki gibidir:
  tek ileri + çapraz alma; çift-sürüş ve yoldan alma kodu yoktur.

## 8. Test Komutları

```bash
# client/ dizininden — tüm süitler (derle + çalıştır):
npm run test
# Proje geneli tip kontrolü:
npx tsc --noEmit
```

`npm run test` karşılığı (`package.json`):
`tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node
--outDir build/test-tmp src/core/__tests__/runTests.ts`
+ `build/test-tmp/package.json` içine `{"type":"commonjs"}`
+ `node build/test-tmp/core/__tests__/runTests.js`

### Faz 0 sonucu (2026-09-08)

- `npm run test` → **TOTAL: 181 passed, 0 failed** (exit 0).
  gameCore 72/72 · engine 14/14 · eval 15/15 · bot 15/15 · calibration 12/12 ·
  worker 17/17 · analyzer 28/28 · botgame 8/8.
- `npx tsc --noEmit` → **hata yok** (exit 0).
- `npm run test` kapsamındakiler: `core/__tests__` (runTests + gameCore),
  `engine/__tests__` (engine + evaluation), `bot/__tests__` (profiles +
  calibration + botgame), `analyzer/__tests__` (analyzer), ayrıca
  `worker/__tests__` (worker).
- Kapsam DIŞI (ayrı entry'li, `npm run test` çalıştırmaz):
  `core/engine/__tests__/timurRules.test.ts` (kendi `run.ts`'i var),
  `core/rules/__tests__/pipeline.perft.test.ts`.
