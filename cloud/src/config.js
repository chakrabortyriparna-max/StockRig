/* StockRig Cloud config — fails fast on missing required vars.
   Everything else gets safe defaults. Frozen: config is read-only after boot. */
"use strict";

const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "APP_BASE_URL",
  "INSFORGE_BASE_URL",
  "INSFORGE_API_KEY",
  "RESEND_API_KEY",
];

function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((k) => !env[k] || !String(env[k]).trim());
  if (missing.length > 0) {
    throw new Error(
      `[config] Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const rateLimitMax = Number(env.RATE_LIMIT_MAX);
  const port = Number(env.PORT);

  return Object.freeze({
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    appBaseUrl: env.APP_BASE_URL,
    insforgeBaseUrl: String(env.INSFORGE_BASE_URL).replace(/\/$/, ""),
    insforgeApiKey: env.INSFORGE_API_KEY,
    resendApiKey: env.RESEND_API_KEY,
    inviteFromEmail: env.INVITE_FROM_EMAIL || "onboarding@resend.dev",
    nodeEnv: env.NODE_ENV || "development",
    sentryDsn: env.SENTRY_DSN || "",
    resendApiKey: env.RESEND_API_KEY || "",
    rateLimitMax: Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 300,
    port: Number.isFinite(port) && port > 0 ? port : 8080,
    logLevel: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
  });
}

module.exports = { loadConfig };
