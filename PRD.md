# PRD: StockRig Backend â€” Production System ("StockRig Cloud")

Version 1.0 Â· 2026-08-22 Â· Owner: founding team Â· Status: Draft for review
Context: transforms the validated local demo (`product/server.js`, v1.2, zero-dependency JSON-file store) into a scalable, robust, multi-tenant production service. The local app remains free forever per business plan v1.1; Cloud is the paid-tier path.

---

## 1. Executive Summary

StockRig is truck-stock inventory software for micro trades shops (1â€“5 techs): vans become tracked locations, parts carry per-truck par levels, job usage flows onto billable exports, restock lists generate themselves. The current product runs entirely on one machine as a zero-dependency Node server with JSON-file persistence â€” perfect for the free local wedge, structurally incapable of serving multiple shops over the internet.

This PRD specifies **StockRig Cloud**: a multi-tenant, authenticated, hosted version of the same domain model, built to stay cheap at zero-to-small scale (managed Postgres free tier + small container) and correct at growth scale (connection pooling, rate limits, audit trails, observability). It preserves every v1.2 semantic that red-team hardening earned: atomic persistence, immutable billed rows, X-Confirm destructive gating, snapshot-stamped history.

**Core value proposition:** same promise â€” *know what's on the truck* â€” now reachable from any device, shareable across a crew, and safe enough to run a business on.

**MVP goal:** one shop owner can sign up, invite their techs, load their vans, and run the parâ†’usageâ†’billâ†’restock loop from any phone, with data that survives server restarts, crashes, and us going to sleep at night.

## 2. Mission

**Mission:** kill the "two inventories" problem â€” software vs. reality â€” for shops too small for enterprise FSM.

**Principles**
1. **Data ownership is sacred** â€” full CSV export always; deletion means deletion (with snapshots); no dark-pattern lock-in.
2. **Billed = immutable** â€” once a usage row hits an invoice it is history, not state.
3. **Cheap first, scalable second** â€” free-tier infrastructure until customers force the upgrade.
4. **Zero-trust boundaries** â€” validate everything at the edge; destructive ops require explicit confirmation tokens.
5. **Honest operations** â€” errors are loud, logs are structured, status is public.

## 3. Target Users

| Persona | Description | Technical comfort | Needs |
|---|---|---|---|
| **Owner-operator Dana** | Runs 2-van HVAC shop, does books at night | Low â€” phone-first | Sign up in minutes, never think about servers |
| **Tech Marcus** | In van all day, uses employer's login | Very low | 3-tap part deduction against a job |
| **Bookkeeper Priya** | Handles invoices monthly | Medium | Clean billable export; trust that billed history can't shift |

Pain being solved (evidence: research/04-market-dd.md): Jobber has no native inventory; HCP lacks per-van stock; enterprise suites price out micro shops.

## 4. MVP Scope

### âœ… In Scope
**Core functionality**
- âœ… Orgs (shops) with owner/admin/tech roles
- âœ… Email+password auth; email verification; password reset
- âœ… Invites (owner emails tech links)
- âœ… Full v1.2 domain: locations, parts, stock, pars, usage, transfers, billable export, restock lists, CSV import/export
- âœ… Immutable billed rows; X-Confirm-equivalent confirmation for destructive APIs
- âœ… Audit log (who changed what, append-only)

**Technical**
- âœ… Managed PostgreSQL (Supabase or Neon free tier) + migrations
- âœ… Session/JWT auth middleware; per-org row isolation
- âœ… Structured logging (pino), request IDs, Sentry error capture
- âœ… Rate limiting + security headers + CORS lockdown
- âœ… Nightly logical backups (managed PITR where free)
- âœ… GitHub Actions CI: lint + tests + migration check on every push
- âœ… Dockerfile; deploy to Render/Railway/Fly free tier

### âŒ Out of Scope (deferred)
- âŒ Native mobile apps (responsive web only)
- âŒ Jobber/Housecall Pro sync integrations (Phase 5 revenue path)
- âŒ Barcode scanning, photo attachments
- âŒ Stripe billing automation (concierge setups invoiced manually at MVP)
- âŒ Real-time multiplayer editing (last-write-wins with updated_at checks)

## 5. User Stories

1. As **Dana**, I want to sign up with my email and get a working shop workspace instantly, so that I'm counting parts before my coffee's cold.
2. As **Dana**, I want to invite Marcus by email, so that he deducts parts from his own login instead of texting me counts.
3. As **Marcus**, I want to tap a part, enter qty, type a job number, so that the part leaves my van and lands on the invoice in under 5 seconds.
4. As **Priya**, I want to download this week's billable CSV, so that invoicing takes minutes and nothing is forgotten.
5. As **Dana**, I want deleting a van to move its stock to the shop rather than vaporize it, so that mistakes are recoverable.
6. As **Dana**, I want a weekly digest of below-par items, so that Monday's supply run builds itself.
7. As **Marcus**, I want the app usable on a cracked-screen budget phone over spotty signal, so that the tool fits my actual life.
8. As **Dana (technical story)**, I want my data exportable as CSV at any moment, so that StockRig can never hold me hostage.

## 6. Core Architecture & Patterns

```
browser SPA (static, CDN)
      â”‚ HTTPS / JSON
â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ API container (Node â‰¥20)       â”‚
â”‚  - Fastify HTTP layer          â”‚  â† replaces raw http module; keeps JSON-error contract
â”‚  - authn (JWT) / authz (roles) â”‚
â”‚  - zod request validation      â”‚  â† formalizes posInt/knownX pattern
â”‚  - pino logging, Sentry hook   â”‚
â”‚  - pg (node-postgres) pool     â”‚
â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â”‚ SQL (migrations via node-pg-migrate)
â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Managed Postgres (Supabase/Neon)â”‚  free tier; PITR backups
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Patterns carried over from v1.2 (non-negotiable):**
- Validate-at-boundary before mutation (mirrors `posInt`/`knownLoc`/`knownPart`)
- Destructive endpoints require explicit confirm token (`X-Confirm` heritage â†’ `confirm:` body field)
- Billed usage rows immutable at the DB level (trigger, not just handler)
- Snapshot columns (`part_snap`, `loc_snap`) so history survives reference deletion
- Fail loud; never silently reset data

**Tenancy:** every business table carries `org_id`; every query scoped by caller's org claim; Postgres CHECK + composite indexes `(org_id, â€¦)`; integration tests assert cross-org isolation.

## 7. Tools/Features

| Feature | Spec highlights |
|---|---|
| Auth | argon2id hashes; JWT access (15m) + refresh rotation (30d); email verify + reset tokens (single-use, 24h expiry) |
| Orgs & invites | owner/admin/tech roles; invite tokens emailed via Resend; techs cannot delete/edit billing settings |
| Inventory API | parity with v1.2 surface (below) + pagination (`limit/cursor`) on list endpoints |
| Billable export | same CSV shape; streamed; org-scoped; unbilled filter |
| Restock lists | computed per van from pars; printable route |
| Weekly digest | cron job (GitHub Actions schedule hitting internal endpoint) emails below-par summary |
| Audit log | append-only `audit_events(actor, org, action, entity, before, after, at)` |
| Health/status | `/healthz` (liveness), `/readyz` (DB ping); public status page optional |

## 8. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js â‰¥ 20 LTS | continuity with existing code/tests |
| HTTP | Fastify 4 | tiny, fast, schema validation, plugin ecosystem; JSON-error contract preserved |
| DB | PostgreSQL 16 (Neon or Supabase free tier) | relational fit, free tier w/ backups, RLS available later |
| DB access | node-postgres (pg) + node-pg-migrate | thin, no ORM magic; SQL stays reviewable |
| Validation | zod | typed schemas shared client/server |
| AuthN/Z | @fastify/jwt + argon2id | standard, auditable |
| Logging | pino (+ pino-http) | structured, fast |
| Errors | Sentry (free tier) | production visibility |
| Email | Resend (free tier ~3k/mo) | invites, resets, digests |
| Payments | Razorpay Orders API + webhooks (live keys provisioned) | India-first PSP; replaces Stripe in original draft |
| Tests | node:test (existing suite ports) + Testcontainers-free approach: temp schema per run | zero-dep spirit kept |
| CI/CD | GitHub Actions | free for public/private small repos |
| Deploy | Docker â†’ Render/Railway free tier (web) + Neon (db); static site â†’ Cloudflare Pages | $0 baseline |

## 9. Security & Configuration

**AuthZ matrix**

| Action | Owner | Admin | Tech |
|---|---|---|---|
| Invite/remove users, billing | âœ“ | â€“ | â€“ |
| Edit/delete parts, locations | âœ“ | âœ“ | â€“ |
| Receive/transfer/use, edit own usage | âœ“ | âœ“ | âœ“ (own rows until billed) |
| Export CSV | âœ“ | âœ“ | âœ“ |
| Delete location/part | âœ“ | âœ“ (confirm token) | â€“ |

**Config (env vars, all secrets via platform vault):**
`DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `APP_BASE_URL`, `NODE_ENV=production`, `RATE_LIMIT_MAX`.

**Security scope:** in-scope â€” OWASP Top 10 basics (authn/session fixation, injection via parameterized SQL, XSS via SPA escaping heritage, CSRF via SameSite+Bearer-token pattern, rate limiting, TLS enforced by host); out-of-scope â€” SOC2, SSO/SAML, field-level encryption (documented non-goals).

## 10. API Specification (delta from v1.2)

Base: `https://api.stockrig.io/v1` Â· Auth: `Authorization: Bearer <access>` Â· All responses `{ ...data }` or `{ error }` (contract unchanged).

```
POST   /auth/signup            {email,password,shopName} â†’ 201 {user,org}
POST   /auth/login             â†’ {access,refresh}
POST   /auth/refresh           â†’ {access}
POST   /auth/verify            {token}
POST   /auth/reset-request     {email} â†’ 204 (always, no enumeration)
POST   /auth/reset             {token,password}
GET    /me                     â†’ {user,org,role}
POST   /org/invites            {email,role} â†’ 201 (admin+)

GET    /locations              ?cursor â†’ paginated, org-scoped
PATCH  /locations/:id          DELETE /locations/:id        (confirm:"DELETE-LOCATION")
GET    /parts                  PATCH /parts/:id             DELETE /parts/:id (confirm:"DELETE-PART")
POST   /stock/receive|use|transfer                        (identical bodies to v1.2)
PATCH  /usage/:id              DELETE /usage/:id            (confirm:"DELETE-USAGE"; 409 if billed)
POST   /usage/mark-billed      {ids:[â€¦]}
GET    /restock                GET /export/billable.csv     GET /export/inventory.csv
POST   /import/rows            GET /audit                   ?cursor (admin+)
GET    /healthz  /readyz       (unauthenticated)
```

Example â€” deduct part:
```http
POST /v1/stock/use
{ "locationId": 12, "partId": 34, "qty": 2, "job": "J-1041" }
â†’ 201 { "id": 901, "date": "2026-08-22", "partSnap": "CAP-45-5 â€” Run capacitor", â€¦ }
â†’ 400 { "error": "only 1 on hand" }
```

## 11. Success Criteria

MVP is done when:
- [ ] Two separate orgs can coexist with zero cross-org data leakage (automated isolation tests green)
- [ ] Full v1.2 feature parity behind auth, exercised by ported test suite (â‰¥25 tests)
- [ ] Kill -9 the container mid-write â†’ no lost committed transactions (Postgres guarantees; verified by chaos test)
- [ ] P95 API latency < 300ms on free tier for â‰¤5 concurrent shops
- [ ] Dana completes signup â†’ import CSV â†’ first restock list unaided in < 15 min
- [ ] Sentry catches an intentionally thrown prod error within 60s
- [ ] Monthly infra bill: $0 (free tiers) at â‰¤3 shops

## 12. Implementation Phases & Tickets

### Phase 0 â€” Foundations (week 1)
| Ticket | Title | Acceptance |
|---|---|---|
| SR-C01 | Scaffold `cloud/` service: Fastify + pino + env config module | `npm start` serves `/healthz`; config fails fast on missing vars |
| SR-C02 | Provision Neon Postgres; add node-pg-migrate; `migrations/001_init.sql` with org-scoped schema (users, orgs, memberships, locations, parts, stock_qty, pars, usage, audit_events) | `npm run migrate:up/down` idempotent both ways |
| SR-C03 | CI pipeline: GitHub Actions running `node --check`, `node --test`, migration up/down against disposable DB | green check required on PR |

### Phase 1 â€” Identity & Tenancy (weeks 2â€“3)
| Ticket | Title | Acceptance |
|---|---|---|
| SR-C04 | Signup/login/logout; argon2id; JWT access+refresh rotation | auth tests; refresh replay rejected |
| SR-C05 | Email verification + password reset via Resend | single-use tokens; no user enumeration (204 always) |
| SR-C06 | Org invitations + role model (owner/admin/tech) + authz middleware | tech blocked from admin routes (403) |
| SR-C07 | Tenant isolation: org_id scoping helper + isolation test suite | cross-org access attempts all fail in tests |

### Phase 2 â€” Domain Migration (weeks 3â€“4)
| Ticket | Title | Acceptance |
|---|---|---|
| SR-C08 | Locations CRUD + referential cleanup (stockâ†’Shop transfer, last-location refusal) | ports v1.2 semantics, tests ported |
| SR-C09 | Parts CRUD + purge cleanup + dup-number guard | same |
| SR-C10 | Stock receive/use/transfer + par levels; billed-immutability DB trigger | trigger blocks UPDATE/DELETE on billed rows at SQL level |
| SR-C11 | Usage lifecycle: mark-billed, edit/undo unbilled, snapshots | parity with v1.2 test suite |
| SR-C12 | Exports (billable/inventory CSV) + CSV import; cursor pagination on lists | large-org perf test (5k parts) < 500ms |

### Phase 3 â€” Hardening & Ship (weeks 5â€“6)
| Ticket | Title | Acceptance |
|---|---|---|
| SR-C13 | Rate limiting + security headers + CORS allowlist | burst test throttled; headers verified |
| SR-C14 | Audit log writes on every mutation + `/audit` viewer endpoint | admin can see who-did-what |
| SR-C15 | Sentry + pino request-ID correlation + `/readyz` DB ping | injected error visible in Sentry < 60s |
| SR-C16 | Digest cron (weekly below-par email) | arrives for seeded org |
| SR-C17 | Dockerfile + Render deploy + Cloudflare Pages static hosting of site/app SPA | public URL smoke-tested end-to-end |
| SR-C18 | Load/chaos pass: k6 smoke (50 VU), container kill during write, backup restore drill | restore verified from snapshot |

**Total: 18 tickets Â· ~6 weeks solo-realistic Â· $0/month infra at launch**

## 13. Future Considerations

- Phase 5 revenue: Jobber/HCP OAuth sync (paid Pro tier) â€” needs developer-program approval, OAuth client creds
- Mobile PWA install + offline queue (IndexedDB outbox)
- Barcode scanning via browser `BarcodeDetector`
- Row-Level Security migration if direct-DB clients ever appear (Supabase path)
- Razorpay subscriptions when self-serve Pro launches

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier DB pauses/sleeps causing cold-start latency | Neon autosuspend tuned; keep-alive ping from cron; acceptable for MVP scale, upgrade path is $19/mo |
| Solo maintainer outage risk | Runbook doc + restore drills (SR-C18); status page honesty policy |
| Auth/security bugs ship unnoticed | Isolation + auth test suites gate CI (SR-C03); Sentry alerts |
| Scope creep toward enterprise features | Out-of-scope list is contractual; new wants become tickets, not detours |
| JSONâ†’SQL migration loses v1.2 semantics | Port the v1.2 test suite verbatim as acceptance harness (SR-C08â€“11) |

## 15. Appendix

- Current implementation: `product/server.js` (v1.2, 380 lines, documented in `.claude/context/architecture.md`)
- Evidence base: `research/04-market-dd.md`; adversarial history: `redteam/report.md`
- Business context: `business/plan.md` v1.1 (Free forever + $99 concierge)
- Related plan: `.claude/plans/edit-delete-entities-with-referential-cleanup.md` (shipped as v1.2)

---

*Assumptions made:* free-tier providers (Neon/Supabase, Resend, Render) selected per standing zero-spend preference; Razorpay chosen as PSP (user decision); deferred to post-MVP because concierge sales are manual at first; email deliverability assumes custom domain exists before invites go out.


