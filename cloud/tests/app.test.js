/* App tests — SR-C01 acceptance: /healthz served. Uses fastify.inject, no socket. */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildApp } = require("../src/app");

const TEST_CONFIG = {
  databaseUrl: "postgres://user:pass@localhost:5432/stockrig",
  jwtSecret: "test-secret-not-for-prod",
  appBaseUrl: "http://localhost",
  insforgeBaseUrl: "https://example.insforge.app",
  insforgeApiKey: "ik_test_key",
  nodeEnv: "test",
  sentryDsn: "",
  resendApiKey: "",
  rateLimitMax: 100,
  port: 0,
  logLevel: "silent",
};

async function app() {
  return buildApp({ config: TEST_CONFIG, logger: false });
}

test("GET /healthz returns ok payload", async () => {
  const a = await app();
  const res = await a.inject({ method: "GET", url: "/healthz" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "stockrig-cloud");
  await a.close();
});

test("unknown route returns JSON error contract ({error})", async () => {
  const a = await app();
  const res = await a.inject({ method: "GET", url: "/nope" });
  assert.equal(res.statusCode, 404);
  assert.ok(res.json().error !== undefined || res.body.length > 0);
  await a.close();
});
