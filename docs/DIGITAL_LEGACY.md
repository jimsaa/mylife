# Digital Legacy Module V1

Permanent core module of My Life: a **dead man's switch** (not an emergency login).

If the owner becomes incapacitated or passes away, designated legacy contacts can securely gain access after a configurable inactivity period — **without passwords ever being emailed**.

## Flow

1. **Monthly life check** — email to `OWNER_EMAIL` with an "I'm Alive" one-time link
2. Clicking the link updates `last_confirmed_alive`
3. **Reminders** — Month 1 and Month 2 if no confirmation
4. **Month 3** — Legacy activation: one-time signed tokens emailed to enabled contacts
5. Contacts open `/legacy?token=…`, verify, and **create their own password**
6. Role from config (default `legacy_viewer`) is granted; access is audited

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/admin/arv` | Admin session | Configure contacts, schedule, audit log |
| `/legacy` | Public | Claim token / legacy login |
| `/legacy/confirm?token=` | Public | "I'm Alive" confirmation |

## API

### Public (`/api/legacy/public/*` — no admin cookie)

- `GET /confirm?token=` — confirm alive
- `GET /verify?token=` — verify activation token (does not consume)
- `POST /claim` — `{ token, password }` create password + session
- `POST /login` — `{ email, password }`
- `POST /logout`
- `GET /session`
- `POST /cron` — `Authorization: Bearer $LEGACY_CRON_SECRET`

### Admin (`/api/legacy/*` — requires admin session)

- `GET /status`, `PUT /config`
- `GET|POST /contacts`, `PUT|DELETE /contacts/:id`
- `GET /audit`
- `POST /confirm-alive`, `/send-life-check`, `/trigger-activation`, `/run-scheduler`

## Security

- Passwords are **never** emailed
- Tokens are random 32-byte values, HMAC-signed in URLs, stored as SHA-256 hashes
- One-time use; configurable expiry (default 72h)
- Legacy passwords hashed with scrypt
- Separate HttpOnly cookie from admin gate (`my_life_legacy_session`)
- Full audit log for emails, confirmations, activations, failures

## Configuration (admin UI + `legacy_config`)

- Check interval (default 30 days)
- Reminder 1 / 2 / activation day offsets (30 / 60 / 90)
- Token lifetime hours (72)
- Legacy role name
- Public base URL for email links
- Multiple contacts: name, relationship, email, priority, enabled

## Environment

See root `.env.example`:

- `OWNER_EMAIL` — where life checks go
- `PUBLIC_BASE_URL` — e.g. `https://jimsaari.se`
- `LEGACY_TOKEN_SECRET` — signing secret
- `EMAIL_PROVIDER=console|resend` + `RESEND_API_KEY` for real email
- `LEGACY_CRON_SECRET` — for external cron
- `LEGACY_SCHEDULER=0` to disable in-process hourly scheduler

## Welcome & Legacy Instructions (V1.1)

After a legacy contact claims access:

1. **`/legacy/welcome`** — first-time Welcome page (once). Field: `legacy_access.legacy_intro_completed`.
2. Continue → sets the flag → **`/legacy/instructions`** (family handbook).
3. From instructions → **Enter My Life** → `/admin`.

Welcome title/body and all instruction sections are **editable in admin** under Digital Legacy tabs:

Welcome Message · Legacy Instructions · Legacy Contacts · Audit · Settings

Nothing in the handbook is hardcoded in the UI — defaults are seeded into the database once.

See also Digital Legacy V1 dead-man's switch docs above.

