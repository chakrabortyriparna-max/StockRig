# Tournament Dossier — Candidate Businesses (run-1)
Compiled 2026-08-22 from phase-1 research (see research/*.md). All claims trace to fetched URLs; caveats preserved.

## C1 — AI Code-Review Verification Bottleneck
- Pain: PR review time up 441% (Faros, ~22k devs); agentic PR pickup time 5.3x longer; merge rate 32.7% vs 84.5% (LinearB, 8.1M PRs). Sources: cio.com/article/4207438, blog.cloudflare.com/ai-code-review/, thoughtworks.com code-review post.
- Existing: CodeRabbit/Greptile/Copilot review — adopted but noisy; review time still up ~200%; Cloudflare built bespoke internal tooling.
- WTP: strong; category spend exists.
- Risk: crowded, fast-moving space dominated by well-funded players; vendor amplification bias in sources.

## C2 — Flaky Test / Slow CI Triage
- Pain: universal anecdotes; Canva spent $1M+ CI compute, flaky tests remained constraint; retry culture hides real bugs.
- Sources: news.ycombinator.com/item?id=44821910 (weak individually), item?id=42429601, testresults.io roundup.
- WTP: historically hard to monetize test infra.
- Risk: buyers resist paying; incumbents (BuildPulse etc.) low adoption.

## C3 — Auth/OAuth Integration & Debugging Tooling
- Pain: "budgeted a week... took most of a month" (umurinan.com); PingFederate war stories; Auth0 price-hike complaints.
- Gap: not another IdP — integration testing/debugging tooling for federation failures.
- WTP: proven adjacent market (auth platforms worth billions).
- Risk: wedge may be feature-not-company; IdPs could absorb it.

## C4 — QuickBooks Exit / Migration Service-Tool
- Pain: QBO Plus $90→$110/mo May 2026 (+64% since 2020); Desktop $999→$1,149 Feb 2026; ~3M businesses on Plus; users trapped by switching costs ("ALL your data will be lost moving").
- Sources: business2community.com QuickBooks price breakdown (fetched), quickbooks.intuit.com community threads (search-verified).
- WTP: very high — already paying $1.3K–$3K+/yr and actively shopping.
- Risk: migration is services-heavy; data-fidelity liability; Intuit API restrictions possible (unverified).

## C5 — Google Business Profile Suspension Recovery
- Pain: suspensions accelerating since Jan 2025; appeals now ~5 weeks; no official support channel; franchises losing lead flow daily.
- Sources: searchenginejournal.com/.../542602/ (fetched, Blumenthal/SEJ Mar 2025), localsearchforum.com threads 62383, 62581 (fetched/searched).
- WTP: high (inference) — revenue-critical, time-boxed; consultants hired ad hoc today.
- Risk: dependent on Google's whims; playbook is consulting-flavored; TAM of suspended-at-any-moment businesses is episodic.

## C6 — Multi-Channel Ecom Payout Reconciliation (sub-$1M GMV)
- Pain: payouts wreck books ("wrong in at least nine ways simultaneously" — ecomcpa.com, fetched); A2X/LMB cost $50–300/mo/channel; sub-$1M sellers on spreadsheets.
- WTP: proven ($600–$3,600/yr spent today at larger scale).
- Risk: incumbents could move down-market; integrations require platform APIs (Shopify/Amazon) — free-tier feasible but engineering heavy.

## C7 — Referee Assigning & Pay (non-NFHS sports)
- Pain: ArbiterSports monopoly, broken app, payment freezes; BBB complaints Oct–Nov 2025; officials lose wages.
- WTP: orgs pay today; officials' money literally frozen = acute.
- Risk: two-sided marketplace cold-start; seasonal; PE-owned incumbent integrating acquisitions could fix itself.

## C8 — Truck-Stock / Parts Inventory for Micro Trades (1–5 techs)
- Pain: nothing between spreadsheets and $300+/mo suites; buyer explicitly stated ~$300/mo ceiling (r/HVAC thread ~2022–25, search-verified).
- WTP: named budget exists.
- Risk: crowded adjacent FSM space; inventory data entry is grindy; incumbent unbundling.

## Scoring rubric (judges score 1–10 each)
A. Pain intensity & urgency | B. Willingness-to-pay evidence | C. Underservedness (gap real?) | D. Buildable by one agent + free stack this month | E. Distributable without spending/publishing (demo-able locally) | F. Defensibility once live
