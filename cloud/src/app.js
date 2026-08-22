/* Fastify app factory — kept separate from server.js so tests can inject. */
"use strict";

const Fastify = require("fastify");
const { loadConfig } = require("./config");
const { createInsForgeClient } = require("./insforge");
const { createPgTokenStore } = require("./tokenstore");
const { createPgOrgRepo } = require("./orgRepo");
const { createResendSender } = require("./resend");
const { provisionShop, findMembershipByUser } = require("./tenancy");

function buildApp(opts = {}) {
  const config = opts.config || loadConfig();

  const app = Fastify({
    logger:
      opts.logger !== undefined
        ? opts.logger
        : { level: config.logLevel },
    // JSON-error contract preserved from v1.2: { error } shape
    errorHandler: (error, request, reply) => {
      const statusCode = error.statusCode || 500;
      if (statusCode >= 500) {
        request.log.error({ err: error }, "unhandled error");
        reply.code(statusCode).send({ error: "internal error" });
      } else {
        reply.code(statusCode).send({ error: error.message });
      }
    },
  });

  app.get("/healthz", async () => ({
    ok: true,
    service: "stockrig-cloud",
    version: "0.1.0",
  }));

  app.decorate("config", config);

  // Dependencies — overridable for tests; real instances otherwise.
  const insforge =
    opts.insforge ||
    createInsForgeClient({
      baseUrl: config.insforgeBaseUrl,
      apiKey: config.insforgeApiKey,
    });
  const { Pool } = require("pg");
  const db = opts.db || new Pool({ connectionString: config.databaseUrl, max: 10 });
  const tokenStore = opts.tokenStore || createPgTokenStore(db);
  if (!opts.db) {
    app.addHook("onClose", () => db.end());
  }

  app.decorate("insforge", insforge);
  app.decorate("db", db);
  app.decorate("tokenStore", tokenStore);
  app.decorate("provisionShop", opts.provisionShop || provisionShop);
  app.decorate("findMembershipByUser", opts.findMembershipByUser || findMembershipByUser);

  const orgRepo = opts.orgRepo || createPgOrgRepo(db);
  const resend =
    opts.resend !== undefined
      ? opts.resend
      : config.resendApiKey
        ? createResendSender({
            apiKey: config.resendApiKey,
            fromEmail: config.inviteFromEmail,
          })
        : null;

  // Routes
  const { authRoutes } = require("./routes/auth");
  app.register(authRoutes, { insforge, db, tokenStore });
  app.register(require("./routes/org").orgRoutes, {
    insforge,
    orgRepo,
    resend,
    appBaseUrl: config.appBaseUrl,
  });

  return app;
}

module.exports = { buildApp };
