# The StockRig Interview — 32 Questions, Every Aspect
Authored by the AI founding team, 2026-08-22. Every factual claim traces to fetched sources in `research/`; inferences are labeled. This is designed to be answered on the fly — a founder could give these answers verbatim.

## I. Origin & Pain

**1. Why does StockRig exist?**
Because small trades shops run two inventories: the one in their software and the one rusting in the van. Jobber — the tool many of them pay for — ships no native parts inventory at all (fsmadvisor.com/reviews/jobber), and Housecall Pro's own help center tells people to use QuickBooks as a workaround.

**2. How do you know the pain is real and not invented?**
We didn't invent it; we documented it. A Jobber community thread reads like our spec sheet: a shop owner describing exactly the product we built ("enter a part number and it would say 'you have this in your truck'"). A plumbing owner told eTurns their FSM "doesn't manage what's physically on your trucks very well."

**3. What does this pain cost?**
Stockout-driven return trips run ~$285 per incident and missing parts are the top repeat-visit driver for 41% of service leaders (IFS research via Simpro — vendor-mediated, we label it). Unbilled parts are described by vendors as eroding 5–10% of profit — that one's vendor inference, we say so.

**4. Why vans specifically? Why not general inventory?**
Because that's where the gap is. Generic apps count bins and stop. Enterprise suites track everything but price like ServiceTitan (~$245–500/tech/mo). Nobody serves the five-van shop's truck stock well.

**5. Who hurts most?**
The 2–4 tech HVAC/plumbing/electrical owner-operator. Big enough that van chaos bleeds money daily; too small for enterprise contracts or a $299/mo MAX plan.

## II. Product

**6. In one sentence, what does it do?**
Every van becomes a tracked location; parts get par levels per truck; used parts land on jobs; restock lists write themselves.

**7. Walk me through a week with it.**
Monday: tech opens Van 12, sees CAP-45-5 is OUT. Restock list already says order 6. Friday: export billable-parts CSV, every capacitor used this week is on an invoice. Mark billed. Done.

**8. What's the loop?**
Four moves: set par levels per van → use parts on jobs → export billable CSV → hand the auto-built restock list to the supply house. Nothing else ships.

**9. What makes it different from a spreadsheet?**
A spreadsheet doesn't know Van 12 from Van 07, can't alert below par, can't split used-from-billed, and can't hand each tech a per-truck order list.

**10. Is there a mobile app?**
It's a web app that runs anywhere a browser runs — including a phone in the van. Native app later, after the loop proves itself.

**11. What happens to my data?**
It lives in a file you own, with rotating backups and atomic writes. Export everything to CSV anytime. No lock-in is a feature, not an oversight.

## III. Evidence & Market

**12. How big is this market?**
Honest answer: modest. We're not pretending it's a VC story — the plan models low six-figure ARR ceilings. It's a cash-flow wedge.

**13. Who else does this?**
Ply — free for teams up to 15, integrated into Jobber/HCP. HomyScan ($19/mo), StockZip (free tier), KinetiX (needs HCP MAX). We know; a red-team agent made us read Ply's pricing page out loud.

**14. So why would anyone pick you over free Ply?**
Different shape: we're self-serve with zero demo calls, FSM-agnostic, data-portable, and we sell a $99 concierge setup instead of a subscription. Some shops will always prefer that. We'll find out how many.

**15. Isn't the demand evidence stale?**
Partly — the Jobber thread is ~a year old and was answered with a Ply recommendation. That's exactly why our pricing changed mid-build. The pain quotes are current; the "nobody serves it" claim is gone.

**16. What did your own red team find?**
That our original business model was dead on arrival, our flagship quote was stale, and Reddit channels ban tool promotion. We kept the product, killed the subscription, and wrote it down.

## IV. Pricing & Business Model

**17. Why free forever?**
Because van-stock shouldn't need a demo call, and because our competitor's free tier made $29/mo indefensible. Free is the honest price for v1.

**18. How do you make money then?**
$99 one-time concierge setup: we import the parts spreadsheet, load the vans, set par levels from trade templates. Paid when we save a weekend, not while you sleep.

**19. What's the long-term revenue path?**
Platform sync integrations as a paid tier once distribution exists — if shops prove they'll pay for convenience.

**20. What are realistic year-one numbers?**
Single-digit to low-double-digit concierge setups. Roughly $500–$2K. Labeled inference, stated plainly.

## V. Red Team & Honesty

**21. You attacked your own business?**
Two adversarial agents: one tried to break the code, one tried to kill the company. Both published reports live in `redteam/report.md`.

**22. What did the code attack find?**
Real bugs: a silent data-wipe path, par levels that were hardcoded fiction, negative quantities increasing stock. All fixed and re-verified same-session.

**23. Why keep the kill report public?**
Because a smaller true story beats a grand shaky one. The package includes the evidence against itself.

**24. Did anything survive the attack intact?**
The pain, the product, the wedge vs. big FSM suites, and the honesty of the package. The subscription didn't.

## VI. Tech & Build

**25. What's it built with?**
Node's built-in http module, vanilla JS, JSON-file storage. Zero npm packages, zero build step, zero paid APIs.

**26. Why so primitive?**
Constraint breeds proof. One file holds the whole state machine; you can read the entire backend in one sitting and see there's nothing up your sleeve.

**27. How do you protect data?**
Atomic writes (temp+rename), rotating backups, fail-loud corruption handling that exits rather than resets, validation at every boundary, localhost-only binding.

**28. Who built this — really?**
Autonomous AI agents, orchestrated: parallel researchers, judge panels, builders, red-teamers, a completeness critic. A human set guardrails and never answered a question mid-run.

## VII. Design & Brand

**29. What's the brand idea?**
"The Par Line" — bins stacked against a dashed minimum line, one orange bin dipping below it. Hi-vis orange reserved strictly for things needing a tech's eyes now.

**30. Why does the site look like this?**
Charcoal, film grain, a continuous camera flight from supply house to van to dashboard — because the product is about knowing what's physically *there*. Motion is scroll-scrubbed, not decorative.

## VIII. Future

**31. What's next?**
Twenty concierge setups to prove willingness to pay for convenience. Then the Jobber/HCP sync as the first paid tier. Then barcode scanning via phone camera.

**32. What would make you shut it down?**
If twenty setups show nobody values convenience either — then the honest move is what we did before: write the postmortem, keep the artifact, move on.
