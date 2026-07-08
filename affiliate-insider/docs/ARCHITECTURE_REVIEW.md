# Phase 2 — Architecture Review

Senior SaaS architect assessment before real customers.

## What changed in Phase 2

| Layer | Implementation |
|-------|----------------|
| Persistence | JSON file store (`data/store/database.json`) — single source of truth for content, users, purchases, progress |
| Admin | `/admin` with role-gated layout, CRUD for all content types |
| Member experience | API-driven vault, What's New, Monthly Drops, onboarding progress, global search |
| Email | Pluggable `emitEmailEvent()` — noop provider today |
| Auth | HttpOnly session cookie + server-side `getServerSession()` |

---

## 1. Architecture improvements recommended

### Before launch (critical)

1. **Migrate JSON store → Supabase**
   - JSON is fine for solo admin dev; it will corrupt under concurrent writes on Vercel serverless.
   - Run `supabase/schema.sql` and swap `content-repository` internals to Supabase client.
   - Keep the same repository function signatures so UI does not change.

2. **Replace demo auth with Supabase Auth**
   - Current cookie stores full user JSON in base64 — not signed, not secure for production.
   - Use `@supabase/ssr` middleware + JWT validation.
   - Admin role should live in `profiles.role`, not email string matching.

3. **Real Stripe before marketing spend**
   - Checkout currently completes without payment verification.
   - Webhook must be the only path that grants `VAULT_MEMBER`.

### Soon after launch (high value)

4. **Persist favorites server-side** — currently client-only; members lose saves on new device.

5. **Copy/view analytics** — wire `CopyButton` and tool card views to increment counters for admin placeholders.

6. **Supabase Storage** for download files — admin uploads PDFs instead of external URLs only.

7. **Signed admin actions audit log** — who published what, when.

---

## 2. Technical debt inventory

| Debt | Severity | Notes |
|------|----------|-------|
| JSON file database | **High** | Not safe for multi-instance Vercel |
| Unsigned session cookie | **High** | User can forge ADMIN role |
| `registerUser` on every login | Medium | Creates duplicate users by email — needs upsert |
| Mock hooks still 100 generated items | Low | Admin can trim; seed is heavy |
| Dual auth paths (localStorage + cookie) | Medium | Old `auth-context` unused in vault — remove |
| `items_included` comma hack in editor | Low | Use repeatable field UI in admin |
| No image upload for Monthly Drops | Medium | URL-only for now |
| Progress tracking not tied to real actions | Medium | Manual checkbox only — should auto-complete on copy/download |
| AffiliateProgram type lost `apply_url` | Low | Mapped to `website_url` / `affiliate_url` |

---

## 3. Change before real customers

**Must fix:**

- [ ] Supabase + RLS (members only see published content)
- [ ] Supabase Auth (no forged sessions)
- [ ] Stripe Checkout + webhook-granted access
- [ ] Password hashing (never store plaintext — currently login does not verify password!)
- [ ] `ADMIN_EMAIL` env only in server code, not client

**Should fix:**

- [ ] Email confirmation on signup
- [ ] Rate limit `/api/auth/login` and `/api/search`
- [ ] Backup strategy for content database
- [ ] Terms + privacy on checkout

**Product (not code):**

- [ ] Add 20+ real prompts before ads — perceived value drives Builder Pass conversion
- [ ] One real Monthly Drop with downloadable PDF
- [ ] Replace placeholder testimonials before launch

---

## 4. What Phase 2 got right

- **Admin never touches DB** — CRUD UI for all content types ✓
- **Published / draft / featured** — content workflow ready ✓
- **What's New** auto-feed on publish ✓
- **Onboarding checklist** with % completion ✓
- **Payment + email architecture** swappable ✓
- **Monthly Build Pro** role (`VIP_MEMBER`) in types/schema — billing not built ✓

---

## Admin access (dev)

1. Go to `/login?redirect=/admin`
2. Email: `admin@jimsaari.se` (or `ADMIN_EMAIL` env)
3. Any password — **dev only** until Supabase Auth ships

## Member access (dev)

1. Checkout with any email → Signup → Vault
