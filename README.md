<div align="center">
  <img src="Client/src/assets/logo.png" alt="Timur Satrancı logosu" width="120" />
  <h1>Timur Satrancı</h1>
  <p><strong>112 karelik kadim strateji oyununun modern web uygulaması</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white" alt="Vite 5" />
    <img src="https://img.shields.io/badge/TypeScript-5.2-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.2" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3.4" />
  </p>
</div>

---

## 📖 Proje Hakkında

**Timur Satrancı**, Timur dönemine dayanan tarihi bir satranç varyantıdır: **10×11'lik ana gövde + 2 hisar cebi = 112 kare**, **17 figür + 11 piyade = 28 taşlık** ordular, rok ve geçerken almanın olmadığı, patın galibiyet sayıldığı kendine özgü kurallar bütünü.

Bu repo, oyunun oynanabilir web istemcisini (React + Vite + TypeScript + Tailwind CSS), 6 seviyelik interaktif öğrenme modülünü ve Unity prototipine ait kaynakları içerir.

## ✨ Özellikler

### ♟️ Oyun
- **Bota Karşı** — yapay zekâya karşı tek kişilik oyun
- **Ekranda Oyna** — aynı cihazda iki kişilik yerel oyun
- **Arkadaşla Oyna** — 6 haneli oda koduyla gerçek zamanlı çevrim içi maç (Supabase Realtime, kayıtsız anonim kimlik)
- **Turnuva** — turnuva katılım ekranı
- **Dizilim Editörü** — başlangıç taş dizimini özelleştirme
- Canlı maç HUD'ı (hamle geçmişi, alınan taşlar, ses kontrolü), terfi ve hisar rozetleri

### 🎓 Öğrenme Modülü
Seviyelendirme rehberine sadık, localStorage ile ilerleme takibi yapan interaktif eğitim:

| Seviye | İçerik |
|--------|--------|
| 1–6 | Toplam **25 ders**, **70 statik bulmaca**, **4650 XP** |

- Taş rehberi (12 figür: hareket, değer, terfi), kural kartları, yol haritası
- Ders detayı: konu anlatımı + bulmaca kartları + XP rozetleri

### 🎨 Tasarım
- Koyu yeşil + krem renk dili, ana menüde su yeşili neon vurgu
- Phosphor ikon seti, mobile-first responsive arayüz (360px → 1280px+)
- Tasarım kararlarının tamamı: [`docs/tasarim-plani.md`](docs/tasarim-plani.md)

## 🚀 Kurulum

Gereksinim: **Node.js 18+**

```bash
cd Client
npm install
npm run dev      # geliştirme sunucusu (http://localhost:3000)
```

### 🌐 Çevrim içi oyun kurulumu (Arkadaşla Oyna)

Oda kodlu online maç Supabase Realtime kullanır. Bu adım atlanırsa uygulamanın geri kalanı çalışır, yalnızca online maç açılmaz.

1. [supabase.com](https://supabase.com) adresinde proje oluşturun (region: Frankfurt önerilir).
2. **SQL Editor**'de [`Client/supabase/schema.sql`](Client/supabase/schema.sql) dosyasının tamamını çalıştırın (tablolar + Realtime yayını + RLS politikaları).
3. **Settings → API** kısmından `Project URL` ve `anon/public key` değerlerini alıp `Client/.env` dosyası oluşturun:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> `.env` dosyası gizlidir ve commit edilmez (bkz. `.env.example`).

Üretim derlemesi:

```bash
npm run build    # önce tsc tip denetimi, sonra vite build → dist/
npm run preview  # derleme çıktısını önizleme
```

## 🗂️ Proje Yapısı

```
Timur-Satranc-/
├── Client/                  # Web istemcisi (asıl ürün)
│   ├── src/
│   │   ├── assets/          # Logo, taş görselleri, tahta dokuları
│   │   ├── components/      # Ekranlar (MainMenu, PlayMenu, BotSelect, Learn…)
│   │   │   └── game/ board/ learn/  # Oyun HUD, tahta ızgarası, öğrenme bileşenleri
│   │   ├── core/            # Oyun motoru
│   │   │   └── online/      # Oda + hamle servisleri (roomService, moveService)
│   │   ├── hooks/           # useGame, useOnlineGame (Realtime senkronizasyon)
│   │   ├── lib/             # supabaseClient, auth (anonim kimlik), yardımcılar
│   │   ├── utils/ workers/  # Yardımcılar ve motor worker'ları
│   │   ├── learn/           # Öğrenme içeriği (learnContent) + ilerleme (learnProgress)
│   │   ├── types/           # Paylaşılan TypeScript tipleri
│   │   └── views/           # ScreenPlayView, OnlinePlayView, SetupEditorView
│   ├── supabase/
│   │   └── schema.sql       # Online maç veritabanı şeması (tek seferlik kurulum)
│   ├── .env.example         # Supabase ortam değişkeni şablonu (.env commit edilmez)
│   ├── index.html
│   └── package.json
├── Assets/                  # Paylaşılan oyun asset'leri
├── Unıty Engine/            # Unity prototipi
└── docs/
    └── tasarim-plani.md     # Tema ve tasarım kararları
```

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| UI | React 18, Tailwind CSS 3.4, Phosphor Icons |
| Derleme | Vite 5, TypeScript 5.2 |
| Çevrim içi | Supabase (Postgres + Realtime postgres_changes) |
| Durum | React hooks + localStorage (öğrenme ilerlemesi, anonim oyuncu kimliği) |
| Büyük asset'ler | Git LFS (`*.png`, `*.jpg`, Unity dosyaları) |

## 🗺️ Yol Haritası

- Hisar ve özel kural setlerinin (şah takası, hisar kilitleme, yalın şah zaferi) oyun motoruna entegrasyonu
- ✅ Oda kodlu online arkadaş maçı (MVP: süre yok, sayfa yenilemede devam yok)
- Online v2: süre kontrolü, yeniden bağlanma, rövanş, ELO
- Ek ders ve bulmaca içerikleri

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
