# Affiliate Insider — My Life Module

Digital membership platform with two products (Business Model V1 — LOCKED):

- **Builder Pass** — $3 launch (30 days) → $9 lifetime
- **Monthly Build Pro** — $29/month (primary business)

See `docs/BUSINESS_MODEL.md` for full source of truth.

Future domain: [affiliateinsider.jimsaari.se](https://affiliateinsider.jimsaari.se)

## Quick start

```bash
cd my-life/affiliate-insider
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Funnel (MVP dev mode)

1. Landing → **Get Builder Pass**
2. Checkout → enter email → mock payment
3. Signup → create account → setup wizard
4. Vault dashboard

Without Supabase, auth uses local demo storage. With Supabase env vars, real auth is used.

## Folder structure

```
affiliate-insider/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/
│   ├── lib/
│   │   ├── pricing.ts          # Launch offer logic (LOCKED)
│   │   ├── constants.ts        # Builder Pass + Monthly Build Pro
│   │   └── affiliate/
│   └── types/
├── docs/
│   ├── BUSINESS_MODEL.md       # Source of truth (LOCKED)
│   └── ROADMAP.md
└── .cursor/rules/
    └── business-model-locked.mdc
```

## Architecture notes

| Layer | Purpose |
|-------|---------|
| `lib/pricing.ts` | Builder Pass launch offer ($3 → $9) |
| `lib/payment/` | Stripe placeholder; swappable providers |
| `lib/repositories/` | Single interface for UI; mock now, Supabase later |
| Roles | `VAULT_MEMBER` = Builder Pass · `VIP_MEMBER` = Monthly Build Pro (internal) |

## Environment

See `.env.example` — set `NEXT_PUBLIC_LAUNCH_DATE` for launch offer window.

## My Life integration

This module lives inside `my-life/` as a separate Next.js app for Vercel deployment.
