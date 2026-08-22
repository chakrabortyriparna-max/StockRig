/* SR-C04 auth route tests — InsForge adapter + tenancy are fakes; routes are real.
   Refresh semantics enforced by routes+tokenStore: single-use rotation,
   reuse detection kills the whole family (theft signal). */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildApp } = require("../src/app");

function createFakeInsForge() {
  const users = new Map(); // email -> {password}
  const calls = { signup: [], login: [], refresh: [], logout: [] };
  const USER = { id: "u-111", email: "dana@acme.co", createdAt: "2026-01-01T00:00:00Z" };

  return {
    calls,
    async signup(email, password) {
      calls.signup.push({ email });
      if (users.has(email)) return { status: 409, ok: false, data: { message: "exists" } };
      users.set(email, { password });
      const email2 = email;
      return {
        status: 200, ok: true,
        data: {
          user: { ...USER, email },
          accessToken: `access-for-${email}`,
          refreshToken: `rt-1-${email2}`,
        },
      };
    },
    async login(email, password) {
      calls.login.push({ email });
      const u = users.get(email);
      if (!u || u.password !== password) return { status: 401, ok: false, data: {} };
      const n = calls.login.length;
      return {
        status: 200, ok: true,
        data: {
          user: { ...USER, email },
          accessToken: `access-${email}`,
          refreshToken: `rt-login-${email}-${n}`,
        },
      };
    },
    // NOTE: like the real InsForge (verified live), upstream does NOT kill
    // rotated tokens — enforcement is our tokenStore's job.
    async refresh(refreshToken) {
      calls.refresh.push({ refreshToken });
      return { status: 200, ok: true, data: { accessToken: "access-new", refreshToken: `${refreshToken}-next` } };
    },
    async logout() {
      calls.logout.push(true);
      return { status: 200, ok: true, data: { success: true } };
    },
    async currentUser(accessToken) {
      if (accessToken === "access-valid") {
        return { status: 200, ok: true, data: { user: { id: "u-111", email: "dana@acme.co" } } };
      }
      return { status: 401, ok: false, data: {} };
    },
  };
}

function fakeTokenStore() {
  const sessions = new Map(); // raw token -> record
  let n = 0;
  return {
    sessions,
    async issue(userId, rt) {
      const s = { id: `s${++n}`, user_id: userId, family_id: `f${n}`, state: "active" };
      sessions.set(rt, s);
      return s;
    },
    async check(rt) {
      const s = sessions.get(rt);
      if (!s) return { state: "unknown" };
      const { state, ...rest } = s;
      return state === "active" ? { state: "active", ...rest } : { state: "reused", ...rest };
    },
    async rotate(sessionId, newRt) {
      for (const s of sessions.values()) {
        if (s.id === sessionId && s.state === "active") {
          s.state = "rotated";
          const next = { id: `s${++n}`, user_id: s.user_id, family_id: s.family_id, state: "active" };
          sessions.set(newRt, next);
          return next;
        }
      }
      return null;
    },
    async revokeFamily(familyId) {
      for (const s of sessions.values()) {
        if (s.family_id === familyId && s.state === "active") s.state = "revoked";
      }
    },
    async revokeByToken(rt) {
      const s = sessions.get(rt);
      if (s) await this.revokeFamily(s.family_id);
    },
  };
}

function fakeDb() {
  const memberships = new Map(); // userId -> row
  return {
    memberships,
    async query() { return { rows: [] }; },
  };
}

async function appWith(fakes = {}) {
  const insforge = fakes.insforge || createFakeInsForge();
  const db = fakes.db || fakeDb();
  const tokenStore = fakes.tokenStore || fakeTokenStore();
  const provisioned = [];
  const app = buildApp({
    config: { logLevel: "silent", insforgeBaseUrl: "https://x", insforgeApiKey: "k", databaseUrl: "postgres://x" },
    logger: false,
    insforge,
    db,
    tokenStore,
    provisionShop: async (args) => {
      provisioned.push(args);
      if (fakes.provisionFails) throw new Error("db down");
      db.memberships.set(args.userId, { org_id: "org-9", org_name: args.shopName, role: "owner" });
    },
    findMembershipByUser: async (_db, userId) => db.memberships.get(userId) || null,
  });
  return { app, insforge, db, tokenStore, provisioned };
}

const BODY = { email: "dana@acme.co", password: "secret123", shopName: "Acme HVAC" };

test("signup happy path provisions workspace atomically and returns session", async () => {
  const { app, provisioned, tokenStore } = await appWith();
  const res = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  assert.equal(res.statusCode, 201);
  const b = res.json();
  assert.equal(b.user.email, "dana@acme.co");
  assert.deepEqual(b.org, { id: "org-9", name: "Acme HVAC", role: "owner" });
  assert.ok(b.accessToken && b.refreshToken);
  assert.equal(provisioned.length, 1);
  assert.equal(provisioned[0].userId, "u-111");
  assert.equal(tokenStore.sessions.size, 1); // refresh token recorded
  await app.close();
});

test("signup validates boundary before calling upstream", async () => {
  for (const payload of [
    { ...BODY, email: "not-an-email" },
    { ...BODY, password: "12345" },
    { ...BODY, shopName: "   " },
    {},
  ]) {
    const { app, insforge } = await appWith();
    const res = await app.inject({ method: "POST", url: "/v1/auth/signup", payload });
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
    assert.ok(res.json().error);
    assert.equal(insforge.calls.signup.length, 0); // never reached upstream
    await app.close();
  }
});

test("signup duplicate email maps to 409; upstream failure surfaces 502 without provisioning", async () => {
  const { app } = await appWith();
  await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  const dup = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  assert.equal(dup.statusCode, 409);
  await app.close();

  const failing = {
    async signup() { return { status: 500, ok: false, data: {} }; },
    async login() { return { status: 500, ok: false, data: {} }; },
    async refresh() { return { status: 500, ok: false, data: {} }; },
    async logout() { return { status: 200, ok: true, data: {} }; },
    async currentUser() { return { status: 401, ok: false, data: {} }; },
  };
  const w = await appWith({ insforge: failing });
  const res = await w.app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  assert.equal(res.statusCode, 502);
  assert.equal(w.provisioned.length, 0);
  await w.app.close();
});

test("login records session and returns org + role; wrong password is 401", async () => {
  const { app, tokenStore } = await appWith();
  await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });

  const good = await app.inject({
    method: "POST", url: "/v1/auth/login",
    payload: { email: "dana@acme.co", password: "secret123" },
  });
  assert.equal(good.statusCode, 200);
  assert.equal(good.json().org.id, "org-9");
  assert.equal(good.json().role, "owner");
  assert.equal(tokenStore.sessions.size, 2); // signup rt + login rt

  const bad = await app.inject({
    method: "POST", url: "/v1/auth/login",
    payload: { email: "dana@acme.co", password: "wrong" },
  });
  assert.equal(bad.statusCode, 401);
  assert.equal(bad.json().error, "invalid email or password");
  await app.close();
});

test("refresh chain works repeatedly without replay", async () => {
  const { app } = await appWith();
  const s = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  let rt = s.json().refreshToken;

  for (let i = 0; i < 3; i++) {
    const r = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: rt } });
    assert.equal(r.statusCode, 200, `rotation ${i}`);
    const next = r.json().refreshToken;
    assert.notEqual(next, rt);
    rt = next;
  }
  await app.close();
});

test("replaying a rotated token is rejected AND revokes the whole family", async () => {
  const { app } = await appWith();
  const s = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  const rt1 = s.json().refreshToken;

  const r1 = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: rt1 } });
  assert.equal(r1.statusCode, 200);
  const rt2 = r1.json().refreshToken;

  // Theft signal: old token replayed.
  const replay = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: rt1 } });
  assert.equal(replay.statusCode, 401);

  // Family revoked — even the newest token is dead now.
  const after = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: rt2 } });
  assert.equal(after.statusCode, 401);

  // Unknown tokens never pass either.
  const unknown = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: "never-issued" } });
  assert.equal(unknown.statusCode, 401);
  await app.close();
});

test("logout revokes the session family; later refresh fails", async () => {
  const { app, insforge } = await appWith();
  const s = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: BODY });
  const rt = s.json().refreshToken;

  const out = await app.inject({ method: "POST", url: "/v1/auth/logout", payload: { refreshToken: rt } });
  assert.equal(out.statusCode, 200);
  assert.deepEqual(out.json(), { success: true });
  assert.equal(insforge.calls.logout.length, 1);

  const post = await app.inject({ method: "POST", url: "/v1/auth/refresh", payload: { refreshToken: rt } });
  assert.equal(post.statusCode, 401);
  await app.close();
});

test("/v1/me requires bearer and maps membership", async () => {
  const { app } = await appWith();
  const none = await app.inject({ method: "GET", url: "/v1/me" });
  assert.equal(none.statusCode, 401);

  const bad = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: "Bearer junk" } });
  assert.equal(bad.statusCode, 401);

  const ok = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: "Bearer access-valid" } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().role, null); // no membership seeded for this fake user
  await app.close();
});
