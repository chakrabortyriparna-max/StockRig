/* AuthZ middleware — SR-C06/SR-C07 foundation.
   requireAuth:    verifies bearer via InsForge; membership attached if present.
   requireOrg:     demands an organization membership (any role).
   requireRole:    demands membership with one of the given roles.
   Split deliberately: invited newcomers authenticate before they belong anywhere. */
"use strict";

function buildAuthHooks({ insforge, findMembershipByUser, db }) {
  async function requireAuth(request, reply) {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      reply.code(401).send({ error: "authorization bearer token required" });
      return;
    }
    const r = await insforge.currentUser(token);
    if (!r.ok) {
      reply.code(401).send({ error: "invalid or expired token" });
      return;
    }
    request.authUser = r.data.user;
    const membership = await findMembershipByUser(db, request.authUser.id);
    request.membership = membership
      ? { orgId: membership.org_id, orgName: membership.org_name, role: membership.role }
      : null;
  }

  async function requireOrg(request, reply) {
    if (!request.membership) {
      reply.code(403).send({ error: "no organization membership" });
    }
  }

  function requireRole(...allowed) {
    return async function requireRole(request, reply) {
      if (!request.membership || !allowed.includes(request.membership.role)) {
        reply.code(403).send({ error: "insufficient permissions" });
      }
    };
  }

  return { requireAuth, requireOrg, requireRole };
}

module.exports = { buildAuthHooks };
