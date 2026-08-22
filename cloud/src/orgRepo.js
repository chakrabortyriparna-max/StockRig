/* Org membership + invite repository (pg). All queries org-scoped. */
"use strict";

function createPgOrgRepo(db) {
  return {
    async listMembers(orgId) {
      const { rows } = await db.query(
        `SELECT u.id, m.role, m.created_at
         FROM public.memberships m
         JOIN public.users u ON u.id = m.user_id
         WHERE m.org_id = $1
         ORDER BY m.created_at`,
        [orgId]
      );
      return rows;
    },

    async getMember(orgId, userId) {
      const { rows } = await db.query(
        `SELECT u.id, m.role FROM public.memberships m
         JOIN public.users u ON u.id = m.user_id
         WHERE m.org_id = $1 AND m.user_id = $2`,
        [orgId, userId]
      );
      return rows[0] || null;
    },

    async removeMember(orgId, userId) {
      const { rowCount } = await db.query(
        "DELETE FROM public.memberships WHERE org_id = $1 AND user_id = $2",
        [orgId, userId]
      );
      return rowCount > 0;
    },

    async setRole(orgId, userId, role) {
      const { rows } = await db.query(
        `UPDATE public.memberships SET role = $3
         WHERE org_id = $1 AND user_id = $2
         RETURNING user_id, role`,
        [orgId, userId, role]
      );
      return rows[0] || null;
    },

    async countOwners(orgId) {
      const { rows } = await db.query(
        "SELECT count(*)::int AS n FROM public.memberships WHERE org_id = $1 AND role = 'owner'",
        [orgId]
      );
      return rows[0].n;
    },

    async createInvite({ orgId, email, role, tokenHash, invitedBy }) {
      const { rows } = await db.query(
        `INSERT INTO public.invites (org_id, email, role, token_hash, invited_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [orgId, email.toLowerCase(), role, tokenHash, invitedBy]
      );
      return rows[0];
    },

    // Pending only: accepted/revoked invites are dead.
    async findInviteByToken(tokenHash) {
      const { rows } = await db.query(
        `SELECT id, org_id, email, role FROM public.invites
         WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
        [tokenHash]
      );
      return rows[0] || null;
    },

    async acceptInvite(inviteId, userId) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const inv = await client.query(
          `UPDATE public.invites SET accepted_at = now()
           WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL
           RETURNING org_id, role`,
          [inviteId]
        );
        if (inv.rowCount === 0) {
          await client.query("ROLLBACK");
          return null;
        }
        const { org_id: orgId, role } = inv.rows[0];
        await client.query(
          `INSERT INTO public.memberships (org_id, user_id, role)
           VALUES ($1, $2, $3) ON CONFLICT (org_id, user_id) DO NOTHING`,
          [orgId, userId, role]
        );
        await client.query("COMMIT");
        return { orgId, role };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createPgOrgRepo };
