# Decision Log — run-1
Every question I would have asked the user, answered myself. Format: Q / Decision / Why.

## D1 — Which problem domain to hunt?
Decision: fan out three researchers across dev-tooling, SMB/freelancer, niche-vertical angles simultaneously rather than one broad search.
Why: mission demands aggressive multi-agent research; three lenses reduce single-source bias; each returns only URL-verified pain.

## D2 — How to pick the winner?
Decision: 8-candidate dossier, 3 adversarial judge agents (Pragmatist / Solo-Builder Realist / Contrarian Undertaker), rubric A–F, aggregate score wins.
Why: mission mandates tournaments + skeptic verification. C8 (truck-stock) scored 101/180 and was the only candidate all judges ranked top-3 → consensus beats compromise. Judges' full outputs preserved in tournament results.

## D3 — Undertaker found Housecall Pro at "$49–65/mo ships inventory" — does the premise die?
Decision: fact-check instead of trusting either researcher. Result: claim REFUTED ($59–79 solo; Essentials $149 real floor) AND premise CONFIRMED (no native per-van stock in HCP/Jobber; gated at ~$225/mo in Workiz).
Why: guardrail says verify everything; also produced sharper positioning (job-linked loop, not "we're the only ones").

## D4 — Ply already sells van stock for HCP/Jobber. Pivot?
Decision: no pivot; compete as standalone FSM-agnostic tool at flat $29.
Why: Ply requires (per fetched docs) integration into paid platform plans and targets fleet-scale; micro shops below that line use spreadsheets. Differentiation: billing-loop export + par-level restock at flat micro pricing. Logged as kill-risk with mitigation.

## D5 — Company name?
Decision: **StockRig**. Trades call work vans "rigs"; the name says exactly what it does. Alternatives checked via DNS: vanledger.com, rigstock.com, partdeck.com, vandeck.com all REGISTERED; getstockrig.com, stockrig.io, stockbed.com, partrig.com, restockrig.com available.
Why: exact-match product naming survives trades Facebook-group verbal sharing better than clever abstractions. Domain recommendation: **stockrig.io** primary, getstockrig.com fallback — checked availability only, NOT purchased (guardrail).

## D6 — Pricing?
Decision: Free (1 van/75 parts) + Pro $29/mo flat ($290/yr).
Why: see business/plan.md — anchors against Jobber Core $29; flat beats per-tech because micro shops hate seat math; 10x under the $300/mo ceiling a real buyer named.

## D7 — Tech stack for v1?
Decision: zero-dependency Node.js server (built-in http module) + vanilla JS SPA + JSON file persistence. No npm install, no build step, no paid APIs.
Why: guardrails forbid new spend; must run locally this month; SQLite/better-sqlite3 adds install friction with no benefit at demo scale; JSON storage keeps the demo inspectable.

## D8 — No API keys exist for image/video/voice generation. What then?
Decision: all visual assets hand-authored SVG/CSS (my own vision brain); launch video = programmatic kinetic typography rendered with ffmpeg drawtext/lavfi filters; soundtrack synthesized from scratch with Python stdlib (wave/math); founder video adapted to an animated founder-letter motion graphic since no avatar/voice APIs are available.
Why: user instruction — use my own capabilities for media; guardrails forbid acquiring keys mid-run. Adaptation logged honestly rather than faked.

## D9 — Publish anything?
Decision: nothing leaves the machine. Site runs via `python -m http.server` / opening files locally. Domain only *checked*, never bought.
Why: hard guardrail.

## D10 — What if evidence conflicts (e.g., fieldservicetools.com claims HCP has light truck-stock)?
Decision: present both sides in research file, weight fetched primary sources (HCP help center) over search-surfaced secondary claims, and let positioning survive without the strongest version of the claim.
Why: invent-nothing guardrail; weaker-but-true beats stronger-but-shaky.

## D11 — Red-team found Ply is FREE for teams ≤15 (getply.com/pricing). Kill the business?
Decision: kill the $29/mo SaaS pricing model, not the company. Revision v1.1: product becomes free forever (every feature); revenue shifts to a $99 one-time Concierge Setup service (spreadsheet import, van loading, par templates) with platform-sync integrations as the future paid path. Website pricing section, meta description, comparison table, videos, and plan economics all updated to match. Honest survival odds (~10% as originally specified SaaS) recorded in redteam/report.md rather than massaged.
Why: the pain and the product survived the attack; only the pricing thesis died. Shipping a knowingly-false pricing story would violate the honesty guardrail; pivoting the model keeps the package take-to-market credible as a services-led wedge.
