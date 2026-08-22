-- StockRig Cloud — 001_init.sql
-- Ticket SR-C02: org-scoped schema on InsForge Postgres.
-- Up: CREATE IF NOT EXISTS (idempotent). Down section at bottom (DROP ... CASCADE).
-- App `users` extends InsForge-managed auth.users (uuid id).

-- ============ UP ============

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- App users extend InsForge's auth.users when present (managed deployments);
-- on vanilla Postgres (CI, self-hosted) they stand alone with the same shape.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.users (
      id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name   text NOT NULL DEFAULT '''',
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )';
  ELSE
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.users (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email       text UNIQUE,
      full_name   text NOT NULL DEFAULT '''',
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memberships (
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner','admin','tech')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);

CREATE TABLE IF NOT EXISTS public.locations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  kind        text NOT NULL DEFAULT 'van' CHECK (kind IN ('shop','van')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS public.parts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  number       text NOT NULL CHECK (length(btrim(number)) BETWEEN 1 AND 60),
  description  text NOT NULL DEFAULT '',
  unit_cost    numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, number)            -- dup-number guard (SR-C09)
);

CREATE TABLE IF NOT EXISTS public.stock_qty (
  org_id       uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  location_id  bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  part_id      bigint NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  qty          integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (location_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_org_loc ON public.stock_qty(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_part    ON public.stock_qty(part_id);

CREATE TABLE IF NOT EXISTS public.pars (
  org_id       uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  location_id  bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  part_id      bigint NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  qty          integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (location_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_pars_org ON public.pars(org_id, location_id);

CREATE TABLE IF NOT EXISTS public.usage (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE RESTRICT,
  used_on     date NOT NULL DEFAULT CURRENT_DATE,
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  part_id     bigint NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  qty         integer NOT NULL CHECK (qty > 0),
  job         text NOT NULL DEFAULT '',
  billed      boolean NOT NULL DEFAULT false,
  billed_at   timestamptz,
  part_snap   text NOT NULL,           -- snapshot survives reference deletion (v1.2 heritage)
  loc_snap    text NOT NULL,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT billed OR billed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_usage_org_date  ON public.usage(org_id, used_on DESC);
CREATE INDEX IF NOT EXISTS idx_usage_unbilled  ON public.usage(org_id, billed) WHERE billed = false;
CREATE INDEX IF NOT EXISTS idx_usage_location  ON public.usage(location_id);
CREATE INDEX IF NOT EXISTS idx_usage_part      ON public.usage(part_id);

-- Billed rows are history, not state (PRD principle #2). Enforced here so it
-- holds regardless of which code path writes.
CREATE OR REPLACE FUNCTION public.enforce_billed_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.billed THEN
    RAISE EXCEPTION 'usage row % is billed and immutable', OLD.id;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.billed THEN
    RAISE EXCEPTION 'usage row % is billed and cannot be deleted', OLD.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_usage_billed_immutable ON public.usage;
CREATE TRIGGER trg_usage_billed_immutable
  BEFORE UPDATE OF qty, job, billed, billed_at, part_snap, loc_snap OR DELETE ON public.usage
  FOR EACH ROW EXECUTE FUNCTION public.enforce_billed_immutability();

CREATE TABLE IF NOT EXISTS public.audit_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL DEFAULT '',
  before      jsonb,
  after       jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_org_at ON public.audit_events(org_id, at DESC);

-- ============ DOWN (run statements below to roll back) ============
-- DROP TRIGGER IF EXISTS trg_usage_billed_immutable ON public.usage;
-- DROP FUNCTION IF EXISTS public.enforce_billed_immutability();
-- DROP TABLE IF EXISTS public.audit_events CASCADE;
-- DROP TABLE IF EXISTS public.usage CASCADE;
-- DROP TABLE IF EXISTS public.pars CASCADE;
-- DROP TABLE IF EXISTS public.stock_qty CASCADE;
-- DROP TABLE IF EXISTS public.parts CASCADE;
-- DROP TABLE IF EXISTS public.locations CASCADE;
-- DROP TABLE IF EXISTS public.memberships CASCADE;
-- DROP TABLE IF EXISTS public.orgs CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
