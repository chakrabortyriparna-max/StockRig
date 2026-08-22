/* Config tests — SR-C01 acceptance: fails fast on missing vars, safe defaults. */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../src/config");

const VALID_ENV = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/stockrig",
  JWT_SECRET: "test-secret-not-for-prod",
  APP_BASE_URL: "http://localhost",
  INSFORGE_BASE_URL: "https://example.insforge.app/",
  INSFORGE_API_KEY: "ik_test_key",
};

test("loadConfig throws listing every missing required var", () => {
  assert.throws(() => loadConfig({}), (err) => {
    for (const k of ["DATABASE_URL", "JWT_SECRET", "APP_BASE_URL", "INSFORGE_BASE_URL", "INSFORGE_API_KEY"]) {
      assert.match(err.message, new RegExp(k));
    }
    return true;
  });
});

test("loadConfig throws when a var is present but blank", () => {
  assert.throws(() => loadConfig({ ...VALID_ENV, JWT_SECRET: "   " }), /JWT_SECRET/);
});

test("loadConfig succeeds with all vars and applies defaults", () => {
  const c = loadConfig(VALID_ENV);
  assert.equal(c.nodeEnv, "development");
  assert.equal(c.rateLimitMax, 300);
  assert.equal(c.port, 8080);
  assert.equal(c.logLevel, "debug"); // dev default
  assert.equal(c.sentryDsn, "");
  assert.equal(c.insforgeBaseUrl, "https://example.insforge.app"); // trailing slash stripped
});

test("production env selects info log level; explicit values win", () => {
  const c = loadConfig({ ...VALID_ENV, NODE_ENV: "production" });
  assert.equal(c.logLevel, "info");

  const c2 = loadConfig({ ...VALID_ENV, PORT: "3000", RATE_LIMIT_MAX: "42", LOG_LEVEL: "warn" });
  assert.equal(c2.port, 3000);
  assert.equal(c2.rateLimitMax, 42);
  assert.equal(c2.logLevel, "warn");
});

test("returned config is frozen", () => {
  const c = loadConfig(VALID_ENV);
  assert.throws(() => { c.port = 9999; }, TypeError);
});
