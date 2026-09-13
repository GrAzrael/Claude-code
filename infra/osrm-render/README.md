# OSRM on Render (free tier)

Alternative to self-hosting OSRM on an Oracle Cloud VM: this Dockerfile
builds a small routing graph for East Macedonia & Thrace and serves it as
a free Render web service. No VM, no SSH, no Oracle account needed.

## Deploy

1. Sign up / log in at **render.com** (GitHub login is enough — no card
   required for a free web service).
2. **New +** → **Web Service** → connect the `GrAzrael/Claude-code`
   GitHub repo (authorize Render to access it if asked).
3. Configure:
   - **Root Directory**: `infra/osrm-render`
   - **Runtime**: Docker (Render should auto-detect the Dockerfile)
   - **Instance Type**: Free
   - **Region**: closest to Europe (e.g. Frankfurt)
4. **Create Web Service**. The first build takes a while (10-20+ min) —
   it downloads the Greece OSM extract and preprocesses the routing graph
   during the Docker build itself.
5. Once it's live, copy the service URL Render gives you
   (`https://<something>.onrender.com`) — that's the `OSRM_BASE_URL` for
   `solver/.env`.

## Known limitations (free tier tradeoffs)

- **512MB RAM** — covers East Macedonia & Thrace comfortably, but not
  all of Greece. Widen/move the bounding box in the `Dockerfile` (the
  `osmium extract -b west,south,east,north` line) if you need a
  different region, but watch for out-of-memory failures on a bigger box.
- **Free services sleep after ~15 min of inactivity** and take 30-60s to
  wake up on the next request. Fine for testing, not for production.
- Changing the covered region means editing the bounding box and
  triggering a redeploy (full rebuild, since the graph is baked into the
  image at build time).

## Test it

```bash
curl "https://<your-service>.onrender.com/table/v1/driving/24.9421,41.1359;24.4033,40.9403"
```

(Xanthi -> Kavala.) A JSON response with `"code":"Ok"` means it's working.
