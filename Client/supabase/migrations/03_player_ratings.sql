-- ═══════════════════════════════════════════════════════════════
-- 03_player_ratings — Online ELO ratingleri (sadece online, bot yok)
-- Supabase Dashboard → SQL Editor'de TEK SEFERDE çalıştırın.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.player_ratings (
  player_id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL DEFAULT 1200,
  games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_rating
  ON public.player_ratings (rating DESC);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes player_ratings okuyabilir" ON public.player_ratings;
CREATE POLICY "Herkes player_ratings okuyabilir" ON public.player_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Herkes player_ratings ekleyebilir" ON public.player_ratings;
CREATE POLICY "Herkes player_ratings ekleyebilir" ON public.player_ratings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes player_ratings guncelleyebilir" ON public.player_ratings;
CREATE POLICY "Herkes player_ratings guncelleyebilir" ON public.player_ratings
  FOR UPDATE USING (true);
