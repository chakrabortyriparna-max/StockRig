/* StockRig API tests — node:test, zero dependencies.
   Run: cd product && node --test tests/ */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

process.env.STOCKRIG_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "stockrig-test-"));
const { server } = require("../server.js");

let base = "";

before(async () => {
  await new Promise(res => server.listen(0, "127.0.0.1", res));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(() => new Promise(res => server.close(res)));

function req(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = http.request(base + p, {
      method,
      headers: {
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, res => {
      let buf = "";
      res.on("data", c => (buf += c));
      res.on("end", () => {
        let j = null;
        try { j = JSON.parse(buf); } catch {}
        resolve({ status: res.statusCode, json: j });
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const CONFIRM_SEED = { "x-confirm": "REPLACE-ALL-DATA" };

async function seededState() {
  const r = await req("POST", "/api/demo/seed", null, CONFIRM_SEED);
  assert.equal(r.status, 200);
  return (await req("GET", "/api/state")).json;
}

test("seed requires X-Confirm header", async () => {
  const r = await req("POST", "/api/demo/seed");
  assert.equal(r.status, 400);
});

test("part edit happy path + duplicate number rejected case-insensitively excluding self", async () => {
  const db = await seededState();
  const part = db.parts[0], other = db.parts[1];
  let r = await req("PATCH", `/api/parts/${part.id}`, { name: "Renamed cap", cost: "9.5" });
  assert.equal(r.status, 200);
  assert.equal(r.json.name, "Renamed cap");
  assert.equal(r.json.cost, 9.5);
  // duplicate of ANOTHER part, case-insensitive -> 400
  r = await req("PATCH", `/api/parts/${part.id}`, { number: other.number.toLowerCase() });
  assert.equal(r.status, 400);
  // own number unchanged is fine
  r = await req("PATCH", `/api/parts/${part.id}`, { number: part.number });
  assert.equal(r.status, 200);
  // unknown id
  r = await req("PATCH", "/api/parts/99999", { name: "ghost" });
  assert.equal(r.status, 404);
});

test("part delete requires X-Confirm and purges stock/pars keys but keeps usage snapshots", async () => {
  const db = await seededState();
  const van = db.locations.find(l => l.kind === "van");
  const part = db.parts[2];
  // create a usage row for this part so we can verify snapshot stamping
  let r = await req("POST", "/api/stock/use", { locationId: van.id, partId: part.id, qty: 1, job: "J-900" });
  assert.equal(r.status, 201);
  const usageId = r.json.id;
  assert.ok(r.json.partSnap && r.json.partSnap.length > 0, "new usage rows carry partSnap");

  r = await req("DELETE", `/api/parts/${part.id}`); // no confirm
  assert.equal(r.status, 400);

  r = await req("DELETE", `/api/parts/${part.id}`, null, { "x-confirm": "DELETE-PART" });
  assert.equal(r.status, 200);

  const after = (await req("GET", "/api/state")).json;
  assert.ok(!after.parts.some(p => p.id === part.id), "part removed from catalog");
  assert.ok(!Object.keys(after.stock).some(k => k.endsWith(":" + part.id)), "no orphan stock keys");
  assert.ok(!Object.keys(after.pars).some(k => k.endsWith(":" + part.id)), "no orphan par keys");
  const u = after.usage.find(x => x.id === usageId);
  assert.ok(u, "usage history preserved");
  assert.ok(u.partSnap.includes(part.number), "historical row stamped with snapshot");
});

test("location delete transfers stock to shop; last location refused", async () => {
  const db = await seededState();
  const shop = db.locations.find(l => l.kind === "shop");
  const vans = db.locations.filter(l => l.kind === "van");
  const van = vans[0];
  const somePart = db.parts[0];

  // refuse when only one location would remain? there are 3 here; delete both vans then try again
  let r = await req("DELETE", `/api/locations/${van.id}`, null, { "x-confirm": "DELETE-LOCATION" });
  assert.equal(r.status, 200);
  let after = (await req("GET", "/api/state")).json;
  // units that lived on the deleted van must now live on the shop
  const movedQty = after.stock[`${shop.id}:${somePart.id}`] || 0;
  assert.ok(movedQty > 0, "stock transferred to shop, not destroyed");

  // delete remaining van -> still fine (shop remains)
  const van2 = after.locations.find(l => l.kind === "van");
  r = await req("DELETE", `/api/locations/${van2.id}`, null, { "x-confirm": "DELETE-LOCATION" });
  assert.equal(r.status, 200);

  // now only shop remains -> refused
  after = (await req("GET", "/api/state")).json;
  r = await req("DELETE", `/api/locations/${after.locations[0].id}`, null, { "x-confirm": "DELETE-LOCATION" });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /last location/);
});

test("unbilled usage delete restores quantity; billed rows immutable", async () => {
  const db = await seededState();
  const van = db.locations.find(l => l.kind === "van");
  const part = db.parts[1]; // plenty in stock
  const before = db.stock[`${van.id}:${part.id}`] || 0;

  let r = await req("POST", "/api/stock/use", { locationId: van.id, partId: part.id, qty: 2, job: "J-901" });
  assert.equal(r.status, 201);
  const uid = r.json.id;
  let live = (await req("GET", "/api/state")).json;
  assert.equal(live.stock[`${van.id}:${part.id}`], before - 2);

  // billed -> immutability
  r = await req("POST", "/api/usage/mark-billed", { ids: [uid] });
  assert.equal(r.status, 200);
  r = await req("DELETE", `/api/usage/${uid}`, null, { "x-confirm": "DELETE-USAGE" });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /immutable/);
  r = await req("PATCH", `/api/usage/${uid}`, { job: "J-HACK" });
  assert.equal(r.status, 409);

  // unbilled row: edit then undo
  r = await req("POST", "/api/stock/use", { locationId: van.id, partId: part.id, qty: 1, job: "J-902" });
  const uid2 = r.json.id;
  r = await req("PATCH", `/api/usage/${uid2}`, { job: "J-902-FIXED" });
  assert.equal(r.status, 200);
  assert.equal(r.json.job, "J-902-FIXED");

  r = await req("DELETE", `/api/usage/${uid2}`); // no confirm
  assert.equal(r.status, 400);
  r = await req("DELETE", `/api/usage/${uid2}`, null, { "x-confirm": "DELETE-USAGE" });
  assert.equal(r.status, 200);
  const state = (await req("GET", "/api/state")).json;
  assert.equal(state.stock[`${van.id}:${part.id}`], before - 2, "undo restored exactly the used qty");
  assert.ok(!state.usage.some(u => u.id === uid2), "row removed");
});

test("validation guards hold across new endpoints", async () => {
  const db = await seededState();
  let r = await req("PATCH", "/api/parts/99999", { name: "x" });
  assert.equal(r.status, 404);
  r = await req("DELETE", "/api/locations/99999", null, { "x-confirm": "DELETE-LOCATION" });
  assert.equal(r.status, 404);
  r = await req("DELETE", "/api/usage/99999", null, { "x-confirm": "DELETE-USAGE" });
  assert.equal(r.status, 404);
});
