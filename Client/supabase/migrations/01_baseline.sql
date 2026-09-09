-- ═══════════════════════════════════════════════════════════════
-- 01_baseline — Timur Satrancı ana şema (schema.sql'in migration hali)
-- Uzak projede tablolar hiç oluşmamıştı, bu yüzden baseline olarak eklendi.
-- Idempotent: tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════

-- 1. ONLINE_GAMES TABLOSU
CREATE TABLE IF NOT EXISTS public.online_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  white_player_id TEXT NOT NULL,
  black_player_id TEXT,
  white_name TEXT NOT NULL DEFAULT 'Oyuncu 1',
  black_name TEXT DEFAULT 'Oyuncu 2',
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'ended')),
  current_turn TEXT NOT NULL DEFAULT 'white'
    CHECK (current_turn IN ('white', 'black')),
  board_state JSONB NOT NULL,
  citadels_state JSONB NOT NULL DEFAULT '{"whiteCitadelPiece": null, "blackCitadelPiece": null}'::JSONB,
  captured_pieces JSONB NOT NULL DEFAULT '{"white": [], "black": []}'::JSONB,
  has_used_king_swap JSONB NOT NULL DEFAULT '{"white": false, "black": false}'::JSONB,
  turn_number INTEGER NOT NULL DEFAULT 1,
  half_move_clock INTEGER NOT NULL DEFAULT 0,
  winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
  end_reason TEXT,
  status_reason TEXT,
  last_move JSONB,
  move_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ONLINE_MOVES TABLOSU
CREATE TABLE IF NOT EXISTS public.online_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.online_games(id) ON DELETE CASCADE NOT NULL,
  move_number INTEGER NOT NULL,
  player_color TEXT NOT NULL CHECK (player_color IN ('white', 'black')),
  from_pos JSONB NOT NULL,
  to_pos JSONB NOT NULL,
  piece_type TEXT NOT NULL,
  captured_piece_type TEXT,
  promotion TEXT,
  notation TEXT NOT NULL,
  is_check BOOLEAN DEFAULT FALSE,
  is_checkmate BOOLEAN DEFAULT FALSE,
  board_state_after JSONB NOT NULL,
  citadels_state_after JSONB NOT NULL,
  captured_pieces_after JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_online_games_code ON public.online_games(code);
CREATE INDEX IF NOT EXISTS idx_online_games_status ON public.online_games(status);
CREATE INDEX IF NOT EXISTS idx_online_moves_game_id ON public.online_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_online_moves_game_id_number ON public.online_moves(game_id, move_number);

-- 4. REALTIME YAYIN AYARI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'online_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.online_games;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'online_moves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.online_moves;
  END IF;
END $$;

-- 5. ROW LEVEL SECURITY (anonim kullanıcılar için açık — bilinçli)
ALTER TABLE public.online_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes online_games okuyabilir" ON public.online_games;
CREATE POLICY "Herkes online_games okuyabilir" ON public.online_games
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Herkes online_games ekleyebilir" ON public.online_games;
CREATE POLICY "Herkes online_games ekleyebilir" ON public.online_games
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes online_games güncelleyebilir" ON public.online_games;
CREATE POLICY "Herkes online_games güncelleyebilir" ON public.online_games
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Herkes online_moves okuyabilir" ON public.online_moves;
CREATE POLICY "Herkes online_moves okuyabilir" ON public.online_moves
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Herkes online_moves ekleyebilir" ON public.online_moves;
CREATE POLICY "Herkes online_moves ekleyebilir" ON public.online_moves
  FOR INSERT WITH CHECK (true);
