# Mission: Build a Complete Company From Scratch

## 1. The Goal

Build a complete company from scratch. Start with nothing but the open internet. Find a real, painful, underserved problem that real people are complaining about **right now** and design a business around it. Then:

- Build the product
- Build the brand
- Build the website
- Hand over a finished package that could be taken to market this month
- Prove why it would work

This is a test of how far the agent can go on its own. The user will not answer questions mid-run. Every call must be made autonomously — write down why each decision was made and keep moving within the guardrails below.

> "I want to see your best work, not your safest work."

**Final output:** a `mission.md` file in this workspace containing this plan (this document).

---

## 2. Mission & Guardrails

### No new spending

- APIs whose keys already exist in `.env` are fair game:
  - `KIE_AI_API_KEY` (image generation)
  - `ELEVENLABS_API_KEY` (voice and sound)
  - `HEYGEN_API_KEY` (avatar video)
- Beyond those: no new paid services, no purchases, no signups that require payment info, no domain registration.
- Check domain availability — don't buy.
- Keep the entire business and development process free. Prefer free, open source, and free-tier tools wherever possible.
- If an API key is absolutely required and does not exist, **stop** and clearly state exactly which key is needed and why before proceeding. Do not assume access or create paid accounts.

### Publish nothing

- Everything stays local or in this repo (`company-builder-experiment/run-1/`).
- No deploying to the public internet, no posting anywhere, no emailing or messaging any real person.

### Invent nothing

- Every quote, stat, complaint, competitor fact, and market claim in deliverables must trace to a real URL that was actually fetched.
- If something is inferred, label it as inference.
- If something couldn't be verified, say so.
- A smaller thesis built on real evidence beats a grand one built on plausible fiction.

### Work inside projects

- All artifacts go in `company-builder-experiment/run-1/`.

### Never ask anything

- The user will not be watching or answering.
- Every question would normally be asked of the user must instead be answered with research and reasoning, then logged (question, answer, reasoning) in the build log.
- Blocked is not an option: if a tool or approach fails, find another route.
- If a phase stalls, ship the strong 80% version, note what got cut, and keep moving.
- Do not stop until the definition of done is met.

---

## 3. Orchestration Requirements

The prompt explicitly mandates using advanced multi-agent workflows:

- **Aggressive Workflows:** Use multi-agent workflows aggressively; fan out parallel researchers across different sources and angles.
- **Tournaments:** Run "tournaments" where independent agents pitch competing business ideas and judge panels score them.
- **Skeptic Agents:** Adversarially verify every important claim with skeptic agents whose only job is to refute it.
- **Completeness Critic:** Use a completeness critic before calling any phase done.
- **Custom Architectures:** Design whatever orchestration shapes the work calls for; the patterns above are a floor, not a ceiling.

---

## 4. The Arc

The step-by-step pipeline to take the company from concept to packaged reality:

1. **Hunt for pain** — Comb the open web for underserved problems real people are complaining about right now.
2. **Pick the winner** — Filter ideas using a competitive judge panel tournament.
3. **Design the business** — Deep dive into competitive research, pricing structures, and positioning.
4. **Build the brand** — Formulate visual guidelines, vector assets, logos, and taglines.
5. **Build the thing** — Develop local codebases, dashboards, and operational features.
6. **Make the launch video** — Produce an energetic, contextual product walkthrough video.
7. **Make the founder video** — Tie together cloned audio and video avatars for a strategic message from the founder.
8. **Try to kill it** — Deploy specialized red-team skeptic agents to aggressively stress-test and attack business viability.
9. **Package it** — Roll up all functional code, honest tracking data, and plans into an easy-to-explore final asset library.

Refer back to this document whenever guidance on goals or guardrails is needed during execution.
