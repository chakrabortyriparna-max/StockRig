# Brand & Marketing Site

## Voice rules (from brand/brandbook.md — enforce on any customer-facing copy)
- Jobsite plain talk. Short sentences. Numbers over adjectives.
- Never shame the tech — van chaos is the industry's fault, not theirs.
- Approved example: "You own 14 thermostats. You can find zero."
- Banned style: "streamline your workflow" / SaaS-abstraction slop.

## Identity constants
- Name: **StockRig** ("rig" = work van). Tagline: **Know what's on the truck.**
- Colors: Rig Orange `#F25C05` (action/alert only, never decorative), Charcoal `#1C1E22`, Steel `#8A9199`, Bed White `#F7F5F2`, Stock Green `#2E9E6B`, Alert Red `#D64545`
- Logo: "The Par Line" — bins against a dashed par line, orange bin dipping below. SVGs in `brand/` and `website/assets/`
- Fonts: Inter/system-ui stack; monospace for part numbers (no O/0 ambiguity)

## Website conventions (`website/index.html`)
- Single static file, inline CSS, no build step
- **Every market claim carries a real source link** (competitor pricing table footnoted with vendor pages + "as of Aug 2026"). Adding a claim without a fetched source violates the project honesty rule.
- The footer discloses: local demo package, stubbed checkout buttons, nothing leaves the machine. Keep the disclosure when editing.
- Pricing section must match business/plan.md exactly — it was rewritten in v1.1 (Free forever + $99 Concierge Setup) after red-team killed the $29/mo model. Do not reintroduce subscription claims without a plan change.

## Evidence hierarchy for claims
1. Fetched primary source with URL (best)
2. Search-surfaced secondary (label it)
3. Inference (must be labeled "inference")
