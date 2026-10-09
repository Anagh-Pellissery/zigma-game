# All-in Put

React (Vite) front end + one Vercel serverless function (`api/game.js`) + Supabase Postgres.

- All game rules (credits, stock, bids, timer phases) run inside Postgres functions in `supabase/schema.sql`.
  Mutations are serialized with a lock, so many teams can bid/buy at the same moment safely.
- The browser never gets write access: it can only read the `public_state` snapshot (live via Supabase Realtime)
  and call the API, which checks a signed session token before calling the database with the secret key.

## One-time database setup

Supabase Dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
It creates the tables, locks them down, and seeds the shop components and auction items. Re-running it is safe.

## Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | server + build | project URL |
| `SUPABASE_PUBLISHABLE_KEY` | build | baked into the browser bundle (read-only access to `public_state`) |
| `SUPABASE_SECRET_KEY` | server only | never exposed to the browser |
| `SESSION_SECRET` | server only | long random string; changing it logs everyone out |
| `ADMIN_PASS` | server only | admin login is username `admin` + this password |

Locally these live in `client/.env` (git-ignored).

## Run locally

```
npm install
npm run dev
```

`npm run dev` serves the API too (see `vite.config.js`).

## Deploy to Vercel

1. Import the repo in Vercel, set **Root Directory** to `all-in-put/aio/client` (framework: Vite).
2. Add the five environment variables above (Production + Preview).
3. Deploy. Routes: `/#/` team login, `/#/admin-login`, `/#/display` shop board, `/#/auction-display` auction board.
