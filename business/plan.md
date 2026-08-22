# StockRig â€” Business Plan
Run 1 Â· 2026-08-22 Â· All market facts trace to fetched URLs in research/04-market-dd.md; inferences labeled.

## One-liner
StockRig is truck-stock inventory software for 1â€“5 tech trades shops: every van becomes a tracked location, every part gets a par level per tech, used parts flow onto the invoice, and restock lists write themselves.

## The problem (evidence-backed)
- Jobber has NO native parts inventory (fsmadvisor.com/reviews/jobber; fieldserviceguide.com/jobber scores it 2/5). Housecall Pro tracks job materials but NOT per-van stock â€” its own help center suggests QuickBooks Online Plus as a workaround (help.housecallpro.com/en/articles/2154660).
- Real buyer language, Jobber community forum (fetched): "In my ideal world a technician would be able to add a line item and enter a part number and it would say 'you have this in your truck'â€¦" â€” community.getjobber.com/discussions/service-based-skilled-trades/inventory-management/4964
- Cost of the status quo: FSM suites "don't manage what's physically on your trucks very well" (eturns.com Katy Plumbing case study); duplicate purchases ("You just paid for something you already owned" â€” knowify.com); forgot-to-bill parts erode margin (repair-crm.com; vendor estimate 5â€“10% of profit â€” labeled inference).
- ~$285 per stockout-driven return trip; missing parts are the top repeat-visit driver for 41% of service leaders (IFS via simprogroup.com â€” vendor-mediated).

## Positioning
**"Van stock that closes the loop."** Generic scanner apps ($15â€“45/mo: HomyScan, StockZip) stop at counting. Enterprise suites (ServiceTitan ~$245â€“500/tech/mo; FieldEdge Elite-only) gate real inventory behind enterprise pricing. Workiz gates vehicle inventory behind ~$225/mo Ultimate. StockRig does ONLY van stock â€” but does the whole loop: par levels â†’ usage against jobs â†’ billable-parts export â†’ restock list â€” at micro-shop pricing.
NOT a replacement for the FSM. It feeds it. (CSV export first; native Jobber/HCP sync = post-revenue.)

## Pricing (decision D6, REVISED v1.1 after red-team â€” see redteam/report.md)
- **Free â€” forever:** every feature, unlimited vans & parts, local data. The product IS the marketing.
- **Concierge Setup â€” $99 one-time:** we import your parts spreadsheet, load your vans, set par levels from trade templates, deliver your first printed restock lists. (Services attach; no demo-gated sales calls.)
- ~~Pro $29/mo~~ KILLED by red-team: Ply ships the same feature set free for teams â‰¤15 (getply.com/pricing, fetched 2026-08-22). Competing at $29/mo against $0 with native Jobber/HCP sync was not viable.
- Future revenue path: platform sync integrations (Jobber/HCP) as paid tier once self-serve distribution exists.

## Why now
1. QBO/HCP-style price hikes push micro shops to audit every subscription (business2community.com QB coverage) â€” cheap point solutions win attention.
2. FSM incumbents are bundling UP (enterprise), not down; Jobber still ships zero inventory in 2026.
3. Ply validates the wedge but is integration-locked and priced for larger fleets (unpublished; requires platform plans).

## Go-to-market (first 30 days, $0)
1. Answer the demand where it lives: the Jobber Community thread IS the spec sheet â€” reply with free tool, no pitch-first.
2. r/HVAC, r/Plumbing, r/electricians: "I built free van-stock tracking" posts (organic rules permitting).
3. Free concierge offer: send us your parts spreadsheet â†’ we load your vans and return restock lists (services-as-marketing, costs time only).
4. Local SEO: "van stock list HVAC/plumbing" template pages â€” each template is linkbait that ranks (pipelineon.com shows the keyword space is active).
5. Demo video + founder letter embedded on landing page.

## Honest revenue math (inference, clearly labeled â€” REVISED v1.1)
- Original SaaS math (50 Ã— $348 â‰ˆ $17K ARR) was invalidated by the red-team finding that Ply ships the same feature set free for teams â‰¤15.
- v1.1 model: product free; revenue via Concierge Setup at $99 one-time. Realistic year-1: single-digit to low-double-digit setups (~$500â€“$2K) per the closed-channel analysis in redteam/report.md â€” a learning wedge and portfolio asset, not yet a business. Documented rather than massaged.

## Kill risks (pre-mortem, from tournament Judge 3)
| Risk | Mitigation |
|---|---|
| HCP/Jobber ship native van stock | Ship job-export loop they won't prioritize; stay FSM-agnostic |
| Ply moves down-market | Win on self-serve + free product vs Ply demo-gated free tier (revised v1.1) + platform-plan requirements (Ply needs paid HCP/Jobber tiers) |
| Data-entry grind kills retention | Par-level templates per trade; barcode-scan via phone camera later; CSV import day one |
| Episodic usage | Restock lists + billing exports recur weekly by nature of the workflow |

## Definition of done for this package
Working local app + seeded demo, marketing site, brand kit, launch video, founder letter video, red-team report, asset library README.

