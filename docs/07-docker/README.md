# Docker Run Guide

This guide runs the CentralizedEHR demo stack with Docker Compose:

- FastAPI backend
- React/Vite frontend served by Nginx
- Optional ETL/data commands
- Optional local PostgreSQL database

The existing Python/npm local workflow remains supported.

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2
- Ports `8080` and `8000` available on the host
- A repository root `.env` file with the official database/Supabase settings

Check Docker:

```powershell
docker --version
docker compose version
```

## Start The Web Stack

From the repository root:

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:8080`
- Backend health through Nginx: `http://localhost:8080/api/health`
- Backend health direct: `http://localhost:8000/api/health`
- Swagger UI: `http://localhost:8080/docs`

The backend reads environment variables from the repository root `.env` file. If that file points to Supabase, the containers use Supabase instead of the optional local PostgreSQL service.

## Demo Login Smoke Test

Use one of these seeded or fallback accounts:

| Role | Username | Password |
| --- | --- | --- |
| Admin fallback | `admin@syt.gov.vn` | `password123` |
| Doctor seeded user | `doctor1@test.com` | `123456` |
| Patient seeded user | `patient1@test.com` | `123456` |

## Environment

Docker reads runtime configuration from the repository root `.env` file. This lets the backend and ETL containers use the same official database and Supabase settings as the local workflow.

Important values:

```env
DATABASE_URL=postgresql+asyncpg://...
DATABASE_URL_SYNC=postgresql+psycopg2://...
SUPABASE_URL=...
SUPABASE_KEY=...
CORS_ORIGINS=["http://localhost:8080","http://localhost:5173","http://localhost:3000"]
```

Do not copy local secrets into Docker images. The root `.dockerignore` excludes `.env` and other `.env.*` files from build contexts. Compose still reads `.env` at runtime through `env_file`.

## Stop, Reset, And Rebuild

Stop containers and keep PostgreSQL data:

```powershell
docker compose down
```

Delete containers and the optional local database volume:

```powershell
docker compose down -v
```

Rebuild after Dockerfile or dependency changes:

```powershell
docker compose build --no-cache
docker compose up
```

View logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose --profile local-db logs -f db
```

## Optional Local PostgreSQL

If you want to run against the local Compose PostgreSQL database instead of Supabase, start the stack with the `local-db` profile and set the database URLs in `.env` to the Compose service host:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/postgres
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@db:5432/postgres
```

Then run:

```powershell
docker compose --profile local-db up --build
```

## Optional Data And ETL Workflow

The default stack does not automatically initialize DWH schemas. This avoids mixing SQLAlchemy OLTP startup with one-time DWH SQL execution.

When using the optional local database, start it first:

```powershell
docker compose --profile local-db up -d db
```

Create or refresh the DWH schema manually:

```powershell
docker compose --profile data run --rm etl sh -c 'psql "$DATABASE_URL" -f database/dwh/centralizedehr_dwh_postgresql.sql'
```

Generate extra mock OLTP data:

```powershell
docker compose --profile data run --rm etl python scripts/generate_mock_oltp_data.py --encounters 100
```

Run ETL and check counts:

```powershell
docker compose --profile data run --rm etl python -m etl.run_pipeline
docker compose --profile data run --rm etl python -m etl.check_pipeline
```

The ETL container reads `DATABASE_URL` from `.env`, which must be a psycopg2-compatible URL for ETL commands. Do not use the backend async URL for ETL commands.

## Troubleshooting

If `http://localhost:8080/api/health` fails, check backend logs:

```powershell
docker compose logs backend
```

If backend logs show database connection errors, confirm the database URLs in `.env` are reachable from inside Docker. For Supabase, use the remote host and credentials from the official `.env`. For the optional local database, confirm the `db` service is healthy:

```powershell
docker compose --profile local-db ps
```

If frontend refreshes on nested routes fail, verify `frontend/nginx.conf` is present in the image by rebuilding the frontend:

```powershell
docker compose build frontend
docker compose up frontend
```

If ports are already in use, change the left side of the port mapping in `docker-compose.yml`, for example `8081:80`.
