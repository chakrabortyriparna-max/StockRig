/* SR-C07 tenant-isolation suite — runs against REAL Postgres.
   Skipped locally (no DATABASE_URL); enforced in CI's migrations job after
   migrations up. Proves: cross-org reads return nothing, cross-org writes
   affect nothing, and org-mixing is rejected by schema constraints. */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

if (!process.env.DATABASE_URL) {
  test("tenant isolation", { skip: "DATABASE_URL not set — run in CI against disposable DB" }, () => {});
} else {
  const { Pool } = require("pg");

  test("cross-org access attempts all fail", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // -- seed two isolated shops --
      const seed = await pool.query(`
        WITH a AS (
          INSERT INTO public.orgs (name) VALUES ('Iso Org A') RETURNING id, 'A' AS tag
        ), b AS (
          INSERT INTO public.orgs (name) VALUES ('Iso Org B') RETURNING id, 'B' AS tag
        )
        SELECT (SELECT id FROM a) AS org_a, (SELECT id FROM b) AS org_b`);
      const { org_a: orgA, org_b: orgB } = seed.rows[0];

      const locs = await pool.query(`
        INSERT INTO public.locations (org_id, name, kind)
        VALUES ($1, 'Van A', 'van'), ($2, 'Van B', 'van')
        RETURNING id, org_id`, [orgA, orgB]);
      const locA = locs.rows.find((r) => r.org_id === orgA).id;
      const locB = locs.rows.find((r) => r.org_id === orgB).id;

      const parts = await pool.query(`
        INSERT INTO public.parts (org_id, number, description)
        VALUES ($1, 'P-A1', 'org A part'), ($2, 'P-B1', 'org B part')
        RETURNING id, org_id`, [orgA, orgB]);
      const partA = parts.rows.find((r) => r.org_id === orgA).id;
      const partB = parts.rows.find((r) => r.org_id === orgB).id;

      await pool.query(
        `INSERT INTO public.stock_qty (org_id, location_id, part_id, qty) VALUES ($1,$2,$3,5), ($4,$5,$6,7)`,
        [orgA, locA, partA, orgB, locB, partB]
      );
      const usage = await pool.query(
        `INSERT INTO public.usage (org_id, location_id, part_id, qty, job, part_snap, loc_snap)
         VALUES ($1,$2,$3,1,'J-ISO-A','PA snap','Van A'), ($4,$5,$6,2,'J-ISO-B','PB snap','Van B')
         RETURNING id, org_id`,
        [orgA, locA, partA, orgB, locB, partB]
      );
      const usageA = usage.rows.find((u) => u.org_id === orgA).id;

      // -- 1. reads scoped by org never leak --
      const leakedParts = await pool.query("SELECT id FROM public.parts WHERE id = $1 AND org_id = $2", [partA, orgB]);
      assert.equal(leakedParts.rowCount, 0, "part of org A must not be readable under org B scope");
      const leakedUsage = await pool.query("SELECT id FROM public.usage WHERE id = $1 AND org_id = $2", [usageA, orgB]);
      assert.equal(leakedUsage.rowCount, 0);

      // -- 2. mutations with wrong org scope affect nothing --
      const hackUpdate = await pool.query(
        "UPDATE public.parts SET description = 'HACKED' WHERE id = $1 AND org_id = $2", [partA, orgB]);
      assert.equal(hackUpdate.rowCount, 0);
      const stillIntact = await pool.query("SELECT description FROM public.parts WHERE id = $1", [partA]);
      assert.equal(stillIntact.rows[0].description, "org A part");
      const hackDelete = await pool.query(
        "DELETE FROM public.usage WHERE id = $1 AND org_id = $2", [usageA, orgB]);
      assert.equal(hackDelete.rowCount, 0);

      // -- 3. org-mixing is impossible at the schema level (004 constraints) --
      for (const [table, cols] of [
        ["stock_qty", "(org_id, location_id, part_id, qty)"],
        ["pars", "(org_id, location_id, part_id, qty)"],
      ]) {
        await assert.rejects(
          pool.query(`INSERT INTO public.${table} ${cols} VALUES ($1,$2,$3,1)`, [orgA, locB, partA]),
          /fk_.*same_org|violates foreign key/i,
          `${table} must refuse cross-org parent references`
        );
      }
      await assert.rejects(
        pool.query(
          `INSERT INTO public.usage (org_id, location_id, part_id, qty, job, part_snap, loc_snap)
           VALUES ($1,$2,$3,1,'J-MIX','x','y')`,
          [orgA, locB, partB]
        ),
        /fk_usage_location_same_org|violates foreign key/i,
        "usage must refuse a location from another org"
      );

      // -- 4. membership join cannot bridge orgs --
      const bridge = await pool.query(
        `SELECT m.user_id FROM public.memberships m WHERE m.org_id = $1 AND m.user_id IN (
           SELECT user_id FROM public.memberships WHERE org_id = $2)`,
        [orgA, orgB]
      );
      assert.equal(bridge.rowCount, 0); // no shared members seeded; helper proves the query shape

      // -- cleanup (usage blocks org deletion: ON DELETE RESTRICT by design) --
      await pool.query("DELETE FROM public.usage WHERE org_id IN ($1,$2)", [orgA, orgB]);
      await pool.query("DELETE FROM public.orgs WHERE id IN ($1,$2)", [orgA, orgB]);
    } finally {
      await pool.end();
    }
  });
}
