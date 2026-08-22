# StockRig â€” AI Layer Rules

Derived from the real codebase 2026-08-22. Every rule cites the code it came from.

## Project one-liner
StockRig is truck-stock inventory for small trades shops (1â€“5 techs): a zero-dependency Node.js server (`product/server.js`) serving a vanilla-JS SPA (`product/public/`) with JSON-file persistence, plus a static marketing site (`website/`). No npm packages, no build step, no external services.

## Naming conventions
- Files: lowercase (`server.js`, `app.js`, `styles.css`); docs in kebab/UPPER (`FINAL-REPORT.md`, `brandbook.md`)
- JS: camelCase functions/variables (`restockList`, `vanFilter`), PascalCase only for view map keys; constants UPPER_SNAKE where used (`PORT`, `HOST`, `DEFAULT_MIN`)
- API routes: kebab-case nouns under `/api/<domain>/<verb>` (`/api/stock/receive`, `/api/usage/mark-billed`)
- Part numbers: UPPERCASE with hyphens (`CAP-45-5`) â€” see seed catalog `server.js:118-131`

## Core code patterns
- **Zero dependencies**: only Node built-ins (`http`, `fs`, `path`) â€” never add npm packages without explicit approval
- **JSON error contract**: every endpoint replies `{ error: "..." }` via the `json()` helper; one outer try/catch maps throws to 500 (`server.js:239-267`)
- **Validate at the boundary**: `posInt` + id-existence checks (`knownLoc`/`knownPart`) before any mutation (`server.js:88-90`); reject unknown ids, non-positive quantities, self-transfers
- **Destructive actions need double confirmation**: `X-Confirm: REPLACE-ALL-DATA` header server-side (`server.js:151`) AND a UI `confirm()` dialog client-side (`public/app.js:242-246`)
- **Fail loud on data corruption**: `loadDb()` exits the process rather than resetting to empty (`server.js:17-29`); writes are atomic (tmp+rename) with rotating backups in `data/backups/` (`server.js:31-42`)
- **Local-only by default**: server binds `127.0.0.1` (`server.js:8`) â€” do not change without adding auth
- **Frontend escaping**: all interpolated strings pass through `esc()` before entering HTML (`public/app.js:12`); CSV exports neutralize formula injection in `csvEsc()` (`server.js:50-55`)
- **Par levels are per location:part**, stored in `db.pars["locId:partId"]` with `DEFAULT_MIN` fallback (4 van / 8 shop) â€” honored identically on both sides (`server.js:57-59`, `public/app.js:25-30`)

## Build & validation commands
```
node server.js          # from product/ â€” starts http://127.0.0.1:4242
```
- **There are no automated tests, linter, or CI yet.** Manual validation gate before any PR:
  1. Start server, GET `/api/state`
  2. POST `/api/demo/seed` WITH header `X-Confirm: REPLACE-ALL-DATA`
  3. Exercise: use part on job â†’ `/api/restock` reflects it â†’ both CSV exports download
  4. Negative qty and unknown ids return 400
- Videos rebuild via `videos/build_videos.ps1` (needs ffmpeg on PATH); audio via `python videos/make_audio.py`

## On-demand context table
| Load when | File |
|---|---|
| Changing API routes, state shape, or the SPA | `.claude/context/architecture.md` |
| Touching persistence, db.json format, or migrations | `.claude/context/data-persistence.md` |
| Anything security-, auth-, or export-related | `.claude/context/security.md` |
| Working on videos/audio generation pipeline | `.claude/context/media-pipeline.md` |
| Marketing site or brand voice questions | `.claude/context/brand-and-site.md` |

## Hard rules
- Never commit secrets; none exist today and keep it that way
- Run the manual validation gate above before declaring any change done
- Keep the zero-dependency constraint â€” no new runtime libraries
- Nothing in this repo gets published, deployed, or sent externally without explicit human approval
- Destructive/db-replacing endpoints must keep the X-Confirm + UI-confirm pattern

## Miscellaneous / Gotchas

<!-- Running list â€” add entries as you discover things the agent repeatedly misunderstands -->
- v1.2 deletes REQUIRE their specific X-Confirm header AND a UI confirm() dialog - see server.js DELETE handlers
- Billed usage rows are immutable (409); qty corrections go through undo+re-log on unbilled rows only
- Windows ffmpeg drawtext: font paths containing a drive colon (`C:\...`) break filter parsing â€” use fonts copied next to the script (`videos/ariblk.ttf`), not absolute paths
- PowerShell string interpolation mangles `$var:` inside ffmpeg args (parses as scoped variable) â€” build such strings with `-f` format strings, never `"...$var:..."`
- Multiple drawtext filters chain with COMMAS (`-join ','`), colons are option separators within one filter
- `product/data/db.json` is live user data â€” reseeding wipes it; backups land in `data/backups/db.N.bak`
- The marketing site footer discloses that checkout buttons are stubbed â€” keep that disclosure if you touch `website/index.html`

