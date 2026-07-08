# Affiliate Center — Architecture

**Status: FROZEN V1 (approved).** No infrastructure work until post-launch paying customers.

See `.cursor/rules/affiliate-center-frozen.mdc` for what not to build.

Phase X growth system for member referrals. **Mock data + JSON store today; Supabase-ready.**

## Business model (V1 locked)

| Product | Price | Commission |
|---------|-------|------------|
| **Builder Pass** | $3 launch (30 days) → $9 lifetime | 50% one-time |
| **Monthly Build Pro** | $29/month | 25% recurring |

See `docs/BUSINESS_MODEL.md` — **do not change without founder decision.**

## Access control

- `hasAffiliateCenterAccess()` in `src/lib/affiliate/access.ts`
- Requires: authenticated + completed purchase of `builder_pass` (legacy: `vault_lifetime`)
- Admin bypass for testing
- Sidebar hides "Affiliate Center" until `/api/affiliate/access` returns true

## Commission rules

Constants: `src/lib/affiliate/constants.ts` (uses `src/lib/pricing.ts` for launch offer)

## Data layer

```
src/types/affiliate.ts
src/data/mock/affiliate-center.ts
src/lib/repositories/affiliate-repository.ts
data/store/database.json
supabase/affiliate-schema.sql
```

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/affiliate/access` | Sidebar gating |
| `GET /api/affiliate/dashboard` | Full member dashboard payload |
| `GET /api/admin/affiliates` | Admin list + stats |
| `PUT /api/admin/affiliates/[id]` | Approve/disable/commission override |
| `GET /api/admin/affiliates/payouts/export` | CSV export stub |

## Referral attribution (future)

1. Landing `?ref=CODE` → `ReferralCapture` sets `ai_ref` cookie (30 days)
2. Checkout reads cookie → stores `referral_id` on purchase (not wired yet)
3. Webhook creates `affiliate_referrals` + `affiliate_commissions`

## North star

Affiliate Center earns attention **after** Builder Pass buyers complete First Build Mission and are ready to recommend the platform.
