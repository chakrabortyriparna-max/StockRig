/* Org routes — SR-C06: members + invites, gated by role.
   AuthZ matrix (PRD §9): invites/remove = admin+; role changes = owner;
   member list = any member. Tech hitting admin routes gets 403. */
"use strict";

const crypto = require("node:crypto");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(t) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

async function orgRoutes(app, { insforge, orgRepo, resend, appBaseUrl }) {
  const { requireAuth, requireOrg, requireRole } = require("../authz").buildAuthHooks({
    insforge,
    findMembershipByUser: app.findMembershipByUser,
    db: app.db,
  });

  app.get("/v1/org/members", { preHandler: [requireAuth, requireOrg] }, async (req) => {
    const members = await orgRepo.listMembers(req.membership.orgId);
    return { members };
  });

  app.post("/v1/org/invites", { preHandler: [requireAuth, requireOrg, requireRole("owner", "admin")] }, async (req, reply) => {
    const { email, role } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email))) {
      return reply.code(400).send({ error: "valid email is required" });
    }
    if (!["admin", "tech"].includes(role)) {
      return reply.code(400).send({ error: "role must be admin or tech" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const invite = await orgRepo.createInvite({
      orgId: req.membership.orgId,
      email: String(email).trim().toLowerCase(),
      role,
      tokenHash: hashToken(token),
      invitedBy: req.authUser.id,
    });

    const acceptUrl = `${appBaseUrl}/invite/${token}`;
    let emailed = true;
    if (resend) {
      const r = await resend({
        to: String(email).trim().toLowerCase(),
        subject: `You're invited to join ${req.membership.orgName} on StockRig`,
        html: `<p>${req.authUser.email} invited you to join <strong>${req.membership.orgName}</strong> as <strong>${role}</strong>.</p><p><a href="${acceptUrl}">Accept your invite</a></p>`,
      });
      if (!r.ok) {
        emailed = false;
        req.log.error({ status: r.status }, "invite email delivery failed");
      }
    } else {
      emailed = false; // mail transport not configured
    }

    return reply.code(201).send({
      id: invite.id,
      email: String(email).trim().toLowerCase(),
      role,
      emailed,
      // Dev convenience only — remove once SPA handles /invite/:token fully.
      acceptUrl,
    });
  });

  app.post("/v1/org/invites/accept", { preHandler: [requireAuth] }, async (req, reply) => {
    const { token } = req.body || {};
    if (!token || !String(token).trim()) {
      return reply.code(400).send({ error: "token is required" });
    }
    const invite = await orgRepo.findInviteByToken(hashToken(String(token).trim()));
    if (!invite) {
      return reply.code(410).send({ error: "invite not found or already used" });
    }
    if (String(req.authUser.email || "").toLowerCase() !== invite.email) {
      return reply.code(403).send({ error: "this invite was sent to a different email" });
    }
    const result = await orgRepo.acceptInvite(invite.id, req.authUser.id);
    if (!result) {
      return reply.code(410).send({ error: "invite not found or already used" });
    }
    return reply.send({
      org: { id: result.orgId },
      role: result.role,
    });
  });

  app.delete("/v1/org/members/:userId", { preHandler: [requireAuth, requireOrg, requireRole("owner", "admin")] }, async (req, reply) => {
    const target = await orgRepo.getMember(req.membership.orgId, req.params.userId);
    if (!target) return reply.code(404).send({ error: "member not found" });
    if (target.id === req.authUser.id) {
      return reply.code(400).send({ error: "you cannot remove yourself" });
    }
    if (target.role === "owner") {
      return reply.code(403).send({ error: "owners cannot be removed; transfer ownership first" });
    }
    await orgRepo.removeMember(req.membership.orgId, req.params.userId);
    return { success: true };
  });

  app.patch("/v1/org/members/:userId/role", { preHandler: [requireAuth, requireOrg, requireRole("owner")] }, async (req, reply) => {
    const { role } = req.body || {};
    if (!["owner", "admin", "tech"].includes(role)) {
      return reply.code(400).send({ error: "role must be owner, admin, or tech" });
    }
    if (req.params.userId === req.authUser.id && role !== "owner") {
      return reply.code(400).send({ error: "transfer ownership to another member instead" });
    }
    const updated = await orgRepo.setRole(req.membership.orgId, req.params.userId, role);
    if (!updated) return reply.code(404).send({ error: "member not found" });
    return updated;
  });
}

module.exports = { orgRoutes };

