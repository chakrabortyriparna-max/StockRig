/* scope helper unit tests */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertOrgId, orgPredicate } = require("../src/scope");

test("assertOrgId accepts uuids and rejects everything else", () => {
  const id = assertOrgId("6f1c2a3e-1b2c-4d5e-8f90-112233445566");
  assert.equal(id, "6f1c2a3e-1b2c-4d5e-8f90-112233445566");

  for (const bad of [undefined, null, "", "not-a-uuid", "123", {}, "6f1c2a3e-1b2c-4d5e-8f90-11223344556g"]) {
    assert.throws(() => assertOrgId(bad), /org scope/, JSON.stringify(bad));
  }
});

test("thrown scope errors carry 403 for route mapping", () => {
  try {
    assertOrgId(null);
    assert.fail("should have thrown");
  } catch (err) {
    assert.equal(err.statusCode, 403);
  }
});

test("orgPredicate emits a mandatory (never optional) filter fragment", () => {
  assert.equal(orgPredicate().sql, "org_id = $<org>");
  assert.equal(orgPredicate("p").sql, "p.org_id = $<org>");
});
