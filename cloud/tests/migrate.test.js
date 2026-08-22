/* Migration runner unit tests — parsing only; DB behavior proven in CI job. */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { splitUpDown, uncommentDown } = require("../scripts/migrate");

test("splitUpDown separates sections on the DOWN marker", () => {
  const { up, down } = splitUpDown(
    "CREATE TABLE a(id int);\n\n-- ============ DOWN (run to roll back) ============\n-- DROP TABLE IF EXISTS a CASCADE;\n"
  );
  assert.equal(up, "CREATE TABLE a(id int);");
  assert.match(down, /DROP TABLE/);
});

test("uncommentDown strips comment prefixes but keeps SQL intact", () => {
  const out = uncommentDown("-- DROP TABLE IF EXISTS a CASCADE;\n-- DROP FUNCTION b();");
  assert.equal(out, "DROP TABLE IF EXISTS a CASCADE;\nDROP FUNCTION b();");
});

test("file without marker yields up-only with null down", () => {
  const { up, down } = splitUpDown("SELECT 1;");
  assert.equal(up, "SELECT 1;");
  assert.equal(down, null);
});
