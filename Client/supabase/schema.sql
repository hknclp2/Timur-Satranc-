-- ═══════════════════════════════════════════════════════════════
-- Timur Satrancı — Online Arkadaş Maçı (Friend Match) Şeması
-- Supabase Dashboard → SQL Editor'de TEK SEFERDE, SIRAYLA çalıştırın.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. ONLINE_GAMES TABLOSU
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.online_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 6 haneli oda kodu (benzersiz, örn: "TM8X9A")
  code VARCHAR(6) UNIQUE NOT NULL,

  -- Oyuncular (kayıtsız anonim ID: localStorage'daki timur_player_id)
  white_player_id TEXT NOT NULL,
  black_player_id TEXT,

  -- Oyuncu isimleri (UI'da gösterilecek)
  white_name TEXT NOT NULL DEFAULT 'Oyuncu 1',
  black_name TEXT DEFAULT 'Oyuncu 2',

  -- Oyun durumu
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'ended')),

  -- Sıradaki oyuncu
  current_turn TEXT NOT NULL DEFAULT 'white'
    CHECK (current_turn IN ('white', 'black')),

  -- Tam tahta durumu (BoardMatrix JSON olarak)
  board_state JSONB NOT NULL,

  -- Hisar durumu
  citadels_state JSONB NOT NULL DEFAULT '{"whiteCitadelPiece": null, "blackCitadelPiece": null}'::JSONB,

  -- Yenilen taşlar
  captured_pieces JSONB NOT NULL DEFAULT '{"white": [], "black": []}'::JSONB,

  -- King swap kullanımı
  has_used_king_swap JSONB NOT NULL DEFAULT '{"white": false, "black": false}'::JSONB,

  -- Tur sayısı
  turn_number INTEGER NOT NULL DEFAULT 1,
  half_move_clock INTEGER NOT NULL DEFAULT 0,

  -- Oyun sonu bilgileri
  winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
  end_reason TEXT,
  status_reason TEXT,

  -- Son hamle bilgisi (highlight için)
  last_move JSONB,

  -- Hamle sayacı (kaçıncı hamle)
  move_count INTEGER NOT NULL DEFAULT 0,

  -- Zaman damgaları
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 2. ONLINE_MOVES TABLOSU (Hamle Geçmişi)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.online_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.online_games(id) ON DELETE CASCADE NOT NULL,

  move_number INTEGER NOT NULL,
  player_color TEXT NOT NULL CHECK (player_color IN ('white', 'black')),

  -- Hamle koordinatları (BoardPosition JSON)
  from_pos JSONB NOT NULL,
  to_pos JSONB NOT NULL,

  -- Taş bilgisi
  piece_type TEXT NOT NULL,
  captured_piece_type TEXT,
  promotion TEXT,

  -- Notasyon
  notation TEXT NOT NULL,

  -- Durum bayrakları
  is_check BOOLEAN DEFAULT FALSE,
  is_checkmate BOOLEAN DEFAULT FALSE,

  -- Hamle sonrası tam snapshot (replay ve analiz için)
  board_state_after JSONB NOT NULL,
  citadels_state_after JSONB NOT NULL,
  captured_pieces_after JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 3. İNDEKSLER
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_online_games_code ON public.online_games(code);
CREATE INDEX idx_online_games_status ON public.online_games(status);
CREATE INDEX idx_online_moves_game_id ON public.online_moves(game_id);
CREATE INDEX idx_online_moves_game_id_number ON public.online_moves(game_id, move_number);

-- ═══════════════════════════════════════════════════════════════
-- 4. REALTIME YAYIN AYARI (KRİTİK — olmadan canlı senkron çalışmaz)
-- ═══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_moves;

-- ═══════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY (anonim kullanıcılar için açık)
-- NOT: Kasıtlı olarak açıktır. Kullanıcı kimlik doğrulaması
-- eklendiğinde sıkılaştırılacaktır.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.online_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes online_games okuyabilir" ON public.online_games
  FOR SELECT USING (true);

CREATE POLICY "Herkes online_games ekleyebilir" ON public.online_games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes online_games güncelleyebilir" ON public.online_games
  FOR UPDATE USING (true);

CREATE POLICY "Herkes online_moves okuyabilir" ON public.online_moves
  FOR SELECT USING (true);

CREATE POLICY "Herkes online_moves ekleyebilir" ON public.online_moves
  FOR INSERT WITH CHECK (true);
