-- StockRig Cloud — 002_refresh_tokens.sql
-- Strict single-use refresh sessions. InsForge does NOT kill rotated refresh
-- tokens (verified live 2026-08-22), so rotation enforcement lives here.
-- We only ever persist SHA-256 hashes of tokens, never the tokens themselves.

-- ============ UP ============

CREATE TABLE IF NOT EXISTS public.refresh_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL DEFAULT gen_random_uuid(),
  token_hash  text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  rotated_at  timestamptz,
  revoked_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_rs_family ON public.refresh_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_rs_user   ON public.refresh_sessions(user_id);

-- ============ DOWN (run to roll back) ============
-- DROP TABLE IF EXISTS public.refresh_sessions CASCADE;
