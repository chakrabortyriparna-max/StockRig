# Feature: Edit & Delete Entities with Referential Cleanup

The following plan should be complete, but validate documentation and codebase patterns before implementing. Pay special attention to naming of existing utils and models. Import from the right files etc.

## Feature Description

Today, once created, nothing in StockRig can be changed or removed: a typo'd part number lives forever, a mis-logged usage row can't be corrected (only marked billed), and a sold van stays on the books forever holding phantom stock keys. This feature adds safe EDIT and DELETE operations for parts, locations (vans/shop), and usage rows — with referential-integrity cleanup so deleting never orphans data or silently destroys billing history.

## User Story

As a shop owner using StockRig
I want to edit or remove parts, vans, and mis-logged usage rows
So that my inventory reflects reality and typos don't haunt my books forever

## Problem Statement

Red-team report (redteam/report.md, Build Breaker §3): "No delete/edit anything. Typo a part number or log usage to the wrong job? Permanent. mark-billed is irreversible too." Every mutation path currently only creates/appends (`server.js` POST endpoints); there are no UPDATE or DELETE handlers anywhere in the ~265-line server.

## Solution Statement

Add RESTful PATCH and DELETE endpoints guarded by the established boundary-validation pattern (`posInt`, `knownLoc`, `knownPart`) plus the destructive-action double-confirm pattern (X-Confirm header + UI confirm dialog). Deletes perform explicit referential cleanup: deleting a part purges its stock keys/pars and KEEPS usage rows (soft-reference by storing part snapshot on the usage row going forward; historical rows show "[deleted part]"); deleting a van moves its stock to Shop (transfer) rather than vanishing units. UI adds inline ✎ edit buttons next to existing ✎ par editor and a confirm-guarded delete menu.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: `product/server.js` (API), `product/public/app.js` (UI), `.claude/context/architecture.md` (docs)
**Dependencies**: None new — zero-dependency constraint holds (Node built-ins only)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `product/server.js` (lines 88-90) - Why: `posInt`/`knownLoc`/`knownPart` validators to reuse verbatim
- `product/server.js` (lines 17-42) - Why: atomic `saveDb()`/fail-loud `loadDb()` — all new mutations must end in saveDb
- `product/server.js` (lines 143-158) - Why: `/api/demo/seed` X-Confirm gating pattern to MIRROR for deletes
- `product/server.js` (lines 163-168) - Why: `/api/pars` PATCH-style handler shape to follow
- `product/public/app.js` (lines 10-16) - Why: `api()` wrapper needs no change; reuse for PATCH/DELETE via opts.method extension
- `product/public/app.js` (lines 207-215) - Why: shared `modal(title, bodyHtml, onSave)` pattern for edit dialogs
- `product/public/app.js` (lines 242-246) - Why: seed button's confirm()-then-header pattern to MIRROR for deletes
- `.claude/context/data-persistence.md` - Why: documents stock/pars composite-key format `"locId:partId"` that cleanup must purge
- `.claude/context/architecture.md` - Why: API surface table must be updated with new endpoints

### New Files to Create

- `product/tests/api.test.js` - Tests using Node's built-in `node:test` runner (first tests in repo — zero new dependencies)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [node:test runner docs](https://nodejs.org/api/test.html)
  - Section: test runner CLI (`node --test`)
  - Why: built-in test framework exists in Node ≥18 — satisfies validation gate without breaking zero-dep rule

### Patterns to Follow

**Error contract:** every endpoint replies `{ error }` with 400/404 via `json()` helper (`server.js:239-267`)
**Validation first:** reject before mutating — see `/api/stock/use` flow (`server.js:222-236`)
**Destructive gating:** `req.headers["x-confirm"] !== "..."` → 400 (`server.js:151`)
**UI confirm:** native `confirm()` then send custom header (`app.js:242-246`)

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — api() wrapper extension
Client `api()` currently always POSTs JSON. Extend signature minimally without breaking callers.

**Tasks:**
- Extend `api(path, opts, extraHeaders, method = "POST")` — default keeps every existing call working unchanged

### Phase 2: Server endpoints
**Tasks:**
- PATCH `/api/parts/:id` — editable fields: number (dup-check case-insensitive like create, `server.js:139`), name, category, cost, price
- DELETE `/api/parts/:id` — gated by `X-Confirm: DELETE-PART`; cleanup order: purge all `stock["*:partId"]` keys → purge `pars["*:partId"]` → KEEP usage rows but stamp them with part snapshot `{number,name}` if not already stamped (add optional `partSnap` field written at usage-creation time going forward) → remove from `db.parts`
- PATCH `/api/locations/:id` — editable: name, tech
- DELETE `/api/locations/:id` — gated by `X-Confirm: DELETE-LOCATION`; refuse to delete the LAST location (400); cleanup: transfer all its stock quantities to Shop (create Shop if somehow absent) via existing `setQty()`, purge `pars` keys, keep usage rows (location snapshot `locSnap` same approach), remove from `db.locations`
- DELETE `/api/usage/:id` — gated by `X-Confirm: DELETE-USAGE`; restores quantity back to the originating location (`setQty(loc, part, qty + qtyUsed)`) ONLY IF not billed — billed rows are immutable (billing integrity)
- PATCH `/api/usage/:id` — editable while unbilled: `job` string, `date`; billed rows immutable (409)

### Phase 3: Frontend integration
**Tasks:**
- Catalog view: add ✎ and 🗑 buttons per row (mirror existing `[data-use]` delegation pattern, `app.js:131`)
- Van stock view: add 🗑 van button next to "Add van", guarded + explain transfer-to-shop consequence in confirm text
- Usage view: unbilled rows get ✎ (job/date) and ↩ undo (delete+restock) buttons
- All deletes use `confirm()` with consequence-specific message + send matching X-Confirm header

### Phase 4: Docs
**Tasks:**
- Update `.claude/context/architecture.md` API table
- Append CLAUDE.md gotcha: "deletes require X-Confirm headers; billed usage rows are immutable"

---

## STEP-BY-STEP TASKS

Execute in order. Each task atomic and independently testable.

### TASK 1 — CREATE product/tests/api.test.js
- **IMPLEMENT**: spin up server on ephemeral port (import server module — REFACTOR server.js to export `{ server, loadDb, emptyDb }` when `require.main === module` guard added), seed, exercise flows
- **PATTERN**: none exists — first test file; use `node:test` + `assert/strict`
- **IMPORTS**: `node:test`, `node:assert`, `http` for requests against 127.0.0.1:0
- **GOTCHA**: tests MUST NOT touch real `data/db.json` — set env `STOCKRIG_DB_PATH` before requiring server; add that env override in `loadDb()`/`saveDb()` paths
- **VALIDATE**: `cd product && node --test tests/`

### TASK 2 — UPDATE product/server.js
- **IMPLEMENT**: env-overridable DB path (`process.env.STOCKRIG_DB_PATH || defaults`), `require.main` guard exporting server, then add 6 endpoints per Phase 2 spec
- **PATTERN**: mirror X-Confirm gate at `server.js:151`; validators at `server.js:88-90`
- **GOTCHA**: part-number dup check must exclude the part being edited; last-location delete returns 400; billed usage PATCH/DELETE returns 409 `{error:"billed rows are immutable"}`
- **VALIDATE**: `node --test tests/`

### TASK 3 — UPDATE product/public/app.js
- **IMPLEMENT**: extend `api()` method param; catalog edit/delete modals; van delete; usage edit/undo buttons
- **PATTERN**: modal helper `app.js:207`; seed confirm pattern `app.js:242-246`
- **GOTCHA**: after any delete call `refresh()` — stale local state renders ghost rows
- **VALIDATE**: manual — open app, edit a part name, verify table updates without reload

### TASK 4 — UPDATE .claude/context/architecture.md + CLAUDE.md
- **IMPLEMENT**: API table rows; immutability + X-Confirm gotchas
- **VALIDATE**: grep that architecture.md mentions each new route

---

## TESTING STRATEGY

### Unit/API Tests (NEW — node:test, zero deps)
Cover: part edit happy-path + duplicate-number rejection; part delete purges stock+pars keys and stamps future usage; location delete transfers stock to Shop; last-location refusal; unbilled usage delete restocks; billed usage immutability (409); all deletes reject without X-Confirm.

### Edge Cases
- Deleting a part whose usage rows are partially billed/unbilled
- Deleting the Shop location when it's the only location (400)
- Editing part number to match another part (case-insensitive, mirrors `server.js:139`)
- Concurrent-tab staleness (accepted limitation: last-write-wins — documented, out of scope)

### E2E / Browser Automation
Not automatable yet (no agent-browser tooling installed). Manual Level-4 gate below substitutes; screenshots skipped accordingly.

---

## VALIDATION COMMANDS

### Level 1: Syntax
```
node --check product/server.js && node --check product/public/app.js
```
### Level 2: Unit/API Tests
```
cd product && node --test tests/
```
### Level 3: Integration (manual script)
```
node server.js &→ POST /api/demo/seed (X-Confirm) → PATCH part → DELETE part (X-Confirm) → GET /api/state shows purge → GET /api/export/inventory.csv clean
```
### Level 4: Manual Validation
1. Edit part cost → catalog margin updates instantly
2. Delete van with stock → confirm text explains transfer → stock appears in Shop
3. Undo an unbilled usage → quantity restored on Van stock tab
4. Try deleting billed row → 409 toast "billed rows are immutable"

---

## ACCEPTANCE CRITERIA

- [ ] Parts, locations editable; parts, locations, unbilled usage deletable
- [ ] Billed usage rows immutable (409)
- [ ] Deletes purge `stock:`/`pars:` composite keys — zero orphan keys in db.json
- [ ] Location delete transfers stock to Shop, never destroys units
- [ ] All deletes require both X-Confirm header and UI confirm()
- [ ] Zero new dependencies; `node --test` suite green
- [ ] Architecture docs updated

---

## COMPLETION CHECKLIST

- [ ] Tasks 1-4 in order, each validated immediately
- [ ] `node --check` clean on both JS files
- [ ] `node --test tests/` green
- [ ] Manual Level-4 walkthrough done
- [ ] Acceptance criteria met

---

## NOTES

- Introducing `node:test` here deliberately: red-team demanded regression safety; built-in runner honors the zero-dependency hard rule.
- Soft-snapshot (`partSnap`/`locSnap`) chosen over soft-delete rows: keeps db.json readable and avoids ghost entities haunting restock lists.
- Out of scope, logged: multi-select bulk delete, undo window after delete (current model = confirm-first, irreversible).
