# Project Cards

Homepage cards + admin CRUD for jimsaari.se.

## Where to save (important)

**Save cards at http://localhost:3006/admin/project-cards** with `npm run dev`.

`jimsaari.se` is a static SPA on Vercel. Express + SQLite do not run there, so saves on the production admin URL fail until the serverless Project Cards API is deployed and Vercel Blob is connected.

## Local (SQLite)

```bash
npm run dev
```

- API: Express + SQLite (`server/`) on port 3001
- UI: Vite on port 3006 (proxies `/api`)
- Admin: http://localhost:3006/admin/project-cards

## Production (Vercel)

Auth already runs as serverless. Project Cards serverless routes live under `api/project-cards` and `api/admin/project-cards`.

**Durable writes require Vercel Blob:**

1. Vercel Dashboard → project → **Storage** → create a **Blob** store
2. Connect it to the jimsaari / my-life project (injects `BLOB_READ_WRITE_TOKEN`)
3. Redeploy

Without Blob, list endpoints return an empty set; create/update/delete return HTTP 503 with a clear error.

Local SQLite and Vercel Blob are separate stores (cards do not auto-sync between them).
