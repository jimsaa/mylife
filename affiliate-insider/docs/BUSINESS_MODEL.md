# Business Model V1 — LOCKED

**Status:** Official source of truth. **LOCKED.**

Future pricing changes require an **explicit founder decision**.

See also: `.cursor/rules/business-model-locked.mdc`

---

## Two products only

V1 launches with exactly **two products**. Do not build Lite, Enterprise, Teams, or additional tiers.

| Product | Role | Price |
|---------|------|-------|
| **Builder Pass** | Entry product | **$3** one-time (first 30 days after launch) → **$9** lifetime after |
| **Monthly Build Pro** | Primary business | **$29/month** |

---

## Product 1 — Builder Pass

**Purpose:** Qualify buyers and teach the AI Build Method.

**Not designed to maximize revenue.** Optimize for successful upgrades into Monthly Build Pro.

### Pricing

| Phase | Price |
|-------|-------|
| Launch offer (first 30 days after launch) | **$3** one-time |
| After launch window | **$9** lifetime |

### Includes

- AI Build Journey
- Human + AI Chat + AI Builder framework
- Setup Wizard
- First Build Mission
- Lifetime access

---

## Product 2 — Monthly Build Pro

**Purpose:** Every month, members build one complete digital project together.

**This is the primary business.** Builder Pass is the entry funnel.

### Price

**$29/month**

### Example monthly builds

KDP · SaaS · Lead Magnet · Affiliate Website · Printables · Directories · Automation · AI Tools

### Includes

- New Build Mission every month
- Complete step-by-step build guide
- Cursor prompts
- AI Chat prompts
- Templates
- Assets
- Project files
- Live Monthly Q&A
- Full Build Archive

---

## Pricing philosophy

| Product | Strategy |
|---------|----------|
| **Builder Pass** | Low friction · Easy decision · Qualifies buyers |
| **Monthly Build Pro** | Premium recurring · Members stay because they build something valuable every month |

---

## North star

1. **Builder Pass:** Buyer completes First Build Mission and understands the AI Build Method.
2. **Monthly Build Pro:** Member stays because each month they ship a real digital project.
3. **Business:** Builder Pass → Monthly Build Pro upgrades drive recurring revenue.

Do **not** optimize Builder Pass for profit. Optimize it for **upgrade readiness**.

---

## Technical constants

| Constant | Location |
|----------|----------|
| Builder Pass / Monthly Build Pro | `src/lib/constants.ts` |
| Launch offer logic | `src/lib/pricing.ts` |
| Affiliate commissions | `src/lib/affiliate/constants.ts` |
| Launch date env | `NEXT_PUBLIC_LAUNCH_DATE` |

---

## Do not build (pricing)

- Additional pricing tiers
- Lite plans
- Enterprise
- Teams
- VIP as a separate product name (use Monthly Build Pro)

---

## Legacy names (replaced)

| Old | New |
|-----|-----|
| AI Income Builder | Builder Pass |
| Monthly Build @ $19/mo | Monthly Build Pro @ $29/mo |
| VIP membership | Monthly Build Pro |
| Vault Member (customer-facing) | Builder Pass member |
| $9-only positioning | $3 launch → $9 lifetime |

---

## Product definition (LOCKED)

| Builder Pass is | A guided Builder Journey |
| Builder Pass is not | A course, documentation, or knowledge base |

Customer loop: **Learn → Build → Complete → Continue**

**UX standard:** `docs/BUILDER_JOURNEY.md` — onboarding is the design benchmark for every journey page.

Internal code may retain `VAULT_MEMBER` role until subscription billing ships.
