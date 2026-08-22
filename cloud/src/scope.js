/* Org-scope guard — SR-C07.
   Every business query must carry a validated org_id. Centralized here so
   Phase 2 repositories inherit the discipline instead of re-deciding it. */
"use strict";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertOrgId(orgId) {
  if (!orgId || typeof orgId !== "string" || !UUID_RE.test(orgId)) {
    const err = new Error("valid org scope is required");
    err.statusCode = 403;
    throw err;
  }
  return orgId;
}

// Standard predicate fragment for business queries: AND org match is mandatory,
// never optional — a missing filter fails loudly instead of leaking rows.
function orgPredicate(alias = "") {
  const col = alias ? `${alias}.org_id` : "org_id";
  return { sql: `${col} = $<org>`, placeholder: "$<org>" };
}

module.exports = { assertOrgId, orgPredicate };
