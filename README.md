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
- **Arkadaşla Oyna** — arkadaş davetli oyun akışı
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
npm run dev      # geliştirme sunucusu (http://localhost:5173)
```

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
│   │   ├── core/ hooks/ lib/ utils/ workers/  # Oyun motoru ve yardımcılar
│   │   ├── learn/           # Öğrenme içeriği (learnContent) + ilerleme (learnProgress)
│   │   ├── types/           # Paylaşılan TypeScript tipleri
│   │   └── views/           # ScreenPlayView, SetupEditorView
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
| Durum | React hooks + localStorage (öğrenme ilerlemesi) |
| Büyük asset'ler | Git LFS (`*.png`, `*.jpg`, Unity dosyaları) |

## 🗺️ Yol Haritası

- Hisar ve özel kural setlerinin (şah takası, hisar kilitleme, yalın şah zaferi) oyun motoruna entegrasyonu
- Çevrim içi (online) oyun
- Ek ders ve bulmaca içerikleri

## 📄 Lisans

Henüz bir lisans dosyası eklenmedi.
