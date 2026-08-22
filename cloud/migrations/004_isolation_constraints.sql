-- StockRig Cloud — 004_isolation_constraints.sql
-- SR-C07: tenant isolation enforced by the schema itself. Business child rows
-- (stock_qty, pars, usage) can only reference parents inside their OWN org via
-- composite FKs on (org_id, id). Mixing orgs becomes structurally impossible,
-- independent of any application code.

-- ============ UP ============

-- Composite-FK targets: (org_id, id) must be unique on parents.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_locations_org_id') THEN
    ALTER TABLE public.locations ADD CONSTRAINT uq_locations_org_id UNIQUE (org_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_parts_org_id') THEN
    ALTER TABLE public.parts ADD CONSTRAINT uq_parts_org_id UNIQUE (org_id, id);
  END IF;
END $$;

-- stock_qty: location and part must belong to the row's own org.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_qty_location_id_fkey') THEN
    ALTER TABLE public.stock_qty DROP CONSTRAINT stock_qty_location_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_location_same_org') THEN
    ALTER TABLE public.stock_qty ADD CONSTRAINT fk_stock_location_same_org
      FOREIGN KEY (org_id, location_id) REFERENCES public.locations (org_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_qty_part_id_fkey') THEN
    ALTER TABLE public.stock_qty DROP CONSTRAINT stock_qty_part_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_part_same_org') THEN
    ALTER TABLE public.stock_qty ADD CONSTRAINT fk_stock_part_same_org
      FOREIGN KEY (org_id, part_id) REFERENCES public.parts (org_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- pars: same treatment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pars_location_id_fkey') THEN
    ALTER TABLE public.pars DROP CONSTRAINT pars_location_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pars_location_same_org') THEN
    ALTER TABLE public.pars ADD CONSTRAINT fk_pars_location_same_org
      FOREIGN KEY (org_id, location_id) REFERENCES public.locations (org_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pars_part_id_fkey') THEN
    ALTER TABLE public.pars DROP CONSTRAINT pars_part_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pars_part_same_org') THEN
    ALTER TABLE public.pars ADD CONSTRAINT fk_pars_part_same_org
      FOREIGN KEY (org_id, part_id) REFERENCES public.parts (org_id, id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END $$;

-- usage: same treatment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_location_id_fkey') THEN
    ALTER TABLE public.usage DROP CONSTRAINT usage_location_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usage_location_same_org') THEN
    ALTER TABLE public.usage ADD CONSTRAINT fk_usage_location_same_org
      FOREIGN KEY (org_id, location_id) REFERENCES public.locations (org_id, id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_part_id_fkey') THEN
    ALTER TABLE public.usage DROP CONSTRAINT usage_part_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usage_part_same_org') THEN
    ALTER TABLE public.usage ADD CONSTRAINT fk_usage_part_same_org
      FOREIGN KEY (org_id, part_id) REFERENCES public.parts (org_id, id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- ============ DOWN (run to roll back) ============
-- ALTER TABLE public.usage DROP CONSTRAINT fk_usage_part_same_org;
-- ALTER TABLE public.usage ADD CONSTRAINT usage_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE RESTRICT;
-- ALTER TABLE public.usage DROP CONSTRAINT fk_usage_location_same_org;
-- ALTER TABLE public.usage ADD CONSTRAINT usage_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE RESTRICT;
-- ALTER TABLE public.pars DROP CONSTRAINT fk_pars_part_same_org;
-- ALTER TABLE public.pars ADD CONSTRAINT pars_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;
-- ALTER TABLE public.pars DROP CONSTRAINT fk_pars_location_same_org;
-- ALTER TABLE public.pars ADD CONSTRAINT pars_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;
-- ALTER TABLE public.stock_qty DROP CONSTRAINT fk_stock_part_same_org;
-- ALTER TABLE public.stock_qty ADD CONSTRAINT stock_qty_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;
-- ALTER TABLE public.stock_qty DROP CONSTRAINT fk_stock_location_same_org;
-- ALTER TABLE public.stock_qty ADD CONSTRAINT stock_qty_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;
-- ALTER TABLE public.parts DROP CONSTRAINT uq_parts_org_id;
-- ALTER TABLE public.locations DROP CONSTRAINT uq_locations_org_id;
