/* Auth routes — SR-C04: signup/login/refresh/logout on InsForge-managed identity.
   InsForge owns credential storage (argon2id inside); we own tenancy rows and
   strict refresh-token rotation (InsForge tolerates replayed refresh tokens —
   verified live — so single-use enforcement is ours). */
"use strict";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_REFRESH = "invalid or expired refresh token";

async function authRoutes(app, { insforge, db, tokenStore }) {
  app.post("/v1/auth/signup", async (req, reply) => {
    const { email, password, shopName, name } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email))) {
      return reply.code(400).send({ error: "valid email is required" });
    }
    if (!password || String(password).length < 6) {
      return reply.code(400).send({ error: "password must be at least 6 characters" });
    }
    if (!shopName || !String(shopName).trim()) {
      return reply.code(400).send({ error: "shopName is required" });
    }

    const r = await insforge.signup(String(email).trim().toLowerCase(), password, name);
    if (!r.ok) {
      if (r.status === 409) return reply.code(409).send({ error: "an account with this email already exists" });
      if (r.status === 400) return reply.code(400).send({ error: r.data.message || "invalid signup" });
      req.log.error({ status: r.status }, "insforge signup failed");
      return reply.code(502).send({ error: "signup upstream failure" });
    }

    const { user, accessToken, refreshToken } = r.data;
    try {
      await app.provisionShop({ userId: user.id, shopName: String(shopName).trim(), userEmail: user.email });
      if (refreshToken) await tokenStore.issue(user.id, refreshToken);
    } catch (err) {
      // Auth row exists but tenancy/session recording failed — loud, not silent.
      req.log.error({ err, userId: user.id }, "workspace provisioning failed after signup");
      return reply.code(500).send({ error: "workspace provisioning failed; contact support" });
    }

    const membership = await app.findMembershipByUser(db, user.id);
    return reply.code(201).send({
      user: { id: user.id, email: user.email },
      org: membership ? { id: membership.org_id, name: membership.org_name, role: membership.role } : null,
      ...(accessToken ? { accessToken } : {}),
      ...(refreshToken ? { refreshToken } : {}),
      requireEmailVerification: !accessToken,
    });
  });

  app.post("/v1/auth/login", async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password) return reply.code(400).send({ error: "email and password are required" });

    const r = await insforge.login(String(email).trim().toLowerCase(), password);
    if (!r.ok) {
      if (r.status === 401) return reply.code(401).send({ error: "invalid email or password" });
      if (r.status === 403) return reply.code(403).send({ error: "email not verified" });
      req.log.error({ status: r.status }, "insforge login failed");
      return reply.code(502).send({ error: "login upstream failure" });
    }

    const { user, accessToken, refreshToken } = r.data;
    try {
      if (refreshToken) await tokenStore.issue(user.id, refreshToken);
    } catch (err) {
      req.log.error({ err, userId: user.id }, "session recording failed after login");
      return reply.code(500).send({ error: "session persistence failed; try again" });
    }

    const membership = await app.findMembershipByUser(db, user.id);
    return reply.send({
      user: { id: user.id, email: user.email },
      org: membership ? { id: membership.org_id, name: membership.org_name } : null,
      role: membership ? membership.role : null,
      accessToken,
      refreshToken,
    });
  });

  app.post("/v1/auth/refresh", async (req, reply) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return reply.code(400).send({ error: "refreshToken is required" });

    const rec = await tokenStore.check(refreshToken);
    if (rec.state === "reused") {
      // Replay of a rotated/revoked token = theft signal. Kill the whole family.
      req.log.warn({ familyId: rec.family_id }, "refresh token reuse detected; family revoked");
      await tokenStore.revokeFamily(rec.family_id);
      return reply.code(401).send({ error: INVALID_REFRESH });
    }
    if (rec.state !== "active") {
      return reply.code(401).send({ error: INVALID_REFRESH });
    }

    const r = await insforge.refresh(refreshToken);
    if (!r.ok) {
      if (r.status === 401) {
        // Upstream expired it independently — retire our record too.
        await tokenStore.revokeFamily(rec.family_id).catch(() => {});
        return reply.code(401).send({ error: INVALID_REFRESH });
      }
      req.log.error({ status: r.status }, "insforge refresh failed");
      return reply.code(502).send({ error: "refresh upstream failure" });
    }

    await tokenStore.rotate(rec.id, r.data.refreshToken);
    return reply.send({
      accessToken: r.data.accessToken,
      refreshToken: r.data.refreshToken,
    });
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      try {
        await tokenStore.revokeByToken(refreshToken);
      } catch (err) {
        req.log.error({ err }, "logout revocation failed");
        return reply.code(500).send({ error: "logout failed" });
      }
    }
    await insforge.logout();
    return reply.send({ success: true });
  });

  app.get("/v1/me", async (req, reply) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return reply.code(401).send({ error: "authorization bearer token required" });

    const r = await insforge.currentUser(token);
    if (!r.ok) return reply.code(401).send({ error: "invalid or expired token" });

    const membership = await app.findMembershipByUser(db, r.data.user.id);
    return {
      user: { id: r.data.user.id, email: r.data.user.email },
      org: membership ? { id: membership.org_id, name: membership.org_name } : null,
      role: membership ? membership.role : null,
    };
  });
}

module.exports = { authRoutes };
