# Security & Exports

## Threat model (v1 reality)
This app has **no authentication**. It is safe only because it binds `127.0.0.1` (`server.js:8`) and is never exposed. Every security decision downstream depends on that. If you ever bind `0.0.0.0` or put it behind a proxy, you MUST add auth first — there is nothing else protecting it.

## Layered defenses that DO exist
1. **Destructive-op gating**: `/api/demo/seed` requires header `X-Confirm: REPLACE-ALL-DATA` (`server.js:151`); UI additionally shows a native `confirm()` (`app.js:242-246`). Copy this pattern for any future destructive endpoint.
2. **Boundary validation** (`server.js:88-90`): `posInt()` rejects non-positive/non-integer/huge quantities; `knownLoc()`/`knownPart()` reject fabricated ids. A previous bug let negative qty *increase* stock — never relax these checks.
3. **Body cap**: `readBody(req, 1MB)` destroys oversized requests (`server.js:79-87`); import endpoint allows 5MB.
4. **Path traversal**: static serving normalizes and prefix-checks against `public/`, returns 404 for missing files (`server.js:236-238`) — note it deliberately does NOT fall back to index.html for missing assets.
5. **CSV formula injection**: `csvEsc()` prefixes `'` to values starting with `= + - @ tab CR` before quoting (`server.js:50-55`) — protects bookkeepers opening exports in Excel.
6. **XSS**: frontend escapes every interpolated value via `esc()` (`app.js:12`). Part names/numbers are user-supplied — never bypass `esc()`.

## Known gaps (documented, not fixed — acceptable while local-only)
- No auth, no CSRF protection (same-origin assumption), no rate limiting
- Static files served with no cache headers
- `.github/` PR workflow exists but is inert without a GitHub remote + CLAUDE_CODE_OAUTH_TOKEN secret

## Export conventions
Both CSV endpoints set Content-Disposition attachment headers and build rows as arrays → map through `csvEsc`. Keep new export columns going through the same path; never hand-concatenate CSV strings.
