# Timur Satrancı — Sistem Mimarisi Referans Dokümanı

Sürüm: v1 (mevcut) → v2 (hedef, engine odaklı)
Kapsam: İnsan geliştiriciler ve agent/tool kullanımı için referans doküman.
Üslup: Teknik, madde bazlı, yorum içermez. Her bölüm bağımsız okunabilir.

---

## 0. Doküman Amacı

Bu doküman iki şeyi tek kaynakta birleştirir:

1. **v1 — Mevcut mimari**: Şu an çalışan React tabanlı istemci, oyun kuralları ve öğrenme modülü.
2. **v2 — Hedef mimari**: Game Core / Engine / Bot / Analyzer / Worker / WASM ayrımına dayanan, performans odaklı yeniden yapılanma planı.

Amaç: Yeni bir geliştirici veya bir kod ajanı, bu dosyayı okuyarak (a) sistemin şu an nasıl çalıştığını, (b) nereye doğru gidildiğini, (c) hangi dosyanın hangi sorumluluğu taşıdığını tek seferde anlayabilsin.

---

## 1. Üst Seviye Katman Listesi

| # | Katman | v1 Durumu | v2 Hedefi |
|---|--------|-----------|-----------|
| 1 | Sunum (UI/Views) | React 18 + Tailwind, mevcut | Değişmez, sadece Game Controller üzerinden Core'a bağlanır |
| 2 | Durum Yönetimi (Hooks) | `useGame`, `useGameState`, `useSetupEditor` | Game Controller olarak sadeleşir, hesaplama içermez |
| 3 | Game Core | `moveRules.ts`, `boardSetup.ts`, `notation/` içine gömülü | Ayrı modül: `Position`, `Move`, `Rules` |
| 4 | Engine | Yok (bot mantığı hook'lara karışık) | Ayrı modül: `Search`, `Evaluation`, `TT`, `Move Ordering` |
| 5 | Bot | Yok / basit | Tek Engine + 5 zorluk profili |
| 6 | Analyzer | Yok | Move Analyzer + Game Analyzer + Report |
| 7 | Worker/WASM | Yok | Ağır hesaplamanın izole edildiği katman |
| 8 | Learn System | `learnContent.ts`, `learnProgress.ts` | Değişmez |
| 9 | Asset/Unity | 3D/2D varlıklar | Değişmez |

---

## 2. v1 — Mevcut Mimari

### 2.1 Katmanlı Şema

```
UI Layer (React 18 + Tailwind)
  App.tsx → Views → Pages → Modals → HUD
       │
Hook Layer (Custom Hooks)
  useGame.ts / useGameState.ts / useSetupEditor.ts
       │
Core Layer (Kural Motoru — henüz "Engine" değil)
  moveRules.ts / boardSetup.ts / notation/ / bot/ / setup/
       │
Learn Layer
  learnContent.ts / learnProgress.ts
       │
Asset/Unity Layer
  Assets / Unity Engine kaynakları
```

### 2.2 Klasör Yapısı (mevcut, bilinen kısım)

```
Client/src/
├── App.tsx
├── components/
│   ├── MainMenuPage.tsx
│   ├── PlayMenuPage.tsx
│   ├── BotSelectPage.tsx
│   ├── LearnMenuPage.tsx
│   ├── LessonDetailPage.tsx
│   ├── RulesPage.tsx
│   ├── RoadmapPage.tsx
│   ├── ToastNotification.tsx
│   ├── board/
│   │   ├── BoardGrid.tsx
│   │   ├── PieceView.tsx
│   │   ├── CitadelBadge.tsx
│   │   └── PromotionModal.tsx
│   ├── game/
│   │   ├── BoardContainer.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── CapturedPieces.tsx
│   │   ├── NotationHeader.tsx
│   │   ├── ControlBar.tsx
│   │   ├── BottomToolbar.tsx
│   │   └── GameOverModal.tsx
│   └── learn/
│       └── PuzzleStaticCard.tsx
├── views/
│   ├── ScreenPlayView.tsx
│   └── SetupEditorView.tsx
├── hooks/
│   ├── useGame.ts
│   ├── useGameState.ts
│   └── useSetupEditor.ts
├── core/
│   ├── engine/
│   │   └── moveRules.ts
│   ├── notation/
│   ├── bot/
│   └── setup/
│       └── setupValidator.ts
└── learn/
    ├── learnContent.ts
    └── learnProgress.ts
```

### 2.3 Sunum Katmanı — Bileşen Sorumlulukları

| Dosya | Sorumluluk |
|---|---|
| `App.tsx` | Root router, global `PageState`, toast bildirimleri, aktif maç konfigürasyonu |
| `MainMenuPage.tsx` | Ana menü: 3D tahta animasyonu, mağaza, profil, ayarlar, "Oyna"/"Öğren" girişleri |
| `PlayMenuPage.tsx` | Oyun modu seçimi: Bota Karşı, Ekranda Oyna, Arkadaşla Oyna, Turnuva, Dizilim Editörü |
| `ScreenPlayView.tsx` | Canlı maç ekranı: tahta, hisarlar, saat, hamle geçmişi, teslim/beraberlik, maç sonu |
| `SetupEditorView.tsx` | Serbest dizilim editörü: taş yerleştirme, özel senaryo oluşturma |
| `BotSelectPage.tsx` | Bot zorluğu, avatar, süre ayarları |
| `LearnMenuPage.tsx` | 6 seviyenin kilit durumu, tamamlanma yüzdesi, kazanılan XP |
| `LessonDetailPage.tsx` | Ders teorisi, slaytlar, statik bulmaca kartları |
| `RulesPage.tsx` / `RoadmapPage.tsx` | 12 figürün kuralı, puanı, hareket şeması |

### 2.4 Tahta ve Oyun İçi Bileşenler

```
components/board/
  BoardGrid.tsx        10x11 ana ızgara + 2 hisar hücresi render motoru
  PieceView.tsx         Taş grafikleri (SVG/PNG), animasyon, sürükleme
  CitadelBadge.tsx       Hisar durum göstergesi (sığınma/kilit)
  PromotionModal.tsx     Piyade terfi seçimi

components/game/
  BoardContainer.tsx     Tahta ölçeklendirme, responsive wrapper
  PlayerCard.tsx         Oyuncu bilgisi, aktif sıra, saat sayacı
  CapturedPieces.tsx     Alınan taşlar, materyal farkı
  NotationHeader.tsx     Son hamlelerin cebirsel notasyonu
  ControlBar.tsx         Beraberlik/teslim/ses butonları
  BottomToolbar.tsx      Hızlı oyun içi eylem çubuğu
  GameOverModal.tsx      Mat/Pat/Süre/Terk sonuç penceresi
```

### 2.5 Hook Katmanı (Durum Yönetimi)

| Hook | Sorumluluk |
|---|---|
| `useGame.ts` | Oyunun ana kontrolörü. Hamle onayı, saat geri sayımı (White/Black), ses efektleri, şah/mat kontrolü, maç sonu mantığı |
| `useGameState.ts` | `BoardMatrix`, `CitadelState`, `MoveHistory` — reaktif tahta/sıra durumu |
| `useSetupEditor.ts` | Dizilim editöründe taş yerleştirme/temizleme, `setupValidator.ts` ile doğrulama, FEN/JSON dışa aktarma |

**Not:** v1'de bu hook'lar hem UI durumunu hem de oyun mantığını taşıyor. v2'de mantık kısmı Game Core'a taşınacak, hook'lar sadece React bridge'i olacak.

### 2.6 Core Katmanı (Mevcut — Kural Motoru)

- **Tahta:** 10×11 (110 kare) + 2 hisar = **112 kare**.
- **Taş sayısı:** 28×2 = 56 taş.
  - 17 figür türü: Şah, Vezir (General), Ferz, 2 Savaş Arabası (Rook), 2 At (Knight), 2 Fil (Alfil), 2 Deve (Camel), 2 Mancınık (Dabbaba), 2 Zürafa (Giraffe), 2 Tale'a (Picket).
  - 11 piyade türü: her figüre özel piyade (Piyade-i Şah, Piyade-i Vezir, vb.).
- **`moveRules.ts`:** Sıçrama (Fil: 2 çapraz, Mancınık: 2 düz, Deve: 3+1 L) ve kayma hareketlerini hesaplar.
- **Özel kurallar:**
  - Rok yok.
  - Geçerken alma (en-passant) yok.
  - Pat, pat bırakan taraf için **galibiyet** sayılır (klasik satrancın tersi).
- **`notation/`:** 112 karelik özel cebirsel notasyon üretimi.
- **`bot/`:** Şu an ayrı bir Engine değil, basit karar/hamle seçim mantığı.
- **`setup/`:** Serbest dizilim doğrulama ve serileştirme.

### 2.7 Öğrenme Sistemi

| Dosya | Sorumluluk |
|---|---|
| `learnContent.ts` | 6 seviye, 25 ders, 70 statik bulmaca, 4650 toplam XP. Her ders: teori + taş hareket kartı + çözümlü soru bankası |
| `learnProgress.ts` | Tamamlanan dersler, çözülen bulmacalar, kazanılan XP → `localStorage`; sonraki seviye kilitlerini açar |

### 2.8 Asset/Unity Katmanı

- 3D/2D tahta ve taş grafikleri, logolar (`Assets`).
- 3D prototip kaynakları (`Unıty Engine` klasörü) — üretim istemcisinden bağımsız, referans/prototipleme amaçlı.

### 2.9 Mevcut Veri Akışı (Oyun İçi Bir Hamle)

```
Oyuncu ──"Ekranda Oyna" seçer──▶ App.tsx
App.tsx ──screenPlayConfig──▶ ScreenPlayView
ScreenPlayView ──useGame(config)──▶ Hook Layer
Hook ──getValidMoves(piece, board)──▶ moveRules.ts
moveRules.ts ──geçerli koordinatlar──▶ Hook
Hook ──vurgu noktaları──▶ BoardGrid/PieceView
Oyuncu ──taşı taşır──▶ Board
Board ──makeMove(from,to)──▶ Hook
Hook ──kural kontrolü, şah/mat/pat──▶ moveRules.ts
  ├─ Oyun bitti  → GameOverModal
  └─ Devam ediyor → sıra değişir, saat aktarılır
```

### 2.10 v1'in Bilinen Kısıtları (v2'nin gerekçesi)

- Oyun mantığı (Rules) ve UI durumu (Hooks) net ayrılmamış → test edilebilirlik düşük.
- Bot, ayrı bir "Engine" olarak tasarlanmamış → arama/derinlik/zaman yönetimi yok.
- Analiz (post-game review) katmanı yok.
- Ağır hesaplama (arama ağacı) doğrudan ana thread'de çalışacak şekilde tasarlanmamış → React donma riski.
- 5 farklı bot zorluğu için ayrı algoritma yazma riski (tek Engine + profil yerine).

---

## 3. v2 — Hedef Mimari (Engine Odaklı)

### 3.1 Üst Seviye Şema

```
                         ┌──────────────────┐
                         │      REACT       │
                         │ Board/HUD, Bot UI│
                         │ Analysis UI      │
                         └────────┬─────────┘
                                  │  Game Controller
                         ┌────────▼─────────┐
                         │    GAME CORE     │
                         │ Position / Move  │
                         │ Rules / History  │
                         └────────┬─────────┘
                                  │  Engine Request
                         ┌────────▼─────────┐
                         │   WEB WORKER     │
                         │ Bot Search       │
                         │ Analysis         │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │      WASM        │
                         │ Search / Eval    │
                         │ Move Gen / TT    │
                         └────────┬─────────┘
                    ┌─────────────┴─────────────┐
                   BOT                       ANALYZER
              Difficulty Profile        Move/Game Analysis
                    └─────────────┬─────────────┘
                              Result / Report
                                  ▼
                                REACT
```

### 3.2 Tasarım İlkeleri (bağlayıcı)

1. React hiçbir hesaplama yapmaz; sadece "hesapla" mesajı gönderir ve sonucu render eder.
2. Game Core, Engine'den bağımsızdır. Aynı `Position` nesnesi; insan-insan, insan-bot, bot-bot, replay, analiz ve ders/bulmaca senaryolarında ortak kullanılır.
3. Bot ve Analyzer **aynı Engine**'i kullanır, ayrı motorlar değildir.
4. Ağır hesaplama (arama, evaluation, hash) Web Worker içinde çalışır; ana thread bloklanmaz.
5. WASM zorunlu başlangıç şartı değildir. Önce TypeScript referans Engine + benchmark, sonra WASM'a taşıma kararı ölçümle verilir.
6. Oyun sonu analizi, oyun bitiminden **sonra**, kullanıcı talebiyle çalışır (canlı oyun sırasında değil).
7. Aynı pozisyon için analiz sonuçları cache'lenir (Zobrist hash anahtarlı).

### 3.3 Game Core

#### 3.3.1 Position

```
Position
├── board            // 112 karelik durum
├── sideToMove
├── citadels         // hisar durumları
├── pieceState
└── gameFlags
```

Tanım: "Şu an tahtanın matematiksel durumu nedir?" sorusunun cevabı. React state'i değildir, Engine'in de UI'ın da ortak girdisidir.

#### 3.3.2 Move

```
Move
├── from
├── to
├── piece
├── capturedPiece
├── promotion
├── specialFlags
└── metadata
```

Gerekçe: Analiz aşamasında "oyuncu tam olarak ne yaptı?" sorusuna cevap verebilmek için hamle sadece `from → to` değil, birinci sınıf bir nesne olmalı.

#### 3.3.3 Rules API

```
generateLegalMoves(position)
isLegalMove(position, move)
makeMove(position, move)
undoMove(position, move)
isCheck(position, side)
isGameOver(position)
getGameResult(position)
```

Kritik kısıt: `makeMove()` mümkün olduğunca hızlı olmalı — Engine bunu arama sırasında milyonlarca kez çağırabilir. UI'nin yaptığı hamle ile Engine'in varsayımsal hamlesi arasında mantıksal fark olmamalı (tek doğruluk kaynağı: Rules).

### 3.4 Engine

```
TimurEngine
├── Search
│   ├── Iterative Deepening
│   ├── Alpha-Beta
│   ├── Quiescence Search
│   └── Pruning
├── Move Ordering
├── Evaluation
├── Transposition Table (Zobrist Hash)
└── Time Management
```

**Search akışı (kavramsal):**

```
Pozisyon → Olası hamleler → Rakip cevapları → Kendi cevapları → ... → Değerlendirme → En iyi sonucu seç
```

Botun "zekâsı" = Search + Evaluation kombinasyonu; ayrı bir "karar mekanizması" yoktur.

**Move Ordering:** Tüm legal hamleler eşit önceliğe alınmaz. Öncelik sırası: şah çekişleri → taş alışları → tehditler → güçlü taktikler. Performans için kritik.

**Iterative Deepening:** Doğrudan sabit derinlik hesaplanmaz; derinlik kademeli artırılır (depth 1, 2, 3, ...). Süre dolduğunda **son tamamlanan derinliğin** sonucu kullanılır. Örnek zaman bütçesi (1 saniyelik bot düşünme süresi):

| Süre | Ulaşılan derinlik |
|---|---|
| 0 ms | depth 1 |
| 30 ms | depth 3 |
| 100 ms | depth 5 |
| 250 ms | depth 7 |
| 500 ms | depth 8 |
| 900 ms | depth 9 |

Avantaj: Bot hiçbir zaman "süre bitti, cevap yok" durumuna düşmez.

**Evaluation bileşenleri:**

```
Evaluation =
    MaterialScore
  + MobilityScore
  + KingSafetyScore
  + CitadelScore        // Timur'a özgü
  + PieceActivityScore
  + PawnStructureScore
```

Timur'a özgü hisar (Citadel) faktörleri: hisar kontrolü, hisar güvenliği, şahın hisara erişimi, hisarın doluluk durumu, hisar üzerinden kazanma ihtimali. Klasik satranç evaluation'ı doğrudan kopyalanmaz.

**Transposition Table / Zobrist Hash:** Aynı pozisyona farklı hamle sıralarıyla ulaşılabildiğinde (A→B→C ile B→A→C aynı sonuca ulaşırsa) tekrar hesaplama önlenir. Anahtar: pozisyonun Zobrist hash değeri.

### 3.5 Bot Katmanı

İlke: **5 ayrı algoritma değil, tek Engine + 5 profil.**

| Profil | Search | Hata oranı | Hamle seçimi |
|---|---:|---:|---|
| I (çok kolay) | çok düşük | yüksek | geniş rastgelelik |
| II (kolay) | düşük | orta | küçük aday havuzu |
| III (orta) | orta | düşük | çoğunlukla en iyi |
| IV (zor) | yüksek | çok düşük | en iyiye yakın |
| V (çok zor) | çok yüksek | minimum | en iyi |

Her profilin parametre seti:

```
Profile
├── searchBudget
├── maxDepth
├── candidateLimit
├── evaluationNoise
├── mistakeRate
├── blunderRate
└── randomness
```

Zayıf bot tasarımı: tamamen rastgele hamle **kullanılmaz**. Bunun yerine Engine en iyi N hamleyi bulur, kolay bot bu hamleler arasından ağırlıklı olasılıkla seçim yapar (örn. 1. hamle %35, 2. hamle %25, 3. hamle %15, ...). Sonuç: bot bilerek kötü oynar ama satranç mantığı içinde kalır — eğitim amaçlı kullanım için gereklidir.

### 3.6 Analyzer Katmanı

Bot ile aynı Engine kullanılır, farklı çağrı:

```
Bot:       engine.findBestMove(position, limits)
Analyzer:  engine.analyze(position, limits)
```

Analyzer'ın ihtiyaç duyduğu ek bilgi: Best Move, Evaluation, Principal Variation, Depth, Nodes.

**Move Analysis pipeline (tek hamle için):**

```
Position N (oyuncunun hamlesinden önce)
  → Engine: BestMove = X, Evaluation = +1.4
Oyuncu Y oynadı
  → Position N+1: Evaluation = +0.2
  → Evaluation Loss = 1.2
```

**Hamle sınıflandırması:** Excellent / Good / Inaccuracy / Mistake / Blunder. Eşik değerleri klasik satranç değerlerinden (-0.50 / -1.00 gibi sabitler) kopyalanmaz; Timur Satrancı'nın kendi evaluation aralığına göre deneysel olarak belirlenir.

**Game Analysis (oyun sonu) pipeline:**

```
Move History
  → Position Reconstruction (Position 1..N)
  → Engine Analysis (her pozisyon için)
  → Move Analysis
  → Game Analyzer
  → Report
```

Örnek rapor çıktısı:

```
OYUN ANALİZİ
------------
Beyaz doğruluk   %87
Siyah doğruluk   %74
İyi hamle        21
Hata              4
Büyük hata        1
Kritik an: Hamle 27
```

**Performans notu:** 100 hamlelik bir oyunda her pozisyonu yüksek derinlikte analiz etmek pahalıdır. Bu nedenle:
- Analiz, canlı oyun sırasında değil, oyun bittikten sonra ve kullanıcı isteğiyle ("Analizi başlat") çalıştırılır.
- Sonuçlar `AnalysisResult { positionHash, depth, evaluation, bestMove, pv }` şeklinde cache'lenir; aynı pozisyon tekrar görüldüğünde (replay, tekrar analiz) cache'ten okunur.
- Kullanıcı analiz ekranından çıkarsa `cancelAnalysis()` ile Engine durdurulabilir.

**Açıklama (Explanation) — 3 aşamalı:**

```
Aşama 1 — Engine:      Hamle 31 → Hata
Aşama 2 — Rule Interpreter: Neden? Rakibin Deve'sinin çatal tehdidi oluştu.
Aşama 3 — Human Explanation: Bu hamlede savunmadaki taşını korumasız bıraktın.
                              Rakip sonraki hamlede Deve ile iki önemli taşı
                              aynı anda tehdit edebiliyor.
```

### 3.7 Worker + WASM Katmanı

**Neden Worker gerekli:** Bot düşünürken ana thread'de React/animasyon/input çalışmaya devam etmeli. Hesaplama ayrı thread'de (Worker) yapılmalı.

**Mesaj akışı:**

```
React → (think) → Worker → WASM → CPU
                                 │
React ← Worker ← WASM ← bestMove
```

**Neden WASM (opsiyonel, ölçümle karar):** JS/TS motoru; arama, integer/bitwise işlemler, hash ve evaluation gibi yoğun işlerde JS motor overhead'i taşır. WASM bu overhead'i azaltabilir. Ancak WASM "sihirli hızlandırıcı" değildir — doğru yerde kullanılmazsa kazanç sağlamaz.

**Dilden bağımsız Engine Interface (öneri):**

```
Engine Interface
        │
  ┌─────┴─────┐
  │           │
TS Engine   WASM Engine
(Development)  (Production)
```

Her iki implementasyon da aynı interface'i uygular; geliştirme sırasında TS Engine kullanılır, ölçüm sonrası kritik kısımlar WASM Engine'e taşınır.

**WASM'a taşınacak adaylar:**

```
Position representation
Move generation
make/unmake move
Search
Evaluation
Zobrist hashing
Transposition table
```

**React tarafında kalacaklar:**

```
UI
Game state presentation
Animation
Analysis display
```

**Benchmark yaklaşımı:** Önce TS Engine ile ölçüm (örn. 500k node/sn), sonra WASM Engine ile ölçüm (örn. 3.5M node/sn), fark ölçülerek WASM'a geçiş kararı verilir. "WASM kullandık, hızlıdır" varsayımı kabul edilmez.

**Paralellik notu:** SharedArrayBuffer + çoklu Worker ile paralel arama ileride değerlendirilebilir; MVP kapsamında **yapılmaz**. Sıra: Correctness → Benchmark → Optimization → Parallelism.

### 3.8 Performans İlkeleri (özet)

- UI hiçbir zaman motor hesaplaması yapmaz.
- Game Core mümkün olduğunca hafif kalır.
- Engine Worker içinde çalışır.
- Ağır Engine gerektiğinde WASM'a taşınır.
- Analiz asenkron çalışır.
- Sonuçlar cache'lenir.
- Oyun sırasında gereksiz analiz yapılmaz.

### 3.9 Oyun İçi Bot Çalışma Akışı (v2)

```
Player Move → Game Core → Position güncelle → React render
   → Bot Worker'a gönder → WASM Engine → Iterative Deepening
   → Best Move → Worker → React → Game Core → Bot Move
```

### 3.10 Analiz Akışı (v2)

```
Game finished → "Analyze" tıklanır → Worker → WASM Engine
   → Position 1..N sırayla analiz edilir → Analysis Results
   → React → Analysis UI
```

---

## 4. v1 → v2 Geçiş Fazları

| Faz | İçerik |
|---|---|
| Faz 1 — Core | `Position`, `Move`, `Rules`, `GameState`, `History` modüllerinin ayrıştırılması |
| Faz 2 — Test | Hareket testleri, legal move testleri, oyun sonu testleri, terfi testleri, hisar testleri |
| Faz 3 — Engine v0.1 | Move generation, material evaluation, minimax, alpha-beta |
| Faz 4 — Engine v0.2 | Move ordering, iterative deepening, quiescence, transposition table, Zobrist |
| Faz 5 — Bot | 1 Engine + 5 zorluk profili |
| Faz 6 — Worker | Web Worker entegrasyonu |
| Faz 7 — WASM | Önce benchmark, sonra ağır kısımların taşınması |
| Faz 8 — Analysis | Move evaluation, best move, evaluation loss, sınıflandırma |
| Faz 9 — Game Review | Doğruluk yüzdesi, hatalar, kritik anlar, en iyi hamleler, zayıf alanlar |
| Faz 10 — Explanation | Kural-farkında (rule-aware) açıklama, eğitsel açıklama üretimi |

---

## 5. Hedef Klasör Yapısı (Öneri)

```
Client/src/
├── core/                     // Game Core — UI'dan bağımsız
│   ├── position/
│   │   └── Position.ts
│   ├── move/
│   │   └── Move.ts
│   ├── rules/
│   │   ├── generateLegalMoves.ts
│   │   ├── makeMove.ts
│   │   ├── undoMove.ts
│   │   └── gameResult.ts
│   ├── notation/
│   └── setup/
│       └── setupValidator.ts
│
├── engine/                   // Engine — Position → Best Move
│   ├── search/
│   │   ├── alphaBeta.ts
│   │   ├── iterativeDeepening.ts
│   │   ├── quiescence.ts
│   │   └── moveOrdering.ts
│   ├── evaluation/
│   │   └── evaluate.ts
│   ├── tt/
│   │   ├── zobrist.ts
│   │   └── transpositionTable.ts
│   └── engineInterface.ts    // TS Engine ve WASM Engine ortak arayüzü
│
├── bot/
│   └── profiles.ts           // 5 zorluk profili parametreleri
│
├── analyzer/
│   ├── moveAnalyzer.ts
│   ├── gameAnalyzer.ts
│   └── report.ts
│
├── worker/
│   └── engineWorker.ts       // React ↔ Worker mesaj protokolü
│
├── wasm/                     // (Faz 7 sonrası)
│   └── engine.wasm
│
├── hooks/                    // Game Controller — React bridge, hesaplama yok
│   ├── useGame.ts
│   ├── useGameState.ts
│   └── useSetupEditor.ts
│
├── components/                // Değişmez (bkz. Bölüm 2.3 / 2.4)
├── views/                      // Değişmez
└── learn/                      // Değişmez
```

---

## 6. Terim Sözlüğü

| Türkçe | İngilizce / Teknik karşılık |
|---|---|
| Hisar | Citadel |
| Piyade | Pawn |
| Vezir | General |
| Savaş Arabası | Rook |
| At | Knight |
| Fil | Alfil (2 çapraz sıçrama) |
| Deve | Camel (3+1 L sıçrama) |
| Mancınık | Dabbaba (2 düz sıçrama) |
| Zürafa | Giraffe |
| Tale'a | Picket |
| Dizilim Editörü | Setup Editor |
| Serbest Dizilim | Free Setup |
| Hamle Kaybı | Evaluation Loss |
| Doğruluk (%) | Accuracy |
| Kritik An | Critical Moment |

---

## 7. Teknik Spesifikasyonlar (v1 — Uygulamaya Hazır)

Bu bölüm, önceki sürümde "açık karar" olarak işaretlenen altı kalemin somut tanımını içerir. Buradaki tipler ve sayısal değerler **başlangıç sürümüdür (v1 spec)**; Faz 2/3/4 testleri ve self-play sonuçlarına göre revize edilmesi beklenir. Revizyon gereken yerler ayrıca not edilmiştir.

### 7.1 `Position` ve `Move` — Tam TypeScript Tanımı

```typescript
// ==================== TEMEL TİPLER ====================

type Side = 'white' | 'black';

/**
 * Kare indeksi: 0..109 → 10x11 ana ızgara (row-major, row=0..9, col=0..10 → index = row*11+col)
 * 110 → üst-sol hisar (topLeft citadel)
 * 111 → alt-sağ hisar (bottomRight citadel)
 */
type SquareIndex = number;

enum PieceKind {
  King = 'king',
  General = 'general',   // Vezir
  Ferz = 'ferz',
  Rook = 'rook',          // Savaş Arabası
  Knight = 'knight',      // At
  Alfil = 'alfil',        // Fil
  Camel = 'camel',        // Deve
  Dabbaba = 'dabbaba',    // Mancınık
  Giraffe = 'giraffe',    // Zürafa
  Picket = 'picket',      // Tale'a
  Pawn = 'pawn',          // alt tür `pawnOf` alanında belirlenir
}

interface Piece {
  id: string;               // oyun boyunca sabit benzersiz kimlik (örn. "w_rook_1")
  kind: PieceKind;
  side: Side;
  pawnOf?: PieceKind;        // sadece kind === Pawn ise dolu: hangi figürün piyadesi
  hasMoved: boolean;         // terfi / hisar giriş kuralları için
}

type BoardArray = ReadonlyArray<Piece | null>; // length = 112

interface CitadelSlotState {
  occupant: Piece | null;
  sealed: boolean;           // kilitli mi (bkz. RulesPage kural tanımı)
}

interface CitadelState {
  topLeft: CitadelSlotState;
  bottomRight: CitadelSlotState;
}

interface GameFlags {
  halfMoveClock: number;     // ilerlemesiz hamle sayacı (50-hamle benzeri kurallar için)
  fullMoveNumber: number;
  repetitionCount: Record<string, number>; // zobristHash → tekrar sayısı
}

type GameResult =
  | { type: 'checkmate'; winner: Side }
  | { type: 'stalemate_win'; winner: Side }   // pat = galibiyet (Timur'a özgü kural)
  | { type: 'resignation'; winner: Side }
  | { type: 'timeout'; winner: Side }
  | { type: 'draw'; reason: 'agreement' | 'repetition' | 'fifty_move' };

interface Position {
  board: BoardArray;
  sideToMove: Side;
  citadels: CitadelState;
  flags: GameFlags;
  zobristHash: bigint;        // Transposition Table anahtarı
}

// ==================== HAMLE ====================

enum MoveSpecialFlag {
  Promotion = 'promotion',
  CitadelEntry = 'citadel_entry',
  CitadelSeal = 'citadel_seal',
}

interface Move {
  from: SquareIndex;
  to: SquareIndex;
  piece: Piece;                    // hamleyi yapan taşın hamle-öncesi durumu
  capturedPiece: Piece | null;
  promotion?: PieceKind;           // specialFlags içinde Promotion varsa dolu
  specialFlags: MoveSpecialFlag[]; // boş dizi = sıradan hamle
  metadata: {
    isCheck: boolean;
    isCapture: boolean;
    algebraic: string;             // notation modülünün ürettiği string (örn. "Rf3-f7+")
  };
}
```

**Not:** `PieceKind` enum'u, mevcut `moveRules.ts` içindeki 17 figür/11 piyade tanımına birebir eşlenmelidir (Faz 1'de doğrulanacak). `Piece.id` alanı, analiz modülünde "aynı fiziksel taş" takibi için gereklidir (örn. terfi sonrası tür değişse bile takip edilebilmesi).

### 7.2 Rules API — İki Katmanlı Sözleşme

Performans gerekçesiyle iki ayrı API sunulur: UI/geçmiş için **immutable**, Engine araması için **mutable (in-place)**.

```typescript
// ---- UI / Game Core / History (immutable) ----
function generateLegalMoves(position: Position): Move[];
function isLegalMove(position: Position, move: Move): boolean;
function makeMove(position: Position, move: Move): Position;      // yeni Position döner
function isCheck(position: Position, side: Side): boolean;
function isGameOver(position: Position): boolean;
function getGameResult(position: Position): GameResult | null;

// ---- Engine Search (mutable, allocation yok) ----
function makeMoveInPlace(position: Position, move: Move): void;   // position'ı doğrudan değiştirir
function undoMoveInPlace(position: Position, move: Move): void;   // son makeMoveInPlace'i geri alır
```

Kural: Engine'in iç arama döngüsü yalnızca `*InPlace` fonksiyonlarını kullanır. UI, geçmiş kaydı ve replay yalnızca immutable `makeMove`'u kullanır. İki fonksiyon seti aynı alt kural mantığını (`generateLegalMoves` içindeki hareket üretim kurallarını) paylaşır — kod tekrarı yasak.

### 7.3 Engine API — Tam İmza ve Dönüş Tipleri

```typescript
interface SearchLimits {
  depth?: number;        // sabit derinlik (test/analiz için)
  movetimeMs?: number;   // zaman bütçesi (bot oyunu için asıl kullanılan)
  nodes?: number;        // node sınırı (opsiyonel, benchmark için)
  infinite?: boolean;    // yalnızca "cancel" ile durur (debug amaçlı)
}

interface PVLine {
  moves: Move[];
  evaluationCp: number;  // centipawn, sideToMove lehine pozitif
}

interface BestMoveResult {
  bestMove: Move;
  evaluationCp: number;
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
  principalVariation: Move[];
}

interface AnalysisResult {
  position: Position;
  bestMove: Move;
  evaluationCp: number;
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
  principalVariation: Move[];
  alternativeLines?: PVLine[];   // opsiyonel top-N aday hat (Faz 8+)
}

interface EngineInterface {
  findBestMove(
    position: Position,
    limits: SearchLimits,
    profile?: BotProfile,        // verilmezse "en iyi hamle" (Profile V davranışı)
  ): Promise<BestMoveResult>;

  analyze(
    position: Position,
    limits: SearchLimits,
  ): Promise<AnalysisResult>;

  cancel(requestId: string): void;
}
```

`TS Engine` ve `WASM Engine`, bu `EngineInterface`'i birebir implement eder (bkz. Bölüm 3.7).

### 7.4 React ↔ Worker Mesaj Protokolü

**Kimlik yönetimi:** Her istek `requestId: string` taşır (`crypto.randomUUID()`). Ana thread, `Map<requestId, {resolve, reject}>` ile bekleyen istekleri izler; yanıt geldiğinde ilgili `resolve`/`reject` çağrılır ve map'ten silinir.

```typescript
// ---- Ana Thread → Worker ----
type WorkerRequest =
  | { type: 'init'; requestId: string }
  | {
      type: 'find_best_move';
      requestId: string;
      position: SerializedPosition;
      limits: SearchLimits;
      profileId: BotProfileId;
    }
  | { type: 'analyze'; requestId: string; position: SerializedPosition; limits: SearchLimits }
  | { type: 'cancel'; requestId: string };  // hedef isteğin requestId'si

// ---- Worker → Ana Thread ----
type WorkerResponse =
  | { type: 'ready'; requestId: string }
  | { type: 'best_move_result'; requestId: string; result: BestMoveResult }
  | { type: 'analysis_progress'; requestId: string; partial: { depthReached: number; evaluationCp: number } }
  | { type: 'analysis_result'; requestId: string; result: AnalysisResult }
  | { type: 'cancelled'; requestId: string }
  | { type: 'error'; requestId: string; message: string };
```

`SerializedPosition`: `Position`'ın `structuredClone` ile taşınabilir hâli (`bigint` hash'in `string`'e çevrilmiş biçimi — `postMessage` üzerinden `bigint` doğrudan taşınabilir olsa da, ileride WASM ile uyum için `string` öneriliyor).

**İptal mekanizması (kademeli):**

- **MVP (Faz 6):** Worker, iterative deepening döngüsünde her derinlik tamamlandığında bir "iptal edildi mi" bayrağını kontrol eder (`postMessage` ile gelen `cancel` mesajı bir `Set<requestId>` içine yazılır). Derinlik-arası kontrol yeterlidir; tek derinlik içi kesinti gerekmez.
- **İleri seviye (Faz 7 / WASM sonrası):** `SharedArrayBuffer` + `Atomics.load` ile arama iç döngüsünde (örn. her 2048 node'da bir) ince taneli iptal kontrolü eklenir.

**Zaman aşımı garantisi:** `movetimeMs` dolduğunda worker kendiliğinden mevcut en iyi sonucu döndürür (bkz. Bölüm 3.4 Iterative Deepening) — `cancel` mesajı beklemeye gerek yoktur, bu ayrı bir mekanizmadır (kullanıcı erken çıkışı için).

### 7.5 Bot Profilleri — Kesin Parametre Tablosu (v1)

| Profil | Ad | movetimeMs | maxDepth | candidateLimit | evaluationNoise (cp, ±) | mistakeRate | blunderRate | Ağırlıklı seçim dağılımı (aday sırasına göre %) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| I | Çok Kolay | 200 | 3 | 8 | 150 | 35% | 12% | 35, 25, 15, 10, 6, 4, 3, 2 |
| II | Kolay | 500 | 5 | 6 | 80 | 20% | 5% | 50, 25, 12, 7, 4, 2 |
| III | Orta | 1000 | 7 | 4 | 30 | 8% | 1% | 70, 18, 8, 4 |
| IV | Zor | 2000 | 10 | 3 | 10 | 2% | 0.2% | 88, 9, 3 |
| V | Uzman | 4000 | ∞ (movetime sınırlı) | 1 | 0 | 0% | 0% | 100 |

Tanımlar:
- **candidateLimit:** Engine'in değerlendirdiği ve evaluation'a göre sıraladığı en iyi N hamleden kaçının aday havuzuna alınacağı.
- **evaluationNoise:** Aday hamlelerin evaluation değerine eklenen ± rastgele gürültü (cp). Zayıf botun "hangi hamlenin gerçekten iyi olduğunu tam bilmiyormuş gibi" görünmesini sağlar.
- **mistakeRate / blunderRate:** Bot'un, ağırlıklı seçim yerine bilinçli olarak candidateLimit dışından (mistake) veya rastgele legal bir hamleden (blunder) seçim yapma olasılığı — eğitim amaçlı "insan gibi hata yapma" simülasyonu.
- **Ağırlıklı seçim dağılımı:** Engine'in bulduğu en iyi N hamle, evaluation sırasına göre dizilir; bot bu olasılık dağılımına göre birini seçer.

**Kalibrasyon notu:** Bu tablo başlangıç değeridir. Faz 5 sonunda gerçek self-play/kullanıcı testiyle (özellikle Profil I-II'nin "gerçekten kolay ama saçma değil" hissi verip vermediği) yeniden ayarlanmalıdır.

### 7.6 Evaluation Ağırlıkları — v1 Katsayıları

Evaluation, pawn-eşdeğeri birim üzerinden centipawn (1 piyade = 100cp) ölçeğinde hesaplanır.

```typescript
const EVALUATION_WEIGHTS = {
  material: 1.0,          // baskın bileşen, aşağıdaki PIECE_VALUES ile çarpılır
  mobility: 0.10,
  kingSafety: 0.30,
  citadelControl: 0.40,   // Timur'a özgü, yüksek ağırlık
  pieceActivity: 0.15,
  pawnStructure: 0.10,
} as const;
```

**Taş değerleri (v1 — ilk tahmin, self-play ile kalibre edilecek):**

| Taş | Değer (cp) | Not |
|---|---:|---|
| Şah (King) | — | materyale dahil edilmez (oyun sonu koşulu) |
| Vezir (General) | 950 | en güçlü figür varsayımı |
| Ferz | 300 | kısa menzilli, klasik satranç vezirinden zayıf |
| Savaş Arabası (Rook) | 500 | klasik kale değeriyle aynı varsayım |
| At (Knight) | 300 | klasik at değeriyle aynı varsayım |
| Fil (Alfil) | 200 | sınırlı sıçrama menzili nedeniyle düşük |
| Deve (Camel) | 250 | Alfil'den geniş menzil |
| Mancınık (Dabbaba) | 200 | Alfil'e benzer sınırlı hareket |
| Zürafa (Giraffe) | 350 | geniş sıçrama menzili varsayımı |
| Tale'a (Picket) | 150 | en zayıf figür varsayımı |
| Piyadeler (11 tür) | 100 | tümü için tek tip başlangıç değeri |

**Citadel (Hisar) alt bileşenleri (v1):**

```typescript
const CITADEL_WEIGHTS = {
  controlBonus: 60,        // hisarı kontrol eden taraf için sabit bonus
  kingAccessBonus: 40,     // şahın hisara güvenli erişimi varsa bonus
  sealedPenalty: -80,      // kendi hisarın kilitliyse ceza
  sealedOpponentBonus: 80, // rakip hisarı kilitliyse bonus
} as const;
```

**Kalibrasyon notu:** Yukarıdaki tüm sayısal değerler, gerçek `moveRules.ts` hareket menzilleri incelenmeden atanmış **başlangıç varsayımlarıdır**. Faz 3 (Engine v0.1) tamamlandığında, engine'in iki farklı katsayı setiyle kendi kendine oynatılması (self-play) yoluyla göreli güç sıralaması doğrulanmalı ve değerler buna göre revize edilmelidir.

### 7.7 Hamle Sınıflandırma Eşikleri (v1)

Sınıflandırma, `Evaluation Loss = |Evaluation(hamle öncesi en iyi) − Evaluation(oynanan hamle sonrası)|` değerine (cp) göre yapılır.

| Sınıf | Evaluation Loss aralığı (cp) |
|---|---|
| Excellent | 0 – 20 |
| Good | 21 – 60 |
| Inaccuracy | 61 – 150 |
| Mistake | 151 – 300 |
| Blunder | 300+ |

**Kalibrasyon notu:** Bu eşikler klasik satranç motorlarının (örn. lichess) yaklaşık aralıklarından esinlenilmiştir ve Timur Satrancı'na özgü değildir. Faz 9'da, gerçek oyunlardan toplanan evaluation-loss dağılımının yüzdelik dilimlerine (percentile) göre yeniden kalibre edilmesi planlanmalıdır (örn. "en kötü %5 hamle = Blunder" gibi dağılım-temelli bir tanım, sabit cp eşiklerinden daha sağlıklı olabilir).

---

## 8. Kalan Açık Kararlar

Bölüm 7'deki spesifikasyonlar uygulamaya başlamak için yeterlidir. Aşağıdakiler, ancak kod ve self-play verisiyle netleşebilecek kalemlerdir:

1. `PieceKind` enum'unun gerçek `moveRules.ts` ile birebir doğrulanması (Faz 1).
2. Taş değerleri ve evaluation katsayılarının self-play ile kalibrasyonu (Faz 3 sonrası).
3. Bot profil parametrelerinin kullanıcı testiyle ince ayarı (Faz 5 sonrası).
4. Hamle sınıflandırma eşiklerinin dağılım-temelli kalibrasyonu (Faz 9).
5. WASM'a geçiş kararı için TS Engine ile benchmark sonucu (Faz 7 öncesi zorunlu ön koşul).
6. Zobrist hash tablosu boyutu ve TT replacement policy (always-replace / depth-preferred) seçimi (Faz 4).
