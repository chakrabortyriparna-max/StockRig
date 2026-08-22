# Data Persistence

## The deal
Whole DB is one JSON file (`product/data/db.json`) held in memory and rewritten fully on every mutation. This is intentional for v1 — inspectable, diffable, zero deps. Don't "upgrade" to SQLite without a reason backed by real users.

## Safety mechanisms (added by red-team remediation v1.1)
- **Atomic write**: `saveDb()` writes to `db.json.tmp` then renames (`server.js:31-42`) — a crash mid-write can't tear the file
- **Rotating backups**: before each write, previous file copied to `data/backups/db.<0-9>.bak` (10-slot rotation)
- **Fail loud**: if `loadDb()` hits a parse error it prints and calls `process.exit(1)` — it NEVER silently resets to empty. Only `ENOENT` boots a fresh db
- **Missing-field tolerance**: older dbs missing `pars` or `usage` get them injected on load

## Conventions when touching persistence
1. New top-level collections must be added in three places: `emptyDb()`, `loadDb()` back-compat injection, and seed data
2. Every mutation path MUST end in `saveDb(db)` — no in-memory-only drift
3. IDs come only from `uid()` (`db.seq++`) — never invent ids client-side
4. Deleting entities isn't supported yet (no delete endpoints) — if you add deletes, consider referential cleanup of `stock`/`pars` keys and orphaned `usage` rows

## Known limits (accepted for v1, revisit at ~10 real shops)
- Single process only — last-write-wins, no locking
- Full-file rewrite per mutation = O(whole db) per request
- No fsync — rename gives atomicity on same volume but not durability guarantee against power loss
