#!/usr/bin/env node
/* StockRig v1.2 — zero-dependency local server. Node >=18. Run: node server.js */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4242;
const HOST = "127.0.0.1"; // never exposed beyond this machine without auth
const PUBLIC = path.join(__dirname, "public");
const DATA_DIR = process.env.STOCKRIG_DATA_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function emptyDb() {
  return { seq: 1, locations: [], parts: [], stock: {}, usage: [], pars: {} };
}
// Fail LOUD on corruption - never silently wipe a shop's books.
function loadDb() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!parsed.pars) parsed.pars = {};
    if (!parsed.usage) parsed.usage = [];
    return parsed;
  } catch (e) {
    if (e.code === "ENOENT") return emptyDb();
    console.error("DATABASE CORRUPT OR UNREADABLE:", e.message);
    console.error("Backups kept in data/backups/. Not resetting data.");
    process.exit(1);
  }
}
let backupCount = 0;
function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const bkDir = path.join(DATA_DIR, "backups");
  fs.mkdirSync(bkDir, { recursive: true });
  // rotate a few backups before each write (atomic-ish: tmp -> rename)
  if (fs.existsSync(DB_PATH)) {
    try { fs.copyFileSync(DB_PATH, path.join(bkDir, `db.${backupCount++ % 10}.bak`)); } catch {}
  }
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_PATH);
}
let db = loadDb();
const uid = () => db.seq++;

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
function csvEsc(v) {
  let s = String(v ?? "");
  // neutralize spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

const DEFAULT_MIN = loc => (loc.kind === "van" ? 4 : 8);
function parOf(locId, partId) {
  const loc = db.locations.find(l => l.id === locId);
  const k = locId + ":" + partId;
  return (db.pars && db.pars[k]) || DEFAULT_MIN(loc) ;
}

function qty(locId, partId) { return db.stock[locId + ":" + partId] || 0; }
function setQty(locId, partId, v) { db.stock[locId + ":" + partId] = Math.max(0, v); }

function restockList() {
  return db.locations.map(loc => ({
    location: loc,
    items: db.parts.map(p => {
      const have = qty(loc.id, p.id);
      const min = parOf(loc.id, p.id);
      return { part: p, have, min, shortBy: Math.max(0, min - have), orderTo: min * 2 };
    })
      .filter(r => r.shortBy > 0),
  })).filter(g => g.items.length);
}

function readBody(req, capBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let b = ""; let size = 0;
    req.on("data", c => { size += c.length; if (size > capBytes) { reject(new Error("body too large")); req.destroy(); } else b += c; });
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
// --- validation helpers ---
const posInt = q => Number.isInteger(+q) && +q > 0 && +q < 100000;
const knownLoc = id => db.locations.some(l => l.id === +id);
const knownPart = id => db.parts.some(p => p.id === +id);

function seedDemo() {
  db = emptyDb();
  const shop = { id: uid(), name: "Shop / Warehouse", kind: "shop" };
  const vans = [
    { id: uid(), name: "Van 12 — Reyes", kind: "van", tech: "M. Reyes" },
    { id: uid(), name: "Van 07 — Okafor", kind: "van", tech: "T. Okafor" },
  ];
  db.locations.push(shop, ...vans);
  const catalog = [
    ["CAP-45-5", "Run capacitor 45/5 µF 370V", "HVAC", 8.4, 34],
    ["CAP-35-5", "Run capacitor 35/5 µF 370V", "HVAC", 7.9, 32],
    ["CONT-30", "Contactor 30A 24V coil", "HVAC", 11.2, 46],
    ["TSTAT-P", "Programmable thermostat", "HVAC", 22.0, 89],
    ["FUSE-TD", "Time-delay fuse 15A", "Electrical", 2.1, 9],
    ["WHIP-6", '6 ft AC whip 3/4"', "Electrical", 13.5, 52],
    ["PVC-34-10", '3/4" PVC conduit 10ft', "Electrical", 6.8, 26],
    ["BALL-34", '3/4" brass ball valve', "Plumbing", 9.75, 39],
    ["FRZ-34", '3/4" FIP x sweat adapter', "Plumbing", 3.4, 14],
    ["WAX-RING", "Wax ring w/ sleeve", "Plumbing", 2.9, 12],
    ["PTrap-15", '1-1/2" P-trap kit', "Plumbing", 5.6, 23],
    ["SRV-34", "Gas ball valve 3/4\"", "Plumbing", 12.4, 49],
  ];
  const pars = { van: [6, 4, 4, 2, 10, 2, 4, 4, 6, 6, 4, 2], shop: [20, 20, 15, 8, 40, 8, 12, 12, 15, 15, 12, 8] };
  catalog.forEach((c, i) => {
    const p = { id: uid(), number: c[0], name: c[1], category: c[2], cost: c[3], price: c[4] };
    db.parts.push(p);
    db.pars[vans[0].id + ":" + p.id] = pars.van[i];
    db.pars[shop.id + ":" + p.id] = pars.shop[i];
    setQty(vans[0].id, p.id, i === 0 ? 1 : Math.max(0, pars.van[i] - (i % 3)));
    setQty(vans[1].id, p.id, Math.max(0, pars.van[i] - (i % 2)));
    setQty(shop.id, p.id, pars.shop[i]);
  });
  const cap = db.parts[0];
  db.usage.push({
    id: uid(), date: new Date(Date.now() - 864e5 * 2).toISOString().slice(0, 10),
    locationId: vans[0].id, partId: cap.id, qtyUsed: 2, job: "J-1041", billed: false,
    partSnap: `${cap.number} — ${cap.name}`, locSnap: vans[0].name,
  });
  saveDb(db);
}

/* ---- referential cleanup helpers (v1.2) ---- */
function purgePartKeys(partId) {
  for (const k of Object.keys(db.stock)) if (k.endsWith(":" + partId)) delete db.stock[k];
  for (const k of Object.keys(db.pars)) if (k.endsWith(":" + partId)) delete db.pars[k];
}
function purgeLocationKeys(locId) {
  for (const k of Object.keys(db.stock)) if (k.startsWith(locId + ":")) delete db.stock[k];
  for (const k of Object.keys(db.pars)) if (k.startsWith(locId + ":")) delete db.pars[k];
}
function findShop() {
  return db.locations.find(l => l.kind === "shop") ||
    (db.locations.push({ id: uid(), name: "Shop / Warehouse", kind: "shop", tech: "" }), db.locations[db.locations.length - 1]);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (!p.startsWith("/api/")) {
      let file = path.normalize(path.join(PUBLIC, p === "/" ? "index.html" : p));
      if (!file.startsWith(PUBLIC)) { json(res, 403, { error: "forbidden" }); return; }
      if (!fs.existsSync(file)) { json(res, 404, { error: "not found" }); return; }
      const ext = path.extname(file);
      const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".csv": "text/csv" }[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(fs.readFileSync(file));
      return;
    }

    if (req.method === "GET" && p === "/api/state") { json(res, 200, db); return; }

    // destructive: requires explicit confirm token AND confirmation query
    if (p === "/api/demo/seed") {
      if (req.headers["x-confirm"] !== "REPLACE-ALL-DATA") { json(res, 400, { error: "must send X-Confirm: REPLACE-ALL-DATA" }); return; }
      seedDemo(); json(res, 200, { ok: true }); return;
    }

    if (req.method === "POST" && p === "/api/parts") {
      const b = await readBody(req);
      if (!b.number || !b.name) { json(res, 400, { error: "number and name required" }); return; }
      if (db.parts.some(x => x.number.toLowerCase() === String(b.number).toLowerCase())) { json(res, 400, { error: "part number already exists" }); return; }
      const part = { id: uid(), number: b.number, name: b.name, category: b.category || "General", cost: +b.cost || 0, price: +b.price || 0 };
      db.parts.push(part); saveDb(db); json(res, 201, part); return;
    }

    /* ---- v1.2: part edit/delete ---- */
    const pm = p.match(/^\/api\/parts\/(\d+)$/);
    if (pm) {
      const part = db.parts.find(x => x.id === +pm[1]);
      if (!part) { json(res, 404, { error: "part not found" }); return; }
      if (req.method === "PATCH") {
        const b = await readBody(req);
        if (b.number !== undefined && !String(b.number).trim()) { json(res, 400, { error: "number cannot be empty" }); return; }
        if (b.number !== undefined && db.parts.some(x => x.id !== part.id && x.number.toLowerCase() === String(b.number).toLowerCase())) {
          json(res, 400, { error: "part number already exists" }); return;
        }
        if (b.number !== undefined) part.number = b.number;
        if (b.name !== undefined) part.name = b.name;
        if (b.category !== undefined) part.category = b.category;
        if (b.cost !== undefined) part.cost = +b.cost || 0;
        if (b.price !== undefined) part.price = +b.price || 0;
        saveDb(db); json(res, 200, part); return;
      }
      if (req.method === "DELETE") {
        if (req.headers["x-confirm"] !== "DELETE-PART") { json(res, 400, { error: "must send X-Confirm: DELETE-PART" }); return; }
        purgePartKeys(part.id);
        db.usage.forEach(u => { if (u.partId === part.id && !u.partSnap) u.partSnap = `${part.number} — ${part.name}`; });
        db.parts = db.parts.filter(x => x.id !== part.id);
        saveDb(db); json(res, 200, { ok: true }); return;
      }
    }

    /* ---- v1.2: location edit/delete ---- */
    const lm = p.match(/^\/api\/locations\/(\d+)$/);
    if (lm) {
      const loc = db.locations.find(x => x.id === +lm[1]);
      if (!loc) { json(res, 404, { error: "location not found" }); return; }
      if (req.method === "PATCH") {
        const b = await readBody(req);
        if (b.name !== undefined && !String(b.name).trim()) { json(res, 400, { error: "name cannot be empty" }); return; }
        if (b.name !== undefined) loc.name = b.name;
        if (b.tech !== undefined) loc.tech = b.tech;
        saveDb(db); json(res, 200, loc); return;
      }
      if (req.method === "DELETE") {
        if (req.headers["x-confirm"] !== "DELETE-LOCATION") { json(res, 400, { error: "must send X-Confirm: DELETE-LOCATION" }); return; }
        if (db.locations.length <= 1) { json(res, 400, { error: "cannot delete the last location" }); return; }
        const shop = findShop();
        const target = loc.id === shop.id ? db.locations.find(l => l.id !== loc.id) : shop;
        db.parts.forEach(pt => { const q = qty(loc.id, pt.id); if (q > 0) setQty(target.id, pt.id, qty(target.id, pt.id) + q); });
        purgeLocationKeys(loc.id);
        db.usage.forEach(u => { if (u.locationId === loc.id && !u.locSnap) u.locSnap = loc.name; });
        db.locations = db.locations.filter(x => x.id !== loc.id);
        saveDb(db); json(res, 200, { ok: true, stockMovedTo: target.id }); return;
      }
    }

    if (req.method === "POST" && p === "/api/pars") {
      const b = await readBody(req);
      if (!knownLoc(b.locationId) || !knownPart(b.partId)) { json(res, 400, { error: "unknown location/part" }); return; }
      if (!(posInt(b.min) || +b.min === 0)) { json(res, 400, { error: "min must be >= 0" }); return; }
      db.pars[b.locationId + ":" + b.partId] = +b.min;
      saveDb(db); json(res, 200, { ok: true, min: +b.min }); return;
    }

    if (req.method === "POST" && p === "/api/locations") {
      const b = await readBody(req);
      if (!b.name) { json(res, 400, { error: "name required" }); return; }
      const loc = { id: uid(), name: b.name, kind: b.kind === "shop" ? "shop" : "van", tech: b.tech || "" };
      db.locations.push(loc); saveDb(db); json(res, 201, loc); return;
    }

    if (req.method === "POST" && p === "/api/stock/receive") {
      const b = await readBody(req);
      if (!knownLoc(b.locationId) || !knownPart(b.partId)) { json(res, 400, { error: "unknown location/part" }); return; }
      if (!posInt(b.qty)) { json(res, 400, { error: "qty must be a positive whole number" }); return; }
      setQty(b.locationId, b.partId, qty(b.locationId, b.partId) + +b.qty);
      saveDb(db); json(res, 200, { ok: true, have: qty(b.locationId, b.partId) }); return;
    }

    if (req.method === "POST" && p === "/api/stock/use") {
      const b = await readBody(req);
      if (!knownLoc(b.locationId) || !knownPart(b.partId)) { json(res, 400, { error: "unknown location/part" }); return; }
      if (!posInt(b.qty)) { json(res, 400, { error: "qty must be a positive whole number" }); return; }
      const have = qty(b.locationId, b.partId);
      if (have < +b.qty) { json(res, 400, { error: `only ${have} on hand` }); return; }
      setQty(b.locationId, b.partId, have - +b.qty);
      const pt = db.parts.find(x => x.id === +b.partId);
      const lc = db.locations.find(x => x.id === +b.locationId);
      const u = { id: uid(), date: b.date || new Date().toISOString().slice(0, 10), locationId: b.locationId, partId: b.partId, qtyUsed: +b.qty, job: b.job || "", billed: false,
        partSnap: `${pt.number} — ${pt.name}`, locSnap: lc.name };
      db.usage.push(u); saveDb(db); json(res, 201, u); return;
    }

    if (req.method === "POST" && p === "/api/stock/transfer") {
      const b = await readBody(req);
      if (!knownLoc(b.fromId) || !knownLoc(b.toId) || !knownPart(b.partId)) { json(res, 400, { error: "unknown location/part" }); return; }
      if (+b.fromId === +b.toId) { json(res, 400, { error: "source and destination are the same" }); return; }
      if (!posInt(b.qty)) { json(res, 400, { error: "qty must be a positive whole number" }); return; }
      if (qty(b.fromId, b.partId) < +b.qty) { json(res, 400, { error: "insufficient stock at source" }); return; }
      setQty(b.fromId, b.partId, qty(b.fromId, b.partId) - +b.qty);
      setQty(b.toId, b.partId, qty(b.toId, b.partId) + +b.qty);
      saveDb(db); json(res, 200, { ok: true }); return;
    }

    /* ---- v1.2: usage edit/undo ---- */
    const um = p.match(/^\/api\/usage\/(\d+)$/);
    if (um) {
      const u = db.usage.find(x => x.id === +um[1]);
      if (!u) { json(res, 404, { error: "usage row not found" }); return; }
      if (u.billed) { json(res, 409, { error: "billed rows are immutable" }); return; }
      if (req.method === "PATCH") {
        const b = await readBody(req);
        if (b.job !== undefined) u.job = b.job;
        if (b.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) u.date = b.date;
        saveDb(db); json(res, 200, u); return;
      }
      if (req.method === "DELETE") {
        if (req.headers["x-confirm"] !== "DELETE-USAGE") { json(res, 400, { error: "must send X-Confirm: DELETE-USAGE" }); return; }
        if (knownLoc(u.locationId) && knownPart(u.partId)) {
          setQty(u.locationId, u.partId, qty(u.locationId, u.partId) + u.qtyUsed); // undo: restore units
        }
        db.usage = db.usage.filter(x => x.id !== u.id);
        saveDb(db); json(res, 200, { ok: true, restored: u.qtyUsed }); return;
      }
    }

    if (req.method === "POST" && p === "/api/usage/mark-billed") {
      const b = await readBody(req);
      if (!Array.isArray(b.ids)) { json(res, 400, { error: "ids array required" }); return; }
      let n = 0;
      db.usage.forEach(u => { if (b.ids.includes(u.id)) { u.billed = true; n++; } });
      saveDb(db); json(res, 200, { marked: n }); return;
    }

    // bulk import rows: [{location:{name,kind}, number, name, category, cost, price, onHand}]
    if (req.method === "POST" && p === "/api/import/rows") {
      const b = await readBody(req, 5 * 1024 * 1024);
      if (!Array.isArray(b.rows)) { json(res, 400, { error: "rows array required" }); return; }
      let imported = 0;
      for (const r of b.rows.slice(0, 5000)) {
        if (!r.name || !r.number) continue;
        const kind = r.kind === "shop" ? "shop" : "van";
        let loc = db.locations.find(l => l.name === r.location);
        if (!loc) { loc = { id: uid(), name: r.location, kind, tech: "" }; db.locations.push(loc); }
        let part = db.parts.find(pt => pt.number.toLowerCase() === String(r.number).toLowerCase());
        if (!part) { part = { id: uid(), number: r.number, name: r.name, category: r.category || "General", cost: +r.cost || 0, price: +r.price || 0 }; db.parts.push(part); }
        if (r.on_hand !== undefined && posInt(r.on_hand)) setQty(loc.id, part.id, +r.on_hand);
        imported++;
      }
      saveDb(db); json(res, 200, { imported }); return;
    }

    if (req.method === "GET" && p === "/api/restock") { json(res, 200, restockList()); return; }

    if (req.method === "GET" && p === "/api/export/billable.csv") {
      const rows = [["date", "van", "part_number", "part_name", "qty_used", "unit_price", "line_total", "job"]];
      db.usage.filter(u => !u.billed).forEach(u => {
        const part = db.parts.find(x => x.id === u.partId);
        const loc = db.locations.find(x => x.id === u.locationId);
        rows.push([u.date, loc?.name || u.locSnap, part?.number || String(u.partSnap || "").split(" — ")[0], part?.name || String(u.partSnap || "").split(" — ")[1], u.qtyUsed, part?.price, (u.qtyUsed * (part?.price || 0)).toFixed(2), u.job]);
      });
      res.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="billable-parts.csv"' });
      res.end(rows.map(r => r.map(csvEsc).join(",")).join("\n"));
      return;
    }

    if (req.method === "GET" && p === "/api/export/inventory.csv") {
      const rows = [["location", "kind", "part_number", "part_name", "category", "on_hand", "cost_each", "price_each", "value"]];
      db.locations.forEach(loc => db.parts.forEach(pt => {
        const q = qty(loc.id, pt.id);
        rows.push([loc.name, loc.kind, pt.number, pt.name, pt.category, q, pt.cost, pt.price, (q * pt.cost).toFixed(2)]);
      }));
      res.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="inventory.csv"' });
      res.end(rows.map(r => r.map(csvEsc).join(",")).join("\n"));
      return;
    }

    json(res, 404, { error: "unknown endpoint" });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(`StockRig running → http://${HOST}:${PORT} (local only)`));
}
module.exports = { server, emptyDb, loadDb, seedDemo };
