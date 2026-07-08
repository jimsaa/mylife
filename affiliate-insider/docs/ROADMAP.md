# Affiliate Insider — Implementation Roadmap

## Governing principles

**PRODUCT FIRST** — Infrastructure is complete. Every task must improve Learning · Building · Customer transformation.  
See `.cursor/rules/product-first.mdc`

**BUSINESS MODEL V1 — LOCKED** — Two products only: Builder Pass + Monthly Build Pro.  
See `docs/BUSINESS_MODEL.md` and `.cursor/rules/business-model-locked.mdc`

**BUILDER PASS PRODUCT RULE** — Guided Builder Journey, not course/docs/knowledge base. Every screen: Learn → Build → Complete → Continue. Onboarding is the UX benchmark.  
See `docs/BUILDER_JOURNEY.md` and `.cursor/rules/builder-pass-product-rule.mdc`

**North star:**
1. Builder Pass qualifies buyers and completes First Build Mission
2. Monthly Build Pro ($29/mo) is the primary business — members ship one project every month
3. Optimize Builder Pass for upgrades, not profit

---

## FROZEN — bug fixes only

| System | Rule |
|--------|------|
| Landing V1 | `landing-frozen.mdc` |
| Business Model V1 | `business-model-locked.mdc` |
| Affiliate Center V1 | `affiliate-center-frozen.mdc` |
| Manual payouts V1 | No payout API automation |
| Onboarding V1 | `onboarding-frozen.mdc` — UX benchmark for journey pages |
| Click tracking MVP | `/go/tool/[slug]` — no analytics expansion |

---

## CURRENT SPRINT — Builder Journey (mission-driven)

- [x] Setup wizard `/start-here` (UX benchmark)
- [x] Vault visual consistency (onboarding dark premium theme)
- [x] AI Tool Stack + Cursor (data-driven)
- [x] Click tracking wrapper
- [x] Business Model V1 locked
- [ ] **Mission 1 + journey entry** — `docs/BUILDER_JOURNEY.md`
- [ ] Transform `/vault/start` → mission hub (not reading guide)
- [ ] Wizard → Mission 1 path
- [ ] Progress tracking (Learn → Build → Complete → Continue)

**Vault libraries** (prompts, hooks, downloads): supporting assets — **reframe inside missions** later, not the journey itself.

**Not this sprint:** LMS infrastructure, course modules, browse-only documentation UX, Stripe subscriptions.

---

## BACKLOG (post-launch or explicit request)

### Payments & platform
- Supabase + real Stripe + webhooks (Builder Pass + Monthly Build Pro)
- Deploy to `affiliateinsider.jimsaari.se`

### Affiliate infrastructure
- Referral attribution at checkout, Stripe Connect, fraud, queues, Redis

### Growth & marketing
- Email, analytics, SEO, landing CRO

### My Life bridge
- Shared auth, unified dashboard

---

## Completed foundations

- [x] Landing funnel (frozen)
- [x] Checkout → signup → setup wizard
- [x] Vault + admin content CRUD
- [x] Affiliate Center + manual payouts (frozen)
- [x] Vault member area — dark premium theme (visual parity with onboarding)
