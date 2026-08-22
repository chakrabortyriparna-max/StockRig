/* StockRig SPA — vanilla JS, no build step */
let state = null;
let route = "dash";
let vanFilter = null;

const $ = s => document.querySelector(s);
const main = $("#main");
const money = n => "$" + (+n).toFixed(2);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function api(path, opts, extraHeaders, method = "POST") {
  const r = await fetch(path, opts && { method, headers: { "Content-Type": "application/json", ...(extraHeaders || {}) }, body: JSON.stringify(opts) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const locById = id => state.locations.find(l => l.id === id);
const partById = id => state.parts.find(p => p.id === id);
const qty = (l, p) => state.stock[l + ":" + p] || 0;
const DEFAULT_MIN = loc => (loc.kind === "van" ? 4 : 8);
function parOf(loc, partId) {
  const k = loc.id + ":" + partId;
  return (state.pars && state.pars[k] !== undefined) ? state.pars[k] : DEFAULT_MIN(loc);
}
function status(q, loc, partId) {
  const min = parOf(loc, partId);
  if (q === 0) return `<span class="pill out">OUT</span>`;
  if (q < min) return `<span class="pill low">LOW</span>`;
  return `<span class="pill ok">OK</span>`;
}

const VIEWS = {
  dash: { label: "Dashboard", render: renderDash },
  vans: { label: "Van stock", render: renderVans },
  catalog: { label: "Parts catalog", render: renderCatalog },
  usage: { label: "Usage & billing", render: renderUsage },
  restock: { label: "Restock lists", render: renderRestock },
};

async function refresh() { state = await api("/api/state"); render(); }

function render() {
  $("#nav").innerHTML = Object.entries(VIEWS).map(([k, v]) =>
    `<button data-r="${k}" class="${route === k ? "active" : ""}">${v.label}</button>`).join("");
  $("#nav").querySelectorAll("button").forEach(b =>
    b.onclick = () => { route = b.dataset.r; render(); });
  VIEWS[route].render();
}

/* ---------- Dashboard ---------- */
function renderDash() {
  let units = 0, value = 0, low = 0, out = 0;
  state.locations.forEach(loc => state.parts.forEach(pt => {
    const q = qty(loc.id, pt.id); units += q; value += q * pt.cost;
    if (loc.kind === "van") {
      const min = parOf(loc, pt.id);
      if (q === 0) out++;
      else if (q < min) low++;
    }
  }));
  const unbilled = state.usage.filter(u => !u.billed);
  const unbilledVal = unbilled.reduce((s, u) => s + u.qtyUsed * (partById(u.partId)?.price || 0), 0);

  main.innerHTML = `
    <h1>Fleet overview</h1>
    <p class="sub">${state.locations.filter(l => l.kind === "van").length} vans · ${state.parts.length} parts tracked</p>
    <div class="cards">
      <div class="card"><div class="k">Stock on hand</div><div class="v">${units}</div></div>
      <div class="card"><div class="k">Inventory value (cost)</div><div class="v good">${money(value)}</div></div>
      <div class="card"><div class="k">Below par on vans</div><div class="v ${low ? "warn" : ""}">${low}</div></div>
      <div class="card"><div class="k">Out of stock</div><div class="v ${out ? "bad" : ""}">${out}</div></div>
      <div class="card"><div class="k">Unbilled parts</div><div class="v warn">${money(unbilledVal)}</div></div>
    </div>
    <h1 style="font-size:18px">Recent activity</h1>
    ${state.usage.length ? `<table><tr><th>Date</th><th>Van</th><th>Part</th><th>Qty</th><th>Job</th></tr>
      ${state.usage.slice(-6).reverse().map(u => `<tr><td>${esc(u.date)}</td><td>${esc(locById(u.locationId)?.name)}</td>
        <td class="mono">${esc(partById(u.partId)?.number)}</td><td>×${u.qtyUsed}</td><td class="mono">${esc(u.job)}</td></tr>`).join("")}
    </table>` : `<p class="empty">No usage yet — record a part against a job in “Usage & billing”.</p>`}`;
}

/* ---------- Van stock ---------- */
function renderVans() {
  if (!vanFilter || !state.locations.find(l => l.id === vanFilter)) vanFilter = state.locations[0]?.id;
  const loc = locById(vanFilter);
  const tabs = state.locations.map(l =>
    `<button class="van-tab ${l.id === vanFilter ? "active" : ""}" data-l="${l.id}">${esc(l.name)}${l.kind === "van" ? "" : " 🏠"}</button>`).join("");
  main.innerHTML = `
    <div class="row"><h1>Van stock</h1><span style="flex:1"></span>
      <button class="btn line sm" id="receiveBtn">Receive stock</button>
      <button class="btn line sm" id="transferBtn">Transfer</button>
      <button class="btn line sm" id="delVanBtn">Delete van</button>
      <button class="btn sm" id="addVanBtn">Add van</button></div>
    <div class="van-tabs">${tabs}</div>
    <table id="stockTable">
      <tr><th>Part #</th><th>Name</th><th>Status</th><th class="num">On hand</th><th class="num">Par</th><th class="num">Value</th><th></th></tr>
      ${state.parts.map(pt => { const q = qty(vanFilter, pt.id); const min = parOf(loc, pt.id);
        return `<tr><td class="mono">${esc(pt.number)}</td><td>${esc(pt.name)}</td>
          <td>${status(q, loc, pt.id)}</td>
          <td class="num"><b>${q}</b></td><td class="num">${min} <button class="btn ghost sm" data-par="${pt.id}" title="Set par level">✎</button></td>
          <td class="num">${money(q * pt.cost)}</td>
          <td><button class="btn line sm" data-use="${pt.id}">Use on job</button></td></tr>`; }).join("")}
    </table>`;
  main.querySelectorAll(".van-tab").forEach(b => b.onclick = () => { vanFilter = +b.dataset.l; render(); });
  $("#addVanBtn").onclick = () => modal(`Add a van`, `
    <label class="f">Name<input id="m-name" placeholder='Van 03 — Nguyen'></label>
    <label class="f">Tech (optional)<input id="m-tech" placeholder="Initials"></label>`,
    async close => { await api("/api/locations", { name: $("#m-name").value, kind: "van", tech: $("#m-tech").value }); toast("Van added"); close(); refresh(); });
  $("#receiveBtn").onclick = () => receiveModal();
  $("#transferBtn").onclick = () => transferModal();
  $("#delVanBtn").onclick = deleteVan;
  main.querySelectorAll("[data-use]").forEach(b => b.onclick = () => useModal(+b.dataset.use));
  main.querySelectorAll("[data-par]").forEach(b => b.onclick = () => parModal(+b.dataset.par));
}

function parModal(partId) {
  const loc = locById(vanFilter); const pt = partById(partId);
  const cur = parOf(loc, partId);
  modal(`Par level — ${esc(loc.name)} / ${esc(pt.number)}`, `
    <p style="font-size:13.5px;color:#4a4e55;margin-bottom:12px">Restock list flags this part at this location when on-hand drops below the minimum.</p>
    <label class="f">Minimum on hand<input id="m-min" type="number" min="0" value="${cur}"></label>`,
    async close => { await api("/api/pars", { locationId: vanFilter, partId, min: +$("#m-min").value }); toast("Par updated"); close(); refresh(); });
}

/* ---------- Catalog ---------- */
function renderCatalog() {
  main.innerHTML = `
    <div class="row"><div><h1>Parts catalog</h1><p class="sub">The shared list every van draws from.</p></div>
      <span style="flex:1"></span><button class="btn line sm" id="importCsv">Import CSV</button>
      <button class="btn sm" id="addPart">Add part</button></div>
    <table>
      <tr><th>Part #</th><th>Name</th><th>Category</th><th class="num">Cost</th><th class="num">Price</th><th class="num">Margin</th><th></th></tr>
      ${state.parts.map(p => `<tr><td class="mono">${esc(p.number)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td>
        <td class="num">${money(p.cost)}</td><td class="num">${money(p.price)}</td>
        <td class="num" style="color:${p.price > p.cost ? "var(--green)" : "var(--red)"}">${p.price ? Math.round((1 - p.cost / p.price) * 100) + "%" : "—"}</td>
        <td><button class="btn ghost sm" data-edit="${p.id}" title="Edit part">✎</button>
            <button class="btn ghost sm" data-del="${p.id}" title="Delete part">🗑</button></td></tr>`).join("")}
    </table>`;
  $("#addPart").onclick = () => modal(`Add part`, `
    <div class="row"><label class="f">Part number<input id="m-num" placeholder="CAP-45-5"></label>
    <label class="f">Name<input id="m-name" placeholder="Run capacitor 45/5"></label></div>
    <div class="row"><label class="f">Category<select id="m-cat"><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>General</option></select></label>
    <label class="f">Cost<input id="m-cost" type="number" step="0.01"></label>
    <label class="f">Price<input id="m-price" type="number" step="0.01"></label></div>`,
    async close => { await api("/api/parts", { number: $("#m-num").value, name: $("#m-name").value, category: $("#m-cat").value, cost: $("#m-cost").value, price: $("#m-price").value }); toast("Part added"); close(); refresh(); });
  $("#importCsv").onclick = () => importModal();
  main.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editPartModal(+b.dataset.edit));
  main.querySelectorAll("[data-del]").forEach(b => b.onclick = () => deletePart(+b.dataset.del));
}

function editPartModal(id) {
  const p = partById(id);
  modal(`Edit part — ${esc(p.number)}`, `
    <div class="row"><label class="f">Part number<input id="m-num" value="${esc(p.number)}"></label>
    <label class="f">Name<input id="m-name" value="${esc(p.name)}"></label></div>
    <div class="row"><label class="f">Category<select id="m-cat">${["HVAC","Plumbing","Electrical","General"].map(c => `<option ${c === p.category ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    <label class="f">Cost<input id="m-cost" type="number" step="0.01" value="${p.cost}"></label>
    <label class="f">Price<input id="m-price" type="number" step="0.01" value="${p.price}"></label></div>`,
    async close => { await api(`/api/parts/${id}`, { number: $("#m-num").value, name: $("#m-name").value, category: $("#m-cat").value, cost: $("#m-cost").value, price: $("#m-price").value }, {}, "PATCH"); toast("Part updated"); close(); refresh(); });
}
function deletePart(id) {
  const p = partById(id);
  if (!confirm(`Delete ${p.number} — ${p.name}?\n\nIts on-hand counts everywhere will be removed. Past usage history is kept (labeled by snapshot). This cannot be undone.`)) return;
  api(`/api/parts/${id}`, {}, { "X-Confirm": "DELETE-PART" }, "DELETE")
    .then(() => { toast("Part deleted"); refresh(); })
    .catch(e => toast("⚠ " + e.message));
}
function deleteVan() {
  const loc = locById(vanFilter);
  if (loc.kind === "shop") { toast("⚠ Delete vans from the Van stock tab, not the shop."); return; }
  if (!confirm(`Delete "${loc.name}"?\n\nAll its on-hand stock moves to Shop / Warehouse first, so no units are lost. This cannot be undone.`)) return;
  api(`/api/locations/${loc.id}`, {}, { "X-Confirm": "DELETE-LOCATION" }, "DELETE")
    .then(() => { vanFilter = null; toast("Van deleted — stock moved to Shop"); refresh(); })
    .catch(e => toast("⚠ " + e.message));
}

function importModal() {
  modal(`Import inventory CSV`, `
    <p style="font-size:13px;color:#4a4e55;margin-bottom:10px">Paste rows exported from StockRig or a spreadsheet. Columns (header required):<br>
    <code class="mono" style="font-size:11px">location,kind,part_number,part_name,category,on_hand,cost_each,price_each</code></p>
    <textarea id="m-csv" rows="9" style="width:100%;font-family:monospace;font-size:11.5px;border:1px solid var(--line);border-radius:8px;padding:8px" placeholder="location,kind,part_number,part_name,category,on_hand,cost_each,price_each&#10;Van 12,van,CAP-45-5,Run capacitor,HVAC,2,8.40,34"></textarea>`,
    async close => {
      const lines = $("#m-csv").value.trim().split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error("nothing to import");
      const head = lines[0].toLowerCase().split(",").map(h => h.replace(/"/g, "").trim());
      const idx = n => head.indexOf(n);
      const need = ["location", "part_number", "part_name"];
      if (need.some(n => idx(n) < 0)) throw new Error("missing header columns: " + need.join(", "));
      const rows = [];
      for (const line of lines.slice(1)) {
        const c = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map(x => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
        rows.push({ location: c[idx("location")], kind: c[idx("kind")] || "van", number: c[idx("part_number")], name: c[idx("part_name")], category: c[idx("category")], cost: c[idx("cost_each")], price: c[idx("price_each")], on_hand: parseInt(c[idx("on_hand")] ?? "", 10) || 0 });
      }
      const r = await api("/api/import/rows", { rows });
      toast(`Imported ${r.imported} rows`); close(); refresh();
    });
}

/* ---------- Usage & billing ---------- */
function renderUsage() {
  const rows = [...state.usage].reverse();
  main.innerHTML = `
    <div class="row"><div><h1>Usage & billing</h1>
      <p class="sub">Every part used on a job lands here until you bill it. Export → invoice → mark billed.</p></div>
      <span style="flex:1"></span><button class="btn line sm" id="useBtn">Record usage</button>
      <a class="btn sm" href="/api/export/billable.csv">Download billable CSV</a></div>
    ${rows.length ? `<table><tr><th>Date</th><th>Van</th><th>Part #</th><th>Name</th><th class="num">Qty</th><th class="num">Line total</th><th>Job</th><th>Billed</th></tr>
      ${rows.map(u => { const pt = partById(u.partId); return `<tr style="${u.billed ? "opacity:.45" : ""}">
        <td>${esc(u.date)}</td><td>${esc(locById(u.locationId)?.name)}</td><td class="mono">${esc(pt?.number)}</td><td>${esc(pt?.name)}</td>
        <td class="num">×${u.qtyUsed}</td><td class="num">${money(u.qtyUsed * (pt?.price || 0))}</td><td class="mono">${esc(u.job)}</td>
        <td>${u.billed ? "✓" : `<button class="btn ghost sm" data-uedit="${u.id}" title="Edit">✎</button>
          <button class="btn ghost sm" data-uundo="${u.id}" title="Undo (restock)">↩</button>
          <button class="btn line sm" data-bill="${u.id}">Mark billed</button>`}</td></tr>`; }).join("")}</table>`
      : `<p class="empty">Nothing used yet.</p>`}`;
  const useBtn = $("#useBtn"); if (useBtn) useBtn.onclick = () => useModal(state.parts[0]?.id);
  main.querySelectorAll("[data-bill]").forEach(b => b.onclick = async () => {
    await api("/api/usage/mark-billed", { ids: [+b.dataset.bill] }); toast("Marked billed"); refresh();
  });
  main.querySelectorAll("[data-uedit]").forEach(b => b.onclick = () => {
    const u = state.usage.find(x => x.id === +b.dataset.uedit); editUsageModal(u);
  });
  main.querySelectorAll("[data-uundo]").forEach(b => b.onclick = async () => {
    if (!confirm("Undo this usage? The quantity goes back on the van and the row is removed.")) return;
    try { await api(`/api/usage/${b.dataset.uundo}`, {}, { "X-Confirm": "DELETE-USAGE" }, "DELETE"); toast("Usage undone — stock restored"); refresh(); }
    catch (e) { toast("⚠ " + e.message); }
  });
}

function editUsageModal(u) {
  const pt = partById(u.partId);
  modal(`Edit usage #${u.id} — ${esc(pt?.number || u.partSnap || "")}`, `
    <div class="row"><label class="f">Job #<input id="m-job" value="${esc(u.job)}"></label>
    <label class="f">Date<input id="m-date" type="date" value="${esc(u.date)}"></label></div>
    <p style="font-size:12.5px;color:var(--steel);margin-top:8px">Billed rows can't be edited. Qty changes: undo and re-log instead.</p>`,
    async close => { await api(`/api/usage/${u.id}`, { job: $("#m-job").value, date: $("#m-date").value }, {}, "PATCH"); toast("Usage updated"); close(); refresh(); });
}

/* ---------- Restock ---------- */
async function renderRestock() {
  const groups = await api("/api/restock");
  main.innerHTML = `
    <div class="row"><div><h1>Restock lists</h1>
      <p class="sub">Anything below its par level. Print it, text it to the tech, or hand it to the supply house.</p></div></div>
    ${groups.length ? groups.map(g => `
      <div class="restock-group"><h3>${esc(g.location.name)}</h3>
      <table><tr><th>Part #</th><th>Name</th><th class="num">Have</th><th class="num">Par</th><th class="num">Order to</th><th class="num">Short by</th></tr>
      ${g.items.map(i => `<tr><td class="mono">${esc(i.part.number)}</td><td>${esc(i.part.name)}</td>
        <td class="num">${i.have}</td><td class="num">${i.min}</td><td class="num">${i.orderTo}</td>
        <td class="num"><b style="color:var(--orange)">+${i.shortBy}</b></td></tr>`).join("")}</table></div>`).join("")
      : `<p class="empty">All vans above par. Rare and beautiful.</p>`}`;
}

/* ---------- Modals ---------- */
function modal(title, bodyHtml, onSave) {
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-bg"><div class="modal"><h2>${title}</h2>${bodyHtml}
    <div class="row" style="margin-top:16px;justify-content:flex-end">
      <button class="btn line sm" id="m-cancel">Cancel</button>
      <button class="btn sm" id="m-save">Save</button></div></div></div>`;
  $("#m-cancel").onclick = () => (root.innerHTML = "");
  $(".modal-bg").onclick = e => { if (e.target.classList.contains("modal-bg")) root.innerHTML = ""; };
  $("#m-save").onclick = async () => { try { await onSave(() => (root.innerHTML = "")); } catch (e) { toast("⚠ " + e.message); } };
}
function selectLoc(id) { return `<select id="m-loc">${state.locations.map(l => `<option value="${l.id}" ${l.id === id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>`; }
function selectPart(id) { return `<select id="m-part">${state.parts.map(p => `<option value="${p.id}" ${p.id === id ? "selected" : ""}>${esc(p.number)} — ${esc(p.name)}</option>`).join("")}</select>`; }

function receiveModal() {
  modal("Receive stock", `
    <div class="row"><label class="f">To location${selectLoc()}</label></div>
    <div class="row"><label class="f">Part${selectPart()}</label><label class="f">Qty<input id="m-qty" type="number" min="1" value="10"></label></div>`,
    async close => { await api("/api/stock/receive", { locationId: +$("#m-loc").value, partId: +$("#m-part").value, qty: +$("#m-qty").value }); toast("Received"); close(); refresh(); });
}
function transferModal() {
  modal("Transfer between locations", `
    <div class="row"><label class="f">From${selectLoc()}</label>
    <label class="f">Part${selectPart()}<input hidden></label><label class="f">Qty<input id="m-qty" type="number" min="1" value="1"></label></div>
    <div class="row"><label class="f">To location<select id="m-to">${state.locations.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></label></div>`,
    async close => { await api("/api/stock/transfer", { fromId: +$("#m-loc").value, toId: +$("#m-to").value, partId: +$("#m-part").value, qty: +$("#m-qty").value }); toast("Transferred"); close(); refresh(); });
}
function useModal(partId) {
  modal("Use part on a job", `
    <div class="row"><label class="f">From van${selectLoc(vanFilter)}</label></div>
    <div class="row"><label class="f">Part${selectPart(partId)}<input hidden></label>
    <label class="f">Qty<input id="m-qty" type="number" min="1" value="1"></label>
    <label class="f">Job #<input id="m-job" placeholder="J-1041"></label></div>`,
    async close => { await api("/api/stock/use", { locationId: +$("#m-loc").value, partId: +$("#m-part").value, qty: +$("#m-qty").value, job: $("#m-job").value }); toast("Logged to job"); close(); refresh(); });
}

$("#seedBtn").onclick = async () => {
  if (!confirm("Replace ALL current data with the demo fleet? This cannot be undone.")) return;
  await api("/api/demo/seed", {}, { "X-Confirm": "REPLACE-ALL-DATA" });
  vanFilter = null; toast("Demo fleet loaded"); refresh();
};
refresh();
