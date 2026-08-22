/* SR-C06 org routes tests — role gating, invites, member management.
   Acceptance: tech hitting admin routes gets 403. */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildApp } = require("../src/app");
const crypto = require("node:crypto");

function hashToken(t) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

// currentUser token -> user mapping for three roles in one org.
const PEOPLE = {
  "tok-owner": { id: "u-owner", email: "owner@acme.co" },
  "tok-admin": { id: "u-admin", email: "admin@acme.co" },
  "tok-tech": { id: "u-tech", email: "tech@acme.co" },
  "tok-outsider": { id: "u-out", email: "newbie@x.dev" },
};

function fakeInsForge() {
  return {
    async currentUser(token) {
      const u = PEOPLE[token];
      if (!u) return { status: 401, ok: false, data: {} };
      return { status: 200, ok: true, data: { user: u } };
    },
    async signup() { return { status: 500, ok: false, data: {} }; },
    async login() { return { status: 500, ok: false, data: {} }; },
    async refresh() { return { status: 500, ok: false, data: {} }; },
    async logout() { return { status: 200, ok: true, data: {} }; },
  };
}

function fakeOrgRepo() {
  // members of org-1; invites keyed by raw token
  const state = {
    members: [
      { id: "u-owner", role: "owner" },
      { id: "u-admin", role: "admin" },
      { id: "u-tech", role: "tech" },
    ],
    invites: new Map(), // token -> {id, email, role, pending}
    sentEmails: [],
    nextId: 0,
  };
  return {
    state,
    async listMembers(orgId) {
      return state.members.map((m) => ({ id: m.id, role: m.role }));
    },
    async getMember(orgId, userId) {
      return state.members.find((m) => m.id === userId) || null;
    },
    async removeMember(orgId, userId) {
      const i = state.members.findIndex((m) => m.id === userId);
      if (i === -1) return false;
      state.members.splice(i, 1);
      return true;
    },
    async setRole(orgId, userId, role) {
      const m = state.members.find((m) => m.id === userId);
      if (!m) return null;
      m.role = role;
      return { user_id: userId, role };
    },
    async createInvite({ email, role, tokenHash }) {
      const id = `inv${++state.nextId}`;
      // store under the hash we were given — route passes hashToken(raw)
      state.invites.set(tokenHash, { id, email, role, pending: true });
      return { id };
    },
    async findInviteByToken(th) {
      const inv = state.invites.get(th);
      if (!inv || !inv.pending) return null;
      return { id: inv.id, org_id: "org-1", email: inv.email, role: inv.role };
    },
    async acceptInvite(inviteId, userId) {
      for (const inv of state.invites.values()) {
        if (inv.id === inviteId && inv.pending) {
          inv.pending = false;
          state.members.push({ id: userId, role: inv.role });
          return { orgId: "org-1", role: inv.role };
        }
      }
      return null;
    },
  };
}

async function appWith({ withResend = true } = {}) {
  const insforge = fakeInsForge();
  const orgRepo = fakeOrgRepo();
  const sentEmails = [];
  const resend = withResend
    ? async (mail) => {
        sentEmails.push(mail);
        return { status: 200, ok: true, data: { id: "e1" } };
      }
    : null;
  const db = { query: async () => ({ rows: [] }), connect: async () => { throw new Error("not used"); } };

  const memberships = new Map([
    ["u-owner", [{ org_id: "org-1", org_name: "Acme", role: "owner" }]],
    ["u-admin", [{ org_id: "org-1", org_name: "Acme", role: "admin" }]],
    ["u-tech", [{ org_id: "org-1", org_name: "Acme", role: "tech" }]],
  ]);
  const findMembershipByUser = async (_db, userId) => (memberships.get(userId) || [null])[0];

  const app = await buildApp({
    config: {
      logLevel: "silent", insforgeBaseUrl: "https://x", insforgeApiKey: "k",
      databaseUrl: "postgres://x", appBaseUrl: "http://localhost:3000",
    },
    logger: false,
    insforge,
    db,
    orgRepo,
    resend,
    tokenStore: { issue: async () => {}, check: async () => ({ state: "unknown" }), rotate: async () => null, revokeFamily: async () => {}, revokeByToken: async () => {} },
    provisionShop: async () => {},
    findMembershipByUser,
  });
  return { app, orgRepo, sentEmails };
}

test("ACCEPTANCE: tech is blocked from admin routes with 403", async () => {
  const { app } = await appWith();
  const invite = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-tech" },
    payload: { email: "someone@x.dev", role: "tech" },
  });
  assert.equal(invite.statusCode, 403);
  assert.equal(invite.json().error, "insufficient permissions");

  const remove = await app.inject({
    method: "DELETE", url: "/v1/org/members/u-admin",
    headers: { authorization: "Bearer tok-tech" },
  });
  assert.equal(remove.statusCode, 403);

  const setRole = await app.inject({
    method: "PATCH", url: "/v1/org/members/u-tech/role",
    headers: { authorization: "Bearer tok-tech" },
    payload: { role: "admin" },
  });
  assert.equal(setRole.statusCode, 403);
  await app.close();
});

test("no token at all is 401 before any role check", async () => {
  const { app } = await appWith();
  const res = await app.inject({ method: "GET", url: "/v1/org/members" });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test("owner creates invite: hashed token stored, email sent via Resend adapter", async () => {
  const { app, orgRepo, sentEmails } = await appWith();
  const res = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-owner" },
    payload: { email: "Marcus@VanLife.co", role: "tech" },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().emailed, true);
  assert.match(res.json().acceptUrl, /^http:\/\/localhost:3000\/invite\/[0-9a-f]{64}$/);
  assert.equal(orgRepo.state.invites.size, 1);
  assert.ok([...orgRepo.state.invites.keys()][0].length === 64); // sha256 hex — never raw
  assert.equal(sentEmails.length, 1);
  assert.deepEqual(sentEmails[0].to, "marcus@vanlife.co");
  await app.close();
});

test("invite without mail transport still records (emailed=false); invalid role rejected", async () => {
  const { app } = await appWith({ withResend: false });
  const noMail = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-admin" },
    payload: { email: "a@b.co", role: "tech" },
  });
  assert.equal(noMail.statusCode, 201);
  assert.equal(noMail.json().emailed, false);

  const badRole = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-admin" },
    payload: { email: "a@b.co", role: "owner" }, // ownership never via invite
  });
  assert.equal(badRole.statusCode, 400);

  const badEmail = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-admin" },
    payload: { email: "nope", role: "tech" },
  });
  assert.equal(badEmail.statusCode, 400);
  await app.close();
});

test("accept: right email joins with invited role; wrong email 403; replay 410", async () => {
  const { app, orgRepo } = await appWith();
  const created = await app.inject({
    method: "POST", url: "/v1/org/invites",
    headers: { authorization: "Bearer tok-owner" },
    payload: { email: "newbie@x.dev", role: "tech" },
  });
  const acceptUrl = created.json().acceptUrl;
  const token = acceptUrl.split("/invite/")[1];

  // Wrong account tries to steal it.
  const wrong = await app.inject({
    method: "POST", url: "/v1/org/invites/accept",
    headers: { authorization: "Bearer tok-tech" },
    payload: { token },
  });
  assert.equal(wrong.statusCode, 403);

  // Intended user accepts.
  const ok = await app.inject({
    method: "POST", url: "/v1/org/invites/accept",
    headers: { authorization: "Bearer tok-outsider" },
    payload: { token },
  });
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(ok.json(), { org: { id: "org-1" }, role: "tech" });
  assert.equal(orgRepo.state.members.some((m) => m.id === "u-out" && m.role === "tech"), true);

  // Replay dies.
  const again = await app.inject({
    method: "POST", url: "/v1/org/invites/accept",
    headers: { authorization: "Bearer tok-outsider" },
    payload: { token },
  });
  assert.equal(again.statusCode, 410);
  await app.close();
});

test("member removal: owner/admin allowed, owner target protected, self-removal blocked", async () => {
  const { app } = await appWith();
  let r = await app.inject({ method: "DELETE", url: "/v1/org/members/u-tech", headers: { authorization: "Bearer tok-admin" } });
  assert.equal(r.statusCode, 200);

  r = await app.inject({ method: "DELETE", url: "/v1/org/members/u-owner", headers: { authorization: "Bearer tok-admin" } });
  assert.equal(r.statusCode, 403);
  assert.match(r.json().error, /owners cannot be removed/);

  r = await app.inject({ method: "DELETE", url: "/v1/org/members/u-owner", headers: { authorization: "Bearer tok-owner" } });
  assert.equal(r.statusCode, 400);
  assert.match(r.json().error, /cannot remove yourself/);

  r = await app.inject({ method: "DELETE", url: "/v1/org/members/u-ghost", headers: { authorization: "Bearer tok-owner" } });
  assert.equal(r.statusCode, 404);
  await app.close();
});

test("role change is owner-only and validates role values", async () => {
  const { app } = await appWith();
  let r = await app.inject({
    method: "PATCH", url: "/v1/org/members/u-tech/role",
    headers: { authorization: "Bearer tok-admin" }, payload: { role: "admin" },
  });
  assert.equal(r.statusCode, 403); // admins cannot grant admin

  r = await app.inject({
    method: "PATCH", url: "/v1/org/members/u-tech/role",
    headers: { authorization: "Bearer tok-owner" }, payload: { role: "boss" },
  });
  assert.equal(r.statusCode, 400);

  r = await app.inject({
    method: "PATCH", url: "/v1/org/members/u-tech/role",
    headers: { authorization: "Bearer tok-owner" }, payload: { role: "admin" },
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().role, "admin");
  await app.close();
});

