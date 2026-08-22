/* Entrypoint — boots the app and listens. Config fails fast before bind. */
"use strict";

const { loadConfig } = require("./config");
const { buildApp } = require("./app");

async function main() {
  const config = loadConfig(); // throws loudly on missing vars
  const app = await buildApp({ config });

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  }
}

main();
