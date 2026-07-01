# SuperToDo

Analytics-first personal operating system for productivity tracking.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0, Alembic |
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Database | PostgreSQL 16 |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended), **or**
- Python 3.13+, Node.js 20+, PostgreSQL 16 running locally
- Git

## Environment Setup

1. Copy the root env template for reference:

```bash
cp .env.example backend/.env.development
```

2. For **local development** (backend on your machine, not in Docker), edit `backend/.env.development`:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432          # use 5434 if you only run Postgres via Docker (see below)
DATABASE_URL=postgresql+asyncpg://supertodo:supertodo_dev@localhost:5432/supertodo
FRONTEND_URL=http://localhost:3003
```

3. For **Docker**, the backend container uses `backend/.env.development` as-is (`POSTGRES_HOST=postgres`).

> Keep `JWT_SECRET` and database credentials in sync with your Postgres instance. Do not commit real secrets.

---

## Run the Entire Project (Docker — recommended)

Starts PostgreSQL, runs migrations, then launches the API and frontend.

```bash
# From the project root
docker compose up --build
```

**What happens on startup:**

1. **Postgres** starts and waits until healthy
2. **Backend** runs `alembic upgrade head` (applies all migrations), then starts FastAPI on port `8000`
3. **Frontend** starts Next.js on port `3003`

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3003 |
| Backend API | http://localhost:8000/api/v1 |
| Swagger docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

**Stop everything:**

```bash
docker compose down
```

**Reset database (fresh migrations from scratch):**

```bash
docker compose down -v
docker compose up --build
```

---

## Run Locally (without Docker for app code)

Useful when developing backend or frontend outside containers.

### 1. Start PostgreSQL

**Option A — Postgres only via Docker:**

```bash
docker compose up postgres -d
```

Postgres is exposed on **localhost:5434** (see `docker-compose.yml`). Set in `backend/.env.development`:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
DATABASE_URL=postgresql+asyncpg://supertodo:supertodo_dev@localhost:5434/supertodo
```

**Option B — Local PostgreSQL install:** create database `supertodo` and user matching `.env.development`.

### 2. Backend — install, migrate, run

```bash
cd backend
pip install -r requirements.txt

# Apply all Alembic migrations (creates tables + seeds achievements)
alembic upgrade head

# Start API with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend — install and run

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3003** and calls the API at `http://localhost:8000/api/v1`.

---

## Database Migrations (Alembic)

> **Run from `backend/`** — not the project root. Alembic needs `alembic.ini` in the current directory.

Migrations live in `backend/alembic/versions/`.

**Before migrating locally**, start Postgres:

```bash
docker compose up postgres -d
```

Local `.env.development` uses `localhost:5434` (Docker maps Postgres to port **5434** on your machine). The hostname `postgres` only works inside Docker and causes `getaddrinfo failed` if used locally.

| Command | Purpose |
|---------|---------|
| `alembic upgrade head` | Apply all pending migrations (use after pull or schema changes) |
| `alembic current` | Show current migration revision |
| `alembic history` | List all migrations |
| `alembic downgrade -1` | Revert the last migration |
| `alembic downgrade base` | Revert all migrations |

**After changing SQLAlchemy models**, generate a new migration:

```bash
cd backend
alembic revision --autogenerate -m "describe_your_change"
alembic upgrade head
```

Review the generated file in `alembic/versions/` before applying.

**Initial migration** (`001_initial_schema`) creates all Phase 1 tables and seeds achievement definitions.

---

## Verify Everything Works

1. Open http://localhost:3003
2. Register a new account
3. Create a task on the **Tasks** page
4. Check the **Dashboard** for score and stats
5. Confirm API health: http://localhost:8000/health → `{"status":"ok"}`

---

## Project Structure

```
super-todo/
├── backend/
│   ├── app/
│   │   ├── controllers/   # HTTP handlers (ResponseHandler)
│   │   ├── services/      # Business logic (ErrorHandler)
│   │   ├── repositories/  # Database access
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── alembic/           # Migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/           # Next.js pages
│       ├── components/    # UI components
│       └── services/      # API client
├── docker-compose.yml
├── AGENT.md               # Coding standards
└── .env.example
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port **3003** already in use | Stop other Next.js apps or change port in `frontend/package.json` and `docker-compose.yml` |
| Port **8000** already in use | Stop other APIs or change the backend port mapping |
| Migration fails mid-run | `docker compose down -v` then `docker compose up --build` for a clean DB |
| Frontend can't reach API | Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` (Docker sets this automatically) |
| `alembic` connection error locally | Ensure Postgres is running (`docker compose up postgres -d`) and `DATABASE_URL` uses `localhost:5434`, not `postgres` |
| `No config file alembic.ini` | Run alembic from **`backend/`**, not the repo root |

---

See [AGENT.md](AGENT.md) for coding standards.
