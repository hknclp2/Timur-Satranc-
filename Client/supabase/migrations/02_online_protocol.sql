-- ═══════════════════════════════════════════════════════════════
-- Faz 2 — Online protokol alanları (tek seferlik migration)
-- Supabase Dashboard → SQL Editor'de BIR KEZ çalıştırın.
-- Idempotent: IF NOT EXISTS kullanır, tekrar çalıştırılabilir.
-- RLS'ye DOKUNMAZ (schema.sql'deki politikalar aynen kalır).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS draw_offer_by TEXT NULL;

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS takeback_offer_by TEXT NULL;

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS rematch_offer_by TEXT NULL;

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS rematch_of UUID NULL;
