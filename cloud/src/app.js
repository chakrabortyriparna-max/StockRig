/* Fastify app factory — kept separate from server.js so tests can inject. */
"use strict";

const Fastify = require("fastify");
const { loadConfig } = require("./config");

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

  return app;
}

module.exports = { buildApp };
