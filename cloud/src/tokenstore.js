/* Refresh-session store — strict single-use rotation with reuse detection.
   Tokens are stored only as SHA-256 hashes. Reuse of a rotated/revoked token
   is a theft signal: the caller revokes the entire family. */
"use strict";

const crypto = require("node:crypto");

function hashToken(t) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

function createPgTokenStore(db) {
  return {
    async issue(userId, refreshToken) {
      const { rows } = await db.query(
        `INSERT INTO public.refresh_sessions (user_id, token_hash)
         VALUES ($1, $2) RETURNING id, family_id`,
        [userId, hashToken(refreshToken)]
      );
      return rows[0];
    },

    // "active" | "reused" (found but already rotated/revoked) | "unknown"
    async check(refreshToken) {
      const { rows } = await db.query(
        `SELECT id, user_id, family_id FROM public.refresh_sessions
         WHERE token_hash = $1`,
        [hashToken(refreshToken)]
      );
      if (rows.length === 0) return { state: "unknown" };
      const row = rows[0];
      const { rows: dead } = await db.query(
        `SELECT 1 FROM public.refresh_sessions
         WHERE token_hash = $1 AND (rotated_at IS NOT NULL OR revoked_at IS NOT NULL)`,
        [hashToken(refreshToken)]
      );
      return dead.length > 0 ? { state: "reused", ...row } : { state: "active", ...row };
    },

    // Atomically retire the old session and insert its successor in the same family.
    async rotate(sessionId, newRefreshToken) {
      const { rows } = await db.query(
        `WITH retired AS (
           UPDATE public.refresh_sessions
           SET rotated_at = now()
           WHERE id = $1 AND rotated_at IS NULL AND revoked_at IS NULL
           RETURNING user_id, family_id
         )
         INSERT INTO public.refresh_sessions (user_id, family_id, token_hash)
         SELECT user_id, family_id, $2 FROM retired
         RETURNING id, family_id`,
        [sessionId, hashToken(newRefreshToken)]
      );
      return rows[0] || null;
    },

    async revokeFamily(familyId) {
      await db.query(
        `UPDATE public.refresh_sessions SET revoked_at = now()
         WHERE family_id = $1 AND revoked_at IS NULL`,
        [familyId]
      );
    },

    async revokeByToken(refreshToken) {
      await db.query(
        `UPDATE public.refresh_sessions SET revoked_at = now()
         WHERE family_id = (SELECT family_id FROM public.refresh_sessions WHERE token_hash = $1)
           AND revoked_at IS NULL`,
        [hashToken(refreshToken)]
      );
    },
  };
}

module.exports = { createPgTokenStore, hashToken };
