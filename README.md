# TMS/WMS Thin Slice v1

A minimal, end-to-end slice of a larger multi-tenant TMS/WMS platform:
**order import → VRP route optimization → map view.** Built to prove the
core loop works before adding multi-tenancy, billing, HR/payroll, 3PL
contracts, or warehouse storage — all of which exist in the full platform
schema but are explicitly out of scope here.

## Flow

1. Dispatcher enters an order (form or CSV) in the React frontend.
2. Backend geocodes the address via LocationIQ and stores coordinates.
3. Backend calls the Python solver, which asks OSRM for a distance/time
   matrix (hub + all pending order stops) and runs OR-Tools VRP with
   per-vehicle capacity and time-window constraints.
4. The solver's per-vehicle stop sequences are written to `routes` /
   `route_stops`.
5. The frontend renders each vehicle's route as a colored line on a map.

## Stack (free tier only — no paid services)

| Component | Tech | Free tier |
|---|---|---|
| Database | Supabase (Postgres + PostGIS) | supabase.com |
| Backend | Node.js + Express + TypeScript | Render / Railway |
| VRP solver | Python + FastAPI + Google OR-Tools | any host with the above |
| Routing engine | OSRM (self-hosted) | Oracle Cloud free ARM instance |
| Geocoding | LocationIQ | 10,000 requests/day |
| Frontend | React + Vite + Leaflet | Vercel |

Stripe/billing is **not** part of this phase.

## Repo layout

```
db/          schema.sql (thin-slice tables) + functions.sql (lat/lng <-> PostGIS helpers)
backend/     Express + TypeScript API
solver/      FastAPI + OR-Tools VRP service
frontend/    React + Vite + Leaflet dispatcher UI
```

## Scope

**In scope now:** `tenants` (single row), `hubs`, `vehicles`, `orders`,
`routes`, `route_stops`.

**Explicitly out of scope** (present in the full platform schema, not
touched here): multi-tenant app logic / RLS enforcement, subscriptions
& billing, users/roles beyond one dispatcher, employees/shifts/payroll,
3PL contracts & billing rules, warehouse storage, vehicle sync groups,
driver app / proof of delivery, live tracking.

## What you need to provide before this runs end-to-end

This code is complete and builds/type-checks cleanly, but it can't talk to
real services without accounts this session doesn't have:

1. **A Supabase project** (free tier) — run `db/schema.sql` then
   `db/functions.sql` in its SQL editor, and give the backend the
   project's URL + `service_role` key.
2. **A LocationIQ API key** (free tier, 10k req/day) for geocoding.
3. **An OSRM instance** reachable over HTTP, with a Greece (or your
   region's) `.osm.pbf` extract pre-processed for the `driving` profile.
   The brief mentions a self-hosted Oracle Cloud free ARM VM for this —
   that VM and its URL aren't set up yet.

Nothing here costs money on the free tiers above, but they do require
you to create the accounts/instances and hand back the resulting
URLs/keys — ask before assuming any of this is already provisioned.

## Local setup

### 1. Database

Open your Supabase project's SQL editor and run, in order:
```
db/schema.sql
db/functions.sql
```

### 2. Solver (Python)

```bash
cd solver
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set OSRM_BASE_URL
uvicorn main:app --reload --port 8000
```

### 3. Backend (Node)

```bash
cd backend
npm install
cp .env.example .env   # set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOCATIONIQ_API_KEY
npm run dev
```

### 4. Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL if not http://localhost:4000
npm run dev
```

Then, once a hub and at least one vehicle exist (`POST /api/hubs`,
`POST /api/vehicles` — no UI for these yet, curl/Postman is fine for
now), add orders and click **Run VRP solver** in the dispatcher UI.

## Status

- [x] Thin-slice schema + PostGIS read/write helpers
- [x] Backend API: hubs, vehicles, orders (single + CSV), optimize, routes
- [x] VRP solver: OSRM matrix + OR-Tools with capacity/time-window
      constraints, smoke-tested against synthetic data
- [x] Frontend: order form, CSV upload, optimize trigger, Leaflet map
- [x] All three services build/type-check cleanly
- [ ] **Not yet tested against a real Supabase/LocationIQ/OSRM stack** —
      needs the accounts/keys above

This is intentionally rough where the brief asked for rough: no auth, no
retry/backoff on external calls, minimal styling. Ready for a first live
test as soon as credentials are provided.
