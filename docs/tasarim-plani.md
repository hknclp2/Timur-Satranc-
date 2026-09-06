# 🌲 Timur Satrancı — Koyu Yeşil & Krem Tema Dönüşüm Planı

Bu belge, proje kaptanının talebi doğrultusunda hazırlanan **Koyu Yeşil Arka Plan + Krem Butonlar + Anasayfada Su Yeşili Neon Butonlar** mimari ve görsel tasarım planıdır.

---

## 🎯 1. Tasarım Vizyonu ve Temel Kurallar

1. **Arka Plan:** Klasik Timur Satrancı koyu orman yeşiline geri dönecektir (`#0a1710`, `#1a4228`, `#122b1e`).
2. **Anasayfa Ana Butonları:** Girişte ("Oyna" ve "Öğren") butonları **parlak su yeşili neon** (`#00d4c4` / `#00e5ff`) ve göz alıcı ışıma gölgesiyle (`box-shadow: 0 6px 22px rgba(0, 212, 196, 0.45)`) karşılayacaktır.
3. **Kalan Tüm Butonlar ve Menü Kartları:** Sıcak **krem rengi** (`#f5eedc`) ve türevleri (`#e8deca`, `#dfd4be`, `#eae2cf`) olacaktır. Üzerindeki metinler koyu antrasit/zümrüt siyahı (`#141f1b`) olarak yazılacak ve **14:1 gibi mükemmel bir kontrastla** sıfır okunabilirlik sorunu yaşatacaktır.
4. **İkon Standartı:** İstisnasız tüm sistemde yalnızca **`@phosphor-icons/react`** kullanılacaktır.
5. **Modallar ve "Hakan'ın Otağında":** Karartmalı backdrop (`bg-black/60`) üzerinde bağımsız açılan şık krem popup kartları olacak, sayfa bileşenleriyle asla karışmayacaktır.
6. **Responsive Mimari:** Tam ekran web layout ve mobile-first responsive yapı korunacaktır.

---

## 🎨 2. Renk Paleti ve Tasarım Belirteçleri

### CSS Değişkenleri (`src/index.css`)
```css
:root {
  /* Arka Planlar (Koyu Yeşil Ailesi) */
  --color-bg-dark:        #0a1710; /* En dış / masaüstü zemin */
  --color-bg-main:        #1a4228; /* Anasayfa ve oyun ana ekranı */
  --color-bg-learn:       #122b1e; /* Öğren, yol haritası ve modallar */
  --color-bg-card-dark:   #132b1d; /* Koyu paneller / HUD */

  /* Butonlar & Kartlar (Krem Ailesi) */
  --color-card-bg:        #f5eedc; /* Ana krem buton ve kart zemini */
  --color-card-alt:       #e8deca; /* İkincil / seçici buton zemini */
  --color-card-hover:     #dfd4be; /* Krem hover durumu */
  --color-card-border:    #e5dcce; /* Krem kart kenarlığı */
  --color-card-border-st: #cfc4ad; /* Güçlü krem kenarlık */

  /* Anasayfa Neon Aksanı (Su Yeşili) */
  --color-neon-cyan:      #00d4c4; /* Su yeşili ana buton */
  --color-neon-hover:     #00c4b4; /* Su yeşili hover */
  --color-neon-glow:      rgba(0, 212, 196, 0.45); /* Neon ışıması */
  --color-neon-text:      #0d2818; /* Neon buton üstü koyu metin */

  /* Tipografi & Kontrast Metinleri */
  --color-text-on-dark:   #FFFFFF; /* Koyu zemin üstü beyaz başlık */
  --color-text-muted-dark:#A7BDB1; /* Koyu zemin üstü ikincil metin */
  --color-text-on-cream:  #141f1b; /* Krem kart üstü koyu siyah metin */
  --color-text-sub-cream: #5c6c66; /* Krem kart üstü ikincil açıklama */

  /* Durum Renkleri */
  --color-gold:           #f59e0b; /* Altın rozetler / XP / taç */
  --color-danger:         #ef4444; /* Canlı / Terk et / Kırmızı */
  --color-success:        #22c55e; /* Tamamlandı / Başarı */
}
```

### Tailwind Konfigürasyonu (`tailwind.config.js`)
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-dark':       '#0a1710',
        'bg-main':       '#1a4228',
        'bg-learn':      '#122b1e',
        'card-bg':       '#f5eedc',
        'card-alt':      '#e8deca',
        'card-hover':    '#dfd4be',
        'card-border':   '#e5dcce',
        'neon-cyan':     '#00d4c4',
        'neon-hover':    '#00c4b4',
        'text-cream':    '#141f1b',
        'text-cream-sub':'#5c6c66',
        'gold':          '#f59e0b',
        'danger':        '#ef4444',
      },
    },
  },
  plugins: [],
}
```

---

## 🔘 3. Buton ve Kart Sınıfları Hiyerarşisi

### A. Anasayfa Neon Aksiyon Butonları (`.mobile-main-btn-neon`)
- **Kullanım Yeri:** Yalnızca `MainMenuPage.tsx` ("Oyna" ve "Öğren" butonları).
- **Görünüm:** Canlı su yeşili (`#00d4c4`), yuvarlatılmış köşeler (`rounded-2xl`), derin koyu yeşil Batangas yazı (`#0d2818`).
- **Efekt:** `box-shadow: 0 6px 22px rgba(0, 212, 196, 0.45); hover: 0 8px 28px rgba(0, 196, 180, 0.55); active: scale(0.97);`

### B. Menü Kart Butonları (`.mobile-card-btn`)
- **Kullanım Yeri:** `PlayMenuPage.tsx`, `LearnMenuPage.tsx` ve modüller.
- **Görünüm:** Sıcak krem arka plan (`#f5eedc`), ince vizon sınır (`border border-[#e5dcce]`), koyu metin (`#141f1b`), sağda Phosphor ikonu.
- **Efekt:** `box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28); hover: translateY(-1px);`

### C. Küçük Kare İkon Butonları (`.mobile-icon-btn`)
- **Kullanım Yeri:** Anasayfa profil, mağaza, ayarlar ve geri butonları.
- **Görünüm:** 54x54px krem kare (`#f5eedc`), yuvarlak köşeler (`rounded-2xl`), koyu ikon (`#141f1b`).
- **Efekt:** `box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); active: scale(0.92);`

### D. İkincil & Seçim Butonları (`.mobile-btn-cream`)
- **Kullanım Yeri:** Bot seçimi zaman hapları, modallar içi butonlar, oyun içi kontroller.
- **Görünüm:** Açık bej/krem (`#e8deca` / `#f5eedc`), koyu yazı (`#141f1b`), vizon kenarlık (`#cfc4ad`).

---

## 📂 4. Sayfa ve Bileşen Bazında Uygulama Detayları

---

### 1. `src/App.tsx`
- Kapsayıcı arka planı: Saf beyazdan derin koyu orman yeşiline (`bg-[#0a1710]`) dönecek.
- İç akışkan alan: `bg-[#1a4228] text-white`.
- Tüm alt sayfalar koyu zemin üzerinde beyaz tipografiyle uyum içinde açılacak.

---

### 2. `src/components/MainMenuPage.tsx`
- **Arka Plan:** Zengin koyu orman yeşili (`bg-[#1a4228]`), merkezde tahta arkasında hafif atmosferik ışık vurgusu.
- **Üst İkon Butonları (Mağaza, Profil, Ayarlar):** Krem zeminli kare ikon butonları (`bg-[#f5eedc] text-[#141f1b] shadow-md`).
- **Okul Logosu Çerçevesi:** Beyaz/krem şık çember (`border-2 border-white/20 bg-black/20`).
- **Başlık:** "Timur Satrancı" saf beyaz (`text-white font-batangas drop-shadow-md`).
- **Ana Butonlar (Oyna & Öğren):** **İstenen su yeşili neon butonlar** (`bg-[#00d4c4] hover:bg-[#00c4b4] text-[#0d2818] shadow-[0_6px_22px_rgba(0,212,196,0.45)] font-batangas text-2xl font-bold`).

---

### 3. `src/components/PlayMenuPage.tsx`
- **Arka Plan:** Koyu orman yeşili (`bg-[#1a4228]`).
- **Geri Butonu & Başlık:** Beyaz geri oku ve beyaz "Oyna" başlığı (`text-white font-batangas text-[2.4rem]`).
- **Üst Hızlı Oyna Kutusu:** Krem zemin (`bg-[#f5eedc] rounded-2xl border border-[#e5dcce] shadow-xl`).
  - Zaman seçici düğmesi: Açık bej (`bg-[#e8deca] hover:bg-[#dfd4be] text-[#141f1b] border border-[#d8ccb6]`).
  - "Oyunu Başlat" butonu: Su yeşili neon veya altın krem (`bg-[#00d4c4] text-[#0d2818] shadow-md`).
- **Menü Kartları Listesi:**
  - Turnuvalar, Arkadaşınla oyna, Bot'a karşı oyna, Koç ile oyna, Özel oyun, Ekranda oyna:
  - Tümü sıcak krem kart (`bg-[#f5eedc] border border-[#e5dcce] text-[#141f1b] shadow-lg`).
  - İkonlar: 48px Phosphor duotone koyu ikonlar (`text-[#141f1b]`).
  - Rozetler ("Canlı", "Eğitim"): Su yeşili veya amber tonlarında krem üstü rozet (`bg-[#00d4c4]/25 text-[#0c4e48] font-bold border border-[#00d4c4]/40`).

---

### 4. `src/components/BotSelectPage.tsx`
- **Arka Plan:** Koyu orman yeşili (`bg-[#1a4228]`).
- **Bot Kartları (Kolay, Orta, Zor):**
  - Kart Başlığı: Sıcak krem (`bg-[#f5eedc] text-[#141f1b] font-batangas text-xl font-bold rounded-2xl shadow-xl`).
  - Açılır Çekmece (Drawer): Koyu krem/kum tonu (`bg-[#c8bfae] text-[#141f1b] border-t border-[#141f1b]/10`).
  - Zaman Seçenekleri Butonu: Krem / derin zümrüt buton (`bg-[#387e5c] hover:bg-[#2e684c] text-white font-bold px-4 py-1 rounded-lg shadow-sm`).
  - Zorluk Taçları (CrownSelector): Koyu zeminli veya krem zeminli butonlar içinde parlayan altın taçlar (`text-amber-400`). Seçili buton `ring-2 ring-amber-400 scale-105 shadow-md`.
  - "Oyunu Başlat" Butonu: Koyu zümrüt / altın krem ana buton (`bg-[#1a442e] hover:bg-[#123020] text-white font-batangas font-bold py-3.5 rounded-xl shadow-lg`).

---

### 5. `src/components/ComingSoonPanel.tsx` ("Hakan'ın Otağında")
- **Modal Yapısı (Karışma Önleyici):**
  - Tam ekran karartma: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in`.
  - Ortalanmış Kart: Sıcak krem lüks otağ kartı (`bg-[#f5eedc] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl text-[#141f1b] animate-zoom-in`).
  - Üst İkon: Zümrüt/altın rozet içinde Phosphor `CastleTurret` ikonu.
  - Başlık: "Hakan'ın Otağında Hazırlanıyor" (`font-batangas text-2xl font-bold text-[#141f1b]`).
  - Açıklama: "Çok yakında burada olacak." (`text-[#5c6c66] text-sm font-medium`).
  - Buton: "Anladım" (`bg-[#00d4c4] hover:bg-[#00c4b4] text-[#0d2818] font-bold py-3 rounded-xl shadow-md w-full mt-2`).
  - Alttaki Oyna sayfası kararır; hiçbir bileşen sızamaz veya karışamaz.

---

### 6. `src/components/LearnMenuPage.tsx` & `src/components/RoadmapPage.tsx`
- **Arka Plan:** Derin orman yeşili (`bg-[#122b1e]`).
- **Genel İlerleme Kartı:** Krem zemin (`bg-[#f5eedc] text-[#141f1b] rounded-2xl border border-[#e5dcce] shadow-xl`).
  - İlerleme çubuğu: Su yeşili gradyan (`linear-gradient(90deg, #00d4c4, #00a896)`).
  - XP Rozeti: `text-[#0c4e48] font-bold`.
- **Modül Kartları ("Yol Haritası", "Kurallar"):** Krem menü kartları (`bg-[#f5eedc] text-[#141f1b] shadow-xl`).
- **Yol Haritası (RoadmapPage):**
  - SVG Patikası: Altın kum yol (`#c49a54`), koyu kasa (`#17100a`).
  - Ada Etiketleri: Sıcak krem kutucuklar (`bg-[#f5eedc] text-[#141f1b] border border-[#e5dcce] shadow-xl`).
  - Masaüstü ve mobil aktif seviye kartları: Krem zemin üzerinde koyu tipografi.

---

### 7. `src/components/RulesPage.tsx`, `LessonDetailPage.tsx`, `Lesson1Page.tsx`
- **Arka Plan:** Derin orman yeşili (`bg-[#122b1e]`).
- **Kurallar Sekme Çubuğu:** Krem pill container (`bg-[#f5eedc]`). Aktif sekme su yeşili (`bg-[#00d4c4] text-[#0d2818] font-bold`).
- **Taş Izgarası Butonları:** Krem butonlar (`bg-[#f5eedc] border border-[#e5dcce] text-[#141f1b] shadow-md`).
- **Seçili Taş Detay Kartı:** Krem lüks bilgi kartı (`bg-[#f5eedc] rounded-3xl border border-[#e5dcce] text-[#141f1b] shadow-xl`). Seçim çerçevesi koyu zümrüt/siyah `2.5px solid #141f1b`.
- **Ders Slayt Kartları:** Krem zemin (`bg-[#f5eedc] text-[#141f1b] rounded-3xl border border-[#e5dcce] shadow-xl`).
  - Kazanım metni: Koyu zümrüt / kehribar (`text-[#0c4e48] font-bold`).
  - İlerleme butonları: "← Önceki" krem buton (`bg-[#e8deca] text-[#141f1b]`), "Sonraki →" su yeşili buton (`bg-[#00d4c4] text-[#0d2818]`).

---

### 8. Oyun ve Tahta Bileşenleri (`ScreenPlayView.tsx`, `BoardGrid.tsx`, `PlayerCard.tsx`, `ControlBar.tsx`)
- **Arka Plan:** Koyu satranç salonu yeşili (`bg-[#153423]`).
- **Header:** Koyu zümrüt bar (`bg-[#142b1f] text-white`).
- **Oyuncu Kartları (`PlayerCard.tsx`):** Koyu yeşil panel (`bg-[#132b1d]/90 text-white`).
  - Avatar kutusu: Krem kare (`bg-[#eae5d8] text-[#141f1b]`).
  - Süre sayacı: Sıcak krem / beyaz kutu (`bg-white text-[#141f1b] font-bold`).
- **Satranç Tahtası (`BoardGrid.tsx`):**
  - Ahşap çerçeve (`#3a200f`) ve koyu/açık ahşap kareler (`#916239`, `#cba476`).
  - Hamle noktaları: Canlı su yeşili / altın kehribar (`bg-[#00d4c4] ring-2 ring-black/40 animate-pulse`).
- **Alt Kontrol Barı (`ControlBar.tsx`):**
  - Krem kontrol şeridi (`bg-[#f4eedd] border-t border-[#e2d8c3] text-[#141f1b] shadow-lg`). İkonlar ve yazılar koyu `#141f1b`.
- **Oyun Bitti & Seçenekler Modalları:**
  - Karartmalı backdrop (`bg-black/60 backdrop-blur-sm`).
  - Modal kutusu: Koyu yeşil veya lüks krem kart, su yeşili "Tekrar Oyna" butonu.

---

### 9. Modallar (`TimeControlModal`, `PlayInPersonModal`, `TournamentModal`, `PlayAFriendModal`)
- **Arka Plan:** Koyu yeşil (`bg-[#122b1e]/98 text-white`).
- **Ayar Kartları & Giriş Alanları:** Krem kutular (`bg-[#f5eedc] text-[#141f1b] border border-[#e5dcce] shadow-md`).
- **Seçim Hapları:** Aktif seçimler su yeşili neon (`bg-[#00d4c4] text-[#0d2818] font-bold shadow-md`), inaktifler açık bej (`bg-[#e8deca] text-[#141f1b]`).
- **Ana Onay Butonları:** Su yeşili neon ana buton (`bg-[#00d4c4] hover:bg-[#00c4b4] text-[#0d2818] shadow-lg`).

---

## 🔍 5. Doğrulama ve Test Adımları

1. **Anasayfa Doğrulaması:**
   - Arka planın koyu orman yeşili (`#1a4228`) olduğu, mağaza/profil/ayarlar butonlarının krem (`#f5eedc`) olduğu teyit edilecek.
   - "Oyna" ve "Öğren" butonlarının su yeşili neon (`#00d4c4`) ışımasıyla parladığı test edilecek.
2. **Oyna Sayfası ve Menü Kartları:**
   - Sayfa arka planının koyu yeşil, modül butonlarının krem (`#f5eedc`), üzerindeki yazı ve 48px Phosphor ikonların koyu zümrüt siyahı (`#141f1b`) olduğu doğrulanacak.
3. **"Hakan'ın Otağında" Modal Testi:**
   - "Koç ile oyna", "Özel oyun" ve turnuvada "Kayıt Ol" tıklandığında arkadaki sayfanın karardığı, ortada bağımsız lüks krem bir modal çıktığı, Oyna sayfasındaki hiçbir bileşenle çakışmadığı doğrulanacak.
4. **Bot Seçim Sayfası:**
   - Arka planın koyu yeşil, bot kartlarının krem, drawer'ın açık kum rengi, taçların altın sarısı ve başlat butonunun sağlam kontrastlı olduğu teyit edilecek.
5. **Oyun Ekranı & Tahta:**
   - Ekranın koyu yeşil, tahtanın ahşap, alt kontrol çubuğunun krem, oyuncu kartlarının net ve sayaçların hatasız çalıştığı doğrulanacak.
6. **Kurallar & Öğrenme Sayfaları:**
   - Taş bilgi kartlarının ve ders slaytlarının krem zemin üzerinde siyah/zümrüt yazılarla en ufak parlama veya okunaksızlık olmadan görüntülendiği doğrulanacak.
7. **İkon Bütünlüğü:**
   - Kod tabanında sıfır `lucide-react` importu olduğu, her yerde `@phosphor-icons/react` kullanıldığı teyit edilecek.
