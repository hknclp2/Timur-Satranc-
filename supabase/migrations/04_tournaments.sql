-- ═══════════════════════════════════════════════════════════════
-- Timur Satrancı — Turnuva Arenası MVP iskeleti (Faz 8)
-- Supabase Dashboard → SQL Editor'de TEK SEFERDE, SIRAYLA çalıştırın.
-- NOT: src/components/TournamentModal.tsx statik listesi bu şemadan
-- bağımsızdır; bu migration mevcut UI'yı/oyunu bozmaz.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. TOURNAMENTS TABLOSU
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  time_control TEXT NOT NULL DEFAULT '3+2',
  max_players INTEGER NOT NULL DEFAULT 128,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'ended')),
  starts_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 2. TOURNAMENT_PLAYERS TABLOSU (katılım + arena skoru)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tournament_players (
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  player_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tournament_id, player_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. TOURNAMENT_PAIRINGS TABLOSU (tur eşleşmeleri + sonuç)
-- result: 'white' | 'black' | 'draw' | NULL (oynanmadı)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tournament_pairings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  white_id TEXT NOT NULL,
  black_id TEXT NOT NULL,
  result TEXT CHECK (result IS NULL OR result IN ('white', 'black', 'draw')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 4. İNDEKSLER
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON public.tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON public.tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_tournament_id ON public.tournament_pairings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_round ON public.tournament_pairings(tournament_id, round);

-- ═══════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY (anonim kullanıcılar için açık — MVP)
-- NOT: Kasıtlı olarak açıktır; auth eklendiğinde sıkılaştırılacaktır.
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes tournaments okuyabilir" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "Herkes tournaments ekleyebilir" ON public.tournaments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes tournaments güncelleyebilir" ON public.tournaments
  FOR UPDATE USING (true);

CREATE POLICY "Herkes tournament_players okuyabilir" ON public.tournament_players
  FOR SELECT USING (true);

CREATE POLICY "Herkes tournament_players ekleyebilir" ON public.tournament_players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes tournament_players güncelleyebilir" ON public.tournament_players
  FOR UPDATE USING (true);

CREATE POLICY "Herkes tournament_pairings okuyabilir" ON public.tournament_pairings
  FOR SELECT USING (true);

CREATE POLICY "Herkes tournament_pairings ekleyebilir" ON public.tournament_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes tournament_pairings güncelleyebilir" ON public.tournament_pairings
  FOR UPDATE USING (true);
