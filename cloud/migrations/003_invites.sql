-- StockRig Cloud — 003_invites.sql
-- SR-C06: org invitations. Tokens stored hashed; single pending invite per
-- (org, email); invite roles limited to admin/tech (ownership transfers are
-- explicit owner actions, never invites).

-- ============ UP ============

CREATE TABLE IF NOT EXISTS public.invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL CHECK (role IN ('admin','tech')),
  token_hash   text NOT NULL UNIQUE,
  invited_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  revoked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_invites_org ON public.invites(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invites_pending
  ON public.invites(org_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ============ DOWN (run to roll back) ============
-- DROP INDEX IF EXISTS public.uq_invites_pending;
-- DROP TABLE IF EXISTS public.invites CASCADE;
