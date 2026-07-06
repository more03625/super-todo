# Deployment

The project ships two compose specs and picks one per machine:

| File | Used by | URLs |
|------|---------|------|
| `docker-compose.yml` | Local machines (the default) | `localhost` |
| `docker-compose.prod.yml` | Production server | `${SERVER_HOST}` (your IP/domain) |

Selection happens through the root `.env` file, which Docker Compose reads
automatically and which honors `COMPOSE_FILE`. Local machines have no `.env`
and get the default file; the prod server sets `COMPOSE_FILE` once. The daily
command is identical everywhere: `docker compose up --build`.

`.env` is gitignored, so each machine's choice never gets committed.

## Server runbook

```bash
cd /path/to/super-todo
git pull

# ── one-time setup ──
cp .env.example .env
# then edit .env: uncomment COMPOSE_FILE and fill in SERVER_HOST, JWT_SECRET,
# POSTGRES_PASSWORD (see the comments in .env.example)

# ── every deploy ──
# Verify the right file is selected BEFORE building — every URL below must
# show the production IP/domain, NOT localhost:
docker compose config | grep -iE "url|origin"

docker compose up -d --build
docker compose ps
```

To verify the app: open `http://<SERVER_HOST>:3003`, and check
`http://<SERVER_HOST>:8000/health` returns `{"status":"ok"}`.

## What's different in the prod spec

- **Postgres is not published to a host port** — it is reachable only on the
  internal Docker network, so it is never exposed to the public internet.
- **`restart: unless-stopped`** on all services, so they come back after a
  server reboot.
- **Named volume for Postgres data** (`postgres_data`), so the database
  survives `docker compose down` and redeploys. (`down -v` still deletes it —
  never run that on the server unless you mean to wipe the DB.)
- **No source bind mounts** — code is baked into the images at build time.
- **`NEXT_PUBLIC_API_URL` is a build arg**, not a runtime env var: `next build`
  bakes it into the JS bundle, so changing it requires a rebuild.
- Secrets (`JWT_SECRET`, `POSTGRES_PASSWORD`) come from the server's `.env` and
  are required — the build fails loudly if they're missing.

## Build-time vs runtime variables

| Variable | Kind | Why |
|----------|------|-----|
| `NEXT_PUBLIC_API_URL` | **Build-time** (`build.args`) | Baked into the frontend JS bundle by `next build`; a container restart cannot change it |
| `FRONTEND_URL` (CORS origins) | Runtime (`environment:`) | Read by FastAPI at startup; comma-separated list, e.g. `http://localhost:3003,http://1.2.3.4:3003` |
| `DATABASE_URL`, `POSTGRES_*` | Runtime | Read by the backend/Postgres at startup |
| `JWT_SECRET` | Runtime | Read by the backend at startup |

## Known pitfalls

- **Building before creating `.env`**: if you run `docker compose up --build`
  on the server before `.env` exists, everything builds with localhost URLs.
  Always run the `docker compose config | grep -iE "url|origin"` verification
  first. (The prod file also refuses to run without `SERVER_HOST` set, so a
  half-configured `.env` fails loudly rather than silently building wrong.)
- **Docker build cache**: changing a build arg correctly busts the cache, but
  if in doubt: `docker compose build --no-cache frontend`.
- **Browser cache**: after redeploying a frontend whose API URL changed, do a
  hard refresh (Ctrl+F5) — old JS chunks may still point at the old URL.
  Verify in DevTools → Network that API calls hit the expected host.
- **"Failed to fetch" in the browser** almost always means CORS rejection, a
  wrong baked-in API URL, or the backend dying mid-request (e.g. OOM on a
  large in-memory export — stream large responses instead) — not an HTTP error
  from the route. Check the CORS allowlist (`FRONTEND_URL`) and the Network tab
  before blaming the endpoint.
- **Changing `POSTGRES_PASSWORD` after first deploy** does nothing to an
  existing database volume — Postgres only reads it on first init. Update the
  password inside Postgres (`ALTER USER`) or wipe the volume.
