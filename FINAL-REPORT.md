# FINAL REPORT — StockRig / run-1
2026-08-22 · Autonomous build, zero spend, nothing published

## The company
**StockRig** — truck-stock inventory for 1–5 tech trades shops. *"Know what's on the truck."*
Every van is a tracked location; parts carry par levels per truck; used parts land on jobs and a billable CSV; restock lists write themselves.

## How the idea was found (evidence chain)
1. **3 parallel research agents** combed dev-tooling, SMB/freelancer, and niche-vertical pain across HN, Reddit-via-search, trade forums — 12 candidates, every quote tied to a fetched URL.
2. **Tournament:** 8 finalists scored by 3 adversarial judges (Pragmatist, Solo-Builder Realist, Contrarian Undertaker). Winner: **C8 truck-stock** — the only candidate all three ranked top-3, and the only vertical where a buyer publicly named their price ceiling (~$300/mo).
3. **Due diligence survived fact-check:** Jobber ships ZERO native inventory; Housecall Pro recommends QuickBooks as its inventory workaround (their own help center); Workiz gates van stock behind ~$225/mo. A real Jobber community thread reads like our spec sheet.

## What got built
- **Working product** (`node server.js` → localhost:4242): vans, parts catalog with margin view, per-van par levels (settable in UI), receive/transfer/use-on-job, billable-parts CSV export + mark-billed flow, self-writing restock lists, CSV import, seeded demo fleet. Zero dependencies, atomic writes + backups.
- **Marketing site**: hero, sourced problem quotes, competitor comparison table, pricing — every market claim carries its source link.
- **Brand**: "The Par Line" logo system, hi-vis orange/charcoal identity, brand book with voice rules.
- **Two videos**, built entirely from code: kinetic-typography launch film (27s) with Python-synthesized soundtrack, and an animated founder letter (55s). No generation APIs existed, so media was made programmatically — as instructed.

## The kill attempt — and what it did to the company
Two red-team agents attacked the package:
- **Build Breaker** found real flaws: silent data-wipe path, unauthenticated destructive seed, par levels that were hardcoded fiction, negative-quantity bugs, no auth binding. All fixed and re-verified live in-session (v1.1).
- **The Executioner** killed the pricing model: Ply's own pricing page shows the same feature set FREE for teams up to 15, integrated natively into Jobber/HCP. The flagship demand thread was stale and already answered by a Ply recommendation. Reddit GTM channels formally ban tool promotion.

**Response (decision D11):** pivot, not cover-up. Product became free forever; revenue moved to $99 one-time Concierge Setup; site, plan, videos, and math were all updated the same hour. Honest survival odds (~10% as originally specified) are recorded, not hidden.

## Why this package has value anyway
1. The pain is real, documented, and current (stockouts ~$285/incident, IFS via Simpro; unbilled parts erasing margin).
2. The product genuinely works and demos honestly — the loop runs end-to-end, verified by an independent completeness critic that started the server and exercised every endpoint.
3. The evidence trail survives hostile review: every claim traces to a URL, and the two claims that didn't survive got corrected in public.
4. The residual wedge is specific: shops allergic to demo-gated sales motions, non-Jobber/HCP trades, and a services attach incumbents won't staff for micro accounts.

## What "take to market this month" would actually mean
1. Ship the free product as-is (self-hosted or simple hosting when allowed).
2. Run concierge setups at $99 from local trade Facebook groups and supply-house bulletin boards (channels that don't ban services).
3. Build the Jobber sync only after 20 paid setups prove willingness to pay for convenience.
Realistic year-one expectation after red-team: a few thousand dollars and a validated learning asset — not a rocket. That's the honest version of this company, and it's still standing.

## Guardrail compliance
✓ No spending, no purchases, domains checked via DNS only (stockrig.io available, not bought)
✓ Nothing published, posted, or messaged — everything local
✓ No API keys used or required; no new signups
✓ Every quote/stat traced to fetched URLs; inferences labeled
✓ All work inside `company-builder-experiment/run-1/`
✓ No user questions asked; 11 decisions logged in `logs/decisions.md`
