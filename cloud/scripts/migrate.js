/* StockRig Cloud migration runner — SR-C03.
   Usage: node scripts/migrate.js up|down [001_init.sql]
   Up sections are idempotent (CREATE ... IF NOT EXISTS). Down sections are
   stored as "-- "-commented SQL below the ==== DOWN ==== marker and executed
   after stripping the comment prefix. No tracking table: idempotency by design. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MARKER = /^--\s*=+\s*DOWN.*$/im;

function splitUpDown(sql) {
  const m = sql.match(MARKER);
  if (!m) return { up: sql.trim(), down: null };
  const lineEnd = m.index + m[0].length;
  return {
    up: sql.slice(0, m.index).trim(),
    down: sql.slice(lineEnd).trim(),
  };
}

// Down blocks are written as commented-out statements; uncomment them.
function uncommentDown(downSql) {
  return downSql
    .split("\n")
    .map((l) => l.replace(/^\s*--\s?/, ""))
    .join("\n")
    .trim();
}

async function apply(client, direction, file) {
  const raw = fs.readFileSync(file, "utf8");
  const { up, down } = splitUpDown(raw);

  if (direction === "up") {
    await client.query(up);
    console.log(`[migrate] up   OK: ${path.basename(file)}`);
    return;
  }
  if (direction === "down") {
    if (!down) throw new Error(`no DOWN section in ${file}`);
    await client.query(uncommentDown(down));
    console.log(`[migrate] down OK: ${path.basename(file)}`);
    return;
  }
  throw new Error(`unknown direction: ${direction} (use up|down)`);
}

async function main() {
  const [direction, fileName] = process.argv.slice(2);
  if (!["up", "down"].includes(direction)) {
    console.error("usage: node scripts/migrate.js up|down [migration-file]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[migrate] DATABASE_URL is not set");
    process.exit(1);
  }

  // Lazy require so tests can import this module without pg installed.
  const { Client } = require("pg");
  const dir = path.join(__dirname, "..", "migrations");
  let files = fileName
    ? [path.resolve(fileName)]
    : fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
        .map((f) => path.join(dir, f));
  if (files.length === 0) throw new Error("no migration files found");
  // Down must unwind in reverse order (dependencies).
  if (direction === "down") files = files.reverse();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const f of files) await apply(client, direction, f);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[migrate] FAILED: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { splitUpDown, uncommentDown };
