# My Life

Local-first personal productivity and life management application — a single-user "Life Operating System".

## Principles

- **Local-first** — all data stays on your machine in SQLite
- **Private** — no accounts, auth, cloud sync, or subscriptions
- **Swedish UI** — labels and prompts in Swedish; code in English
- **Extensible** — modular architecture prepared for future AI features

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend  | Node.js, Express                    |
| Database | SQLite (better-sqlite3)             |
| Charts   | Recharts                            |
| Calendar | FullCalendar                        |

## Project structure

```
my-life/
├── client/                 # React frontend
│   └── src/
│       ├── api/            # API client
│       ├── components/     # Reusable UI (ui, layout, charts)
│       ├── lib/            # Constants, formatting
│       ├── pages/          # Route pages (Swedish UI)
│       └── types/          # Shared TypeScript types
├── server/                 # Node.js API
│   ├── data/               # SQLite database (created on first run)
│   └── src/
│       ├── db/             # Connection, migrations, seeds
│       ├── migrations/     # SQL migration files
│       ├── routes/         # Express route handlers
│       ├── services/       # Business logic
│       ├── types/          # Server types
│       └── modules/        # Future feature modules (AI, etc.)
└── package.json            # Root scripts
```

## Setup

### Prerequisites

- Node.js 20+
- npm

### First-time install

```bash
cd my-life
npm run setup
```

This installs dependencies, runs migrations, and seeds default projects.

### Development

Start both frontend and backend:

```bash
npm run dev
```

No extra CLI arguments are required.

On startup, the terminal prints **Local** and **Network** URLs, for example:

```
My Life frontend
  Local:   http://localhost:3006
  Network: http://192.168.1.25:3006
```

- **Frontend (local)**: http://localhost:3006
- **Frontend (network)**: http://192.168.x.x:3006 (your laptop’s Wi-Fi IP)
- **API**: http://0.0.0.0:3001 (listens on all interfaces; proxied via Vite at `/api`)

The frontend dev server always uses port **3006** and binds to **0.0.0.0** so phones and tablets on the same Wi-Fi can connect.

If port 3006 is already in use, startup stops with a clear error showing which process is blocking the port (process name and PID on Windows/macOS/Linux).

### Mobile access on the same Wi-Fi

Use My Life from a phone or tablet while the laptop is running locally — no deployment required.

1. Connect **laptop and phone to the same Wi-Fi**.
2. On the laptop, start My Life:

   ```bash
   npm run dev
   ```

3. Note the **Network** URL in the terminal (e.g. `http://192.168.1.25:3006`).
4. Open that URL in the mobile browser.

**Troubleshooting:** go to **Inställningar** → **Anslutningstest**. It shows the current hostname, local URL, network URL, and server status. Use **Kopiera nätverks-URL** to copy the address for your phone.

If the page does not load on mobile, check Windows Firewall allows Node.js on private networks.

### Production preview

After building, preview the production bundle on the same default port:

```bash
npm run build
npm run preview
```

Opens http://localhost:3006. The same port conflict check applies before preview starts.

### Individual commands

```bash
npm run dev:client    # Frontend only (port 3006)
npm run dev:server    # Backend only (port 3001)
npm run migrate       # Run pending migrations
npm run seed          # Seed default projects and settings
npm run build         # Build frontend for production
npm run preview       # Preview production build (port 3006)
```

## Database

- **File**: `server/data/my-life.db`
- **Migrations**: `server/src/migrations/*.sql`
- **Seeds**: `server/src/db/seeds/run.ts`

### Tables

`projects`, `time_entries`, `calendar_events`, `daily_notes`, `daily_focus`, `daily_wellbeing`, `sleep_logs`, `sleep_sessions`, `sleep_metrics`, `sleep_imports`, `food_entries`, `taxi_shifts`, `goals`, `settings`

### Seed projects

High Pressure Bets, CabRadar, MakerWorld Download Machine, Digital Product Factory, Monster Energy Collector, Taxi, Administration, Familj, Egentid — each with a distinct color.

## Features (V1)

| Module        | Route            | Description                              |
| ------------- | ---------------- | ---------------------------------------- |
| Översikt      | `/`              | Dashboard with personalized hero profile |
| Kalender      | `/kalender`      | Weekly calendar with drag-and-drop       |
| Tid           | `/tid`           | Timer and manual time entries            |
| Projekt       | `/projekt`       | Project management with hour stats       |
| Statistik     | `/statistik`     | 7/30-day charts and summaries            |
| Journal       | `/journal`       | Daily reflection journal                 |
| Välbefinnande | `/valbefinnande` | Energy, mood, stress check-in            |
| Sömn          | `/somn`          | Sleep logging + screenshot import        |
| Mat           | `/mat`           | Simple calorie awareness (2500 kcal goal) |
| Taxi          | `/taxi`          | Shift tracking and trends                |
| Mål           | `/mal`           | Life goals with progress                 |
| Inställningar | `/installningar` | Profile, avatar, connection test         |

## Personalized dashboard hero

The dashboard opens with a hero section showing:

- Circular avatar (120×120, teal accent ring)
- Time-based Swedish greeting (`God morgon/dag/kväll, Jim`)
- Today and week life summaries
- Dynamic motivational insight from your data
- Quick action buttons (tid, taxi, sömn, mat, journal)

Configure profile under **Inställningar** (`/installningar`):

- Upload, replace, or remove avatar (PNG/JPG/WEBP, max 5 MB)
- Edit display name
- Avatars stored locally in `server/data/avatars/`

Settings keys: `display_name` (default: Jim), `avatar_path`

## API

All endpoints are prefixed with `/api`:

- `GET /api/health` — status plus local/network URLs for mobile troubleshooting
- `GET /api/profile` — profile settings and avatar URL
- `PUT /api/profile` — update display name
- `POST /api/profile/avatar` — upload avatar
- `DELETE /api/profile/avatar` — remove avatar
- `GET /api/profile/avatar` — serve avatar image
- `GET /api/dashboard`
- `GET|POST /api/projects`
- `GET|POST /api/time-entries` (+ `/timer/start|pause|resume|stop`)
- `GET|POST /api/calendar`
- `PUT /api/journal`
- `PUT /api/wellbeing`
- `GET|POST /api/sleep`
- `POST /api/sleep-import/extract` — OCR/AI extraction from screenshot
- `POST /api/sleep-import/save` — save confirmed import
- `POST /api/sleep-import/check-duplicates`
- `GET /api/sleep-import/sessions`
- `GET /api/sleep-import/history`
- `GET|POST /api/food`
- `GET|POST /api/taxi`
- `GET|POST /api/goals`
- `GET /api/stats/summary/:days`
- `GET /api/stats/trends/:days`
- `GET /api/stats/insights-context` (prepared for future AI)

## Samsung Sleep Import V2

On **Sömn** (`/somn`), click **Importera Samsung-sömn** for the daily morning routine.

### Morning workflow

1. Take 3 Samsung Health screenshots: **Översikt**, **Sömnfaktorer**, **Sömnstadier**
2. Upload all 3 at once in My Life
3. Review grouped extraction with confidence scores
4. **Bekräfta** if any field is flagged, then **Spara**
5. See **Morgonberedskap** (personal readiness indicator, not medical advice)

### Pipeline

- **Classify** each image (Overview / Sleep Factors / Sleep Stages / Blood Oxygen)
- **Extract** with screen-specific rules (not generic OCR)
- **Merge** into one session (highest confidence wins)
- **Validate** sleep score (flags suspicious values like 76 → 10)
- **Never auto-save** suspicious or unconfirmed fields

### Regression tests

```bash
npm run test:samsung-sleep
```

Canonical fixtures: `tests/samsung-sleep/` (add your 3 PNG screenshots + `expected.json`).

---

## Sleep screenshot import (generic)

On **Sömn** (`/somn`), click **Importera sömnbild** to upload a Samsung Health (or similar) screenshot.

### Flow

1. Upload screenshot
2. OCR + optional AI vision extracts all sleep-related fields
3. Review extracted data on confirmation screen ("Jag hittade följande information:")
4. Edit or remove fields, then click **Spara**
5. Duplicate detection prompts: **Uppdatera**, **Behåll båda**, or **Avbryt**

### Extraction strategy

- **AI vision** (optional): set `openai_api_key` in settings via `PUT /api/stats/settings/openai_api_key`
- **OCR fallback**: Tesseract.js with Swedish + English, plus flexible regex heuristics
- **Unknown metrics**: stored in `sleep_metrics` with original label, value, and unit

### Settings

| Key | Purpose |
| --- | --- |
| `openai_api_key` | Enables AI vision extraction (leave empty for OCR-only) |
| `sleep_import_vision_model` | OpenAI model (default: `gpt-4o-mini`) |

Screenshots are stored locally in `server/data/sleep-screenshots/`.

## Future expansion

Architecture hooks exist for:

- AI-generated life insights (`statsService.getInsightsContext()`)
- AI productivity coach
- AI meal calorie estimation
- Barcode food scanning
- Google Calendar import
- Habit tracking, weight tracking, monthly reviews
- Burnout risk detection

See `server/src/modules/` for module extension points.

## Workload indicator

Dashboard workload color is based on logged hours today:

- **Green**: 0–5 hours
- **Yellow**: 5–7 hours
- **Red**: 7+ hours

Goal: move toward 4–5 focused hours per day while maintaining wellbeing.
