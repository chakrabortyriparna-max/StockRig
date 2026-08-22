# RED-TEAM REPORT — StockRig (Phase 8)
Two adversarial agents deployed 2026-08-22. Full outputs preserved below (verbatim summaries); both were instructed to be maximally harsh.

## Agent 1: "Build Breaker" (execution/product attack)
Verdict: NEEDS FIXES BEFORE DEMO.
Top findings (all verified in code):
1. S5 — Silent data wipe: corrupt db.json → emptyDb() on load; one-click unauthenticated seed button next to real data.
2. Core promise not delivered: par levels were hardcoded constants (<4/<8), not per-van configurable — headline feature was fiction.
3. CSV import advertised but nonexistent.
4. Negative-qty bug could INCREASE stock; no input validation; unbounded request bodies; bound to all interfaces with zero auth; CSV formula injection possible.

### Remediation applied same-session (v1.1)
- Atomic writes (tmp+rename) + rotating backups + fail-loud on corruption (process exits, never resets data).
- Seed now requires X-Confirm header + UI confirm dialog.
- REAL per-van/per-part par levels: settable in UI, stored per location:part, honored by restock lists, status pills, dashboard counts.
- CSV import implemented (paste-based, header-validated).
- Input validation: positive integers only, unknown ids rejected, self-transfer rejected, 1MB body cap, duplicate part numbers rejected.
- Binds 127.0.0.1 only.
- CSV formula-injection guard (leading =+-@ neutralized).
- Website copy corrected where claims outran v1.

## Agent 2: "The Executioner" (business viability attack) — verbatim key findings
1. 🔴 Ply pricing page (fetched getply.com/pricing): FREE for teams up to 15 people; Premium $10.99/user/mo; ALL plans include Fleet Stock, Replenishment Lists, Smart Min/Maxes (par levels), and FSM integrations. Refutes plan's positioning pillar "Ply is unpublished/integration-locked/expensive."
2. 🔴 The flagship Jobber community thread (~mid-2025) was answered by a Jobber Ambassador recommending Ply inside Jobber's app marketplace. Not fresh unserved demand.
3. 🟠 r/HVAC-family subs formally ban tool promotion (verified sidebar/rules via fetched pages); hvacsoftware is vendors-banned. $0 GTM channels mostly closed.
4. 🟠 StockZip free tier (100 items, van folders) already eroding the "generic apps stop at counting" line; building toward billing loop.
5. 🟡 Wedge vs FSM incumbents HOLDS (Jobber Aug 2026 changelog: no inventory; HCP Jan 2026 still recommends QBO workaround) — but Ply occupies the gap natively.

Executioner's survival assessment (labeled as its own inference): ~10% odds of reaching $10K ARR in 12 months as originally specified. Recommended: kill SaaS pricing or pivot around what Ply cannot do free.

## Response: plan revision v1.1 (decision D11, logs/decisions.md)
The kill attempt succeeded against the PRICING MODEL, not the product or the pain. Revision:
1. Product core becomes free forever (unlimited vans/parts locally). No subscription claim.
2. Revenue shifts to what Ply structurally does NOT offer self-serve: paid one-time Concierge Setup ($99) — we import the shop's parts spreadsheet, load vans, deliver printed restock templates; plus future platform sync integrations as the eventual Pro product.
3. Website pricing section rewritten to match reality.
4. Honest odds recorded rather than massaged.
