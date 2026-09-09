-- ═══════════════════════════════════════════════════════════════
-- 05_rls_hardening — Ek güvenlik indexleri + updated_at trigger (Faz 9)
-- Supabase Dashboard → SQL Editor'de TEK SEFERDE çalıştırın.
-- Idempotent: tüm indexler IF NOT EXISTS, fonksiyon CREATE OR REPLACE,
-- trigger'lar DROP IF EXISTS + CREATE ile kurulur; tekrar çalıştırılabilir.
--
-- DİKKAT (Faz 9 kapsamı):
-- - Mevcut AÇIK RLS politikaları BOZULMAZ (anonim okuma/yazma aynen kalır).
-- - online_games + online_moves + player_ratings + tournaments* için
--   oda-kodu-bilen-yazar politikasına GEÇİŞ YAPILMAZ (bu dosyada yok).
-- - Bu dosya SADECE ek index + updated_at otomasyonu ekler.
-- - Sıkılaştırma için manuel adımlar en altta YORUM olarak bırakıldı (prod notu).
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. updated_at OTOMASYONU (ortak trigger fonksiyonu)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- online_games: updated_at sütunu schema.sql'de zaten var.
DROP TRIGGER IF EXISTS trg_online_games_updated_at ON public.online_games;
CREATE TRIGGER trg_online_games_updated_at
  BEFORE UPDATE ON public.online_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- player_ratings: updated_at sütunu 03_player_ratings.sql'de zaten var.
DROP TRIGGER IF EXISTS trg_player_ratings_updated_at ON public.player_ratings;
CREATE TRIGGER trg_player_ratings_updated_at
  BEFORE UPDATE ON public.player_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOT: tournaments / tournament_players / tournament_pairings tablolarında
-- updated_at sütunu YOKTUR (sadece created_at/joined_at var); bu yüzden
-- bu tablolara updated_at trigger'ı kurulmadı. Gerekirse önce
-- ADD COLUMN IF NOT EXISTS updated_at eklenip trigger bağlanmalıdır
-- (şu an kapsam dışı — mevcut şema bozulmasın diye eklenmedi).

-- ═══════════════════════════════════════════════════════════════
-- 2. MEVCUT İNDEKSLERİN IDEMPOTENT GÜVENCESİ
-- (schema.sql'deki ilk 4 index IF NOT EXISTS'sizdi; aynı isim+tanımla
--  burada IF NOT EXISTS ile tekrarlanır — varsa no-op, yoksa kurulur.)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_online_games_code ON public.online_games (code);
CREATE INDEX IF NOT EXISTS idx_online_games_status ON public.online_games (status);
CREATE INDEX IF NOT EXISTS idx_online_moves_game_id ON public.online_moves (game_id);
CREATE INDEX IF NOT EXISTS idx_online_moves_game_id_number ON public.online_moves (game_id, move_number);

-- ═══════════════════════════════════════════════════════════════
-- 3. EK GÜVENLİK / OPERASYONEL İNDEKSLER (tümü IF NOT EXISTS)
-- Amaç: oyuncu-bazlı suistimal taraması, oda kodu araması, sıralama ve
-- temizlik (updated_at/created_at) sorgularını hızlandırmak. RLS'yi
-- değiştirmez, sadece okuma/yazma planlarını iyileştirir.
-- ═══════════════════════════════════════════════════════════════

-- online_games: oyuncu ID ile tarama (çoklu-oda açma / spam tespiti).
CREATE INDEX IF NOT EXISTS idx_online_games_white_player ON public.online_games (white_player_id);
CREATE INDEX IF NOT EXISTS idx_online_games_black_player ON public.online_games (black_player_id);

-- online_games: son-güncelleme sırası (zombi oda temizliği / listeleme).
CREATE INDEX IF NOT EXISTS idx_online_games_updated_at ON public.online_games (updated_at DESC);

-- online_moves: oyun-içi kronoloji + global akış (replay / denetim).
CREATE INDEX IF NOT EXISTS idx_online_moves_created_at ON public.online_moves (created_at DESC);

-- player_ratings: liderlik + pasif-hesap temizliği.
CREATE INDEX IF NOT EXISTS idx_player_ratings_updated_at ON public.player_ratings (updated_at DESC);

-- tournaments: durum + başlangıç kompoziti (yaklaşan/aktif liste).
CREATE INDEX IF NOT EXISTS idx_tournaments_status_starts_at ON public.tournaments (status, starts_at);

-- tournament_players: oyuncu-bazlı katılım araması + liderlik sıralaması.
CREATE INDEX IF NOT EXISTS idx_tournament_players_player_id ON public.tournament_players (player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_leaderboard
  ON public.tournament_players (tournament_id, score DESC);

-- tournament_pairings: oyuncu-bazlı eşleşme denetimi (çift-kayıt / collusion taraması).
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_white ON public.tournament_pairings (white_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_black ON public.tournament_pairings (black_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. MANUEL RLS SIKILAŞTIRMA ADIMLARI (PROD NOTU — OTOMATİK UYGULANMAZ!)
-- ═══════════════════════════════════════════════════════════════
-- Mevcut durum kasıtlı olarak AÇIKTIR (anonim SELECT/INSERT/UPDATE → true).
-- Auth (Supabase Auth / anon player_id → auth.uid() eşlemesi) eklenmeden
-- aşağıdaki adımlar UYGULANMAMALIDIR; yoksa canlı oyun bozulur.
--
-- Adım 1 — Önkoşul: kullanıcı kimliği taşıyın.
--   - online_games.white_player_id / black_player_id → auth.uid() ile eşleşen
--     gerçek kimliğe bağlanmalı (şu an localStorage anonim ID, güvenilmez).
--   - Gerekirse public.profiles (id UUID PK ↔ auth.users) tablosu ekleyin.
--
-- Adım 2 — Oda-kodu-bilen-yazar politikası taslağı (SADECE REFERANS, ÇALIŞTIRMA!):
--   -- Önce açık politikaları kaldır:
--   -- DROP POLICY "Herkes online_games okuyabilir" ON public.online_games;
--   -- DROP POLICY "Herkes online_games ekleyebilir" ON public.online_games;
--   -- DROP POLICY "Herkes online_games güncelleyebilir" ON public.online_games;
--   -- DROP POLICY "Herkes online_moves okuyabilir" ON public.online_moves;
--   -- DROP POLICY "Herkes online_moves ekleyebilir" ON public.online_moves;
--   -- Sonra oda kodu bilen + oyuncu-eşleşen politikalar yaz:
--   -- CREATE POLICY "oda_bilen_okur" ON public.online_games
--   --   FOR SELECT USING (true);  -- okuma yine herkese açık kalabilir (canlı izleme)
--   -- CREATE POLICY "oda_bilen_yazar" ON public.online_games
--   --   FOR UPDATE USING (
--   --     white_player_id = current_setting('request.jwt.claims', true)::json->>'sub'
--   --     OR black_player_id = current_setting('request.jwt.claims', true)::json->>'sub'
--   --   );
--   -- online_moves için game_id → online_games.code join'li WITH CHECK gerekir;
--   -- security-definer bir RPC (örn. submit_move(p_code, ...)) tercih edilir:
--   -- hamle doğrulaması (sıra, legalite) DB fonksiyonunda yapılır.
--
-- Adım 3 — player_ratings sıkılaştırma (SADECE REFERANS, ÇALIŞTIRMA!):
--   -- Okuma herkese açık kalabilir (liderlik tablosu).
--   -- Yazma SADECE service_role / security-definer RPC üzerinden olmalı:
--   -- DROP POLICY "Herkes player_ratings ekleyebilir" ON public.player_ratings;
--   -- DROP POLICY "Herkes player_ratings guncelleyebilir" ON public.player_ratings;
--   -- CREATE POLICY "rating_yazma_yok" ON public.player_ratings FOR ALL USING (false);
--   -- + ELO güncellemesi yapan SECURITY DEFINER fonksiyon (oyun-sonu RPC'si).
--
-- Adım 4 — tournaments* sıkılaştırma (SADECE REFERANS, ÇALIŞTIRMA!):
--   -- tournaments okuma herkese açık; INSERT/UPDATE admin (service_role) olmalı.
--   -- tournament_players INSERT: auth'lu kullanıcı kendi player_id'si ile
--   --   tek satır ekleyebilir (WITH CHECK (player_id = auth.uid()::text)).
--   -- tournament_pairings yazma: SADECE turnuva hakemi RPC'si (service_role).
--
-- Adım 5 — Doğrulama:
--   - Her politika değişiminden sonra staging'de: oda aç → katıl → hamle →
--     realtime senkron → rating/turnuva akışı uçtan uca test edilir.
--   - Bu dosyanın eklediği indexler (EXPLAIN ile) ve trigger'lar
--     (UPDATE sonrası updated_at değişimi) ayrıca doğrulanır.
-- ═══════════════════════════════════════════════════════════════
