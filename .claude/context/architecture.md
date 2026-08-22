# Architecture

## Shape
Single-process, single-tenant. `product/server.js` (~265 lines) is the entire backend; `product/public/app.js` is the entire frontend. No framework, no router library â€” one `http.createServer` callback dispatches on `url.pathname` prefix: non-`/api/` = static file from `public/`, `/api/*` = JSON endpoints.

## State shape (db.json)
```json
{
  "seq": 1,                       // id counter â€” uid() = db.seq++
  "locations": [{id, name, kind: "van"|"shop", tech}],
  "parts":     [{id, number, name, category, cost, price}],
  "stock":     {"locId:partId": qty},          // sparse map
  "usage":     [{id, date, locationId, partId, qtyUsed, job, billed}],
  "pars":      {"locId:partId": min}           // optional per-location par levels
}
```
Composite-string keys (`locId + ":" + partId`) are the join mechanism everywhere (`server.js:62-64`, `app.js:24`). If you change this format, you must migrate `data/db.json` AND keep frontend `parOf()`/`qty()` in sync.

## API surface
| Method/Path | Purpose | Notes |
|---|---|---|
| GET `/api/state` | whole db to SPA | no pagination â€” fine at demo scale |
| POST `/api/demo/seed` | replace with demo fleet | requires X-Confirm header |
| POST `/api/parts`, `/api/pars`, `/api/locations` | create | duplicate part numbers rejected |
| POST `/api/stock/receive` / `use` / `transfer` | mutations | validate ids + positive ints first |
| POST `/api/usage/mark-billed` | billing flow | takes `{ids: []}` |
| PATCH `/api/parts/:id` | edit part fields | dup-number check excludes self |
| DELETE `/api/parts/:id` | delete part + purge keys | X-Confirm: DELETE-PART; usage history kept via partSnap |
| PATCH `/api/locations/:id` | rename van / set tech | — |
| DELETE `/api/locations/:id` | delete van, stock moves to Shop | X-Confirm: DELETE-LOCATION; last location -> 400 |
| PATCH `/api/usage/:id` | edit job/date while unbilled | billed rows immutable (409) |
| DELETE `/api/usage/:id` | undo unbilled usage, restores qty | X-Confirm: DELETE-USAGE; billed -> 409 |
| POST `/api/import/rows` | bulk CSV import | max 5000 rows, 5MB body cap |
| GET `/api/restock` | computed restock lists | derived, not stored |
| GET `/api/export/*.csv` | billable + inventory exports | csvEsc-guarded |

## Frontend pattern
SPA re-renders wholesale on every state change: `refresh()` â†’ GET state â†’ `render()` â†’ `VIEWS[route].render()` rebuilds `#main` innerHTML (`app.js:37-63`). Modals via a shared `modal(title, html, onSave)` helper writing into `#modal-root` (`app.js:207`). All server calls through one `api()` wrapper that throws on non-OK (`app.js:10-16`). No routing library â€” `route` is a string key into VIEWS.

## Adding an endpoint (the established way)
1. Handler inside the big try/catch in `server.js`
2. `await readBody(req)` â†’ validate with `posInt`/`knownLoc`/`knownPart`
3. Mutate `db` â†’ `saveDb(db)` â†’ `json(res, 201/200, result)`
4. Frontend: call through `api()`, then `toast()` + `refresh()`


