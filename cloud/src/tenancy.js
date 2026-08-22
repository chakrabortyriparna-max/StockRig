/* Tenancy provisioning — SR-C04/SR-C07 foundation.
   Signup creates the shop workspace atomically: app user row, org, owner membership. */
"use strict";

async function provisionShop(db, { userId, shopName, userEmail }) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const userRow = await client.query(
      `INSERT INTO public.users (id, full_name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId, userEmail || ""]
    );
    const orgRow = await client.query(
      "INSERT INTO public.orgs (name) VALUES ($1) RETURNING id, name, created_at",
      [shopName]
    );
    await client.query(
      "INSERT INTO public.memberships (org_id, user_id, role) VALUES ($1, $2, 'owner')",
      [orgRow.rows[0].id, userId]
    );
    await client.query("COMMIT");
    return { user: userRow.rows[0], org: orgRow.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function findMembershipByUser(db, userId) {
  const { rows } = await db.query(
    `SELECT o.id AS org_id, o.name AS org_name, m.role
     FROM public.memberships m JOIN public.orgs o ON o.id = m.org_id
     WHERE m.user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { provisionShop, findMembershipByUser };
