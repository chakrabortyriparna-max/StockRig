# StockRig — Final Asset Library (run-1)
A complete pre-launch company package built from scratch on 2026-08-22 by autonomous multi-agent orchestration. Everything runs locally; nothing was published, purchased, or sent to anyone.

## Start here
| If you want to… | Open |
|---|---|
| See what this is | `FINAL-REPORT.md` |
| Run the product | `product/server.js` → `node server.js` → http://127.0.0.1:4242 ("Load demo data" button seeds a realistic fleet) |
| Read the marketing site | open `website/index.html` in a browser |
| Watch the videos | `videos/launch-video.mp4` (27s) · `videos/founder-letter.mp4` (55s) |
| Understand why this business | `business/plan.md` → `research/*.md` |

## Directory map
```
research/    Phase 1 pain-hunting: 3 parallel agents + market due diligence (all claims URL-cited)
tournament/  dossier.md (8 candidates) · results.md (3-judge scoring) — winner: C8
business/    plan.md — strategy, pricing (v1.1 post-red-team), GTM, honest revenue math
brand/       brandbook.md · logo-mark.svg · logo-horizontal.svg
product/     Zero-dependency Node app (server.js + public/). No npm install needed.
website/     Single-page marketing site, source-linked claims
videos/      launch-video.mp4 · founder-letter.mp4 (+ reproducible build scripts, synth soundtrack)
redteam/     report.md — adversarial attack results AND how the business changed because of them
logs/        decisions.md (every self-answered question D1–D11) · judges.md (judge outputs)
mission.md   The original mandate this run executed
```

## How it was orchestrated
Parallel research fan-out (3 agents) → tournament dossier → 3 adversarial judges → deep due diligence agent → build → red-team pair (execution skeptic + business executioner) → same-session remediation → independent completeness critic (live end-to-end test) → packaging.

## Honest status (read this part)
- **Works:** the full van-stock loop — vans, parts, par levels per truck, usage-on-job, billable CSV export, restock lists, CSV import. Live-tested end-to-end.
- **Killed by red team, honestly recorded:** the $29/mo SaaS pricing model (Ply gives the feature set away for teams ≤15). Business pivoted v1.1: free product + $99 concierge setup service.
- **Not real yet:** checkout, auth/multi-tenant hosting, FSM sync integrations. Footer of the site discloses stubs.
- **Media provenance:** all imagery/video/audio generated programmatically (SVG, ffmpeg, Python-synthesized WAV). No external generation APIs were used or available.
- **Evidence rule:** every market claim traces to a URL fetched during the run; inferences are labeled.
