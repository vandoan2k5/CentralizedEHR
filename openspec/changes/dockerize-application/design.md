## Context

CentralizedEHR is a demo EHR platform with a FastAPI backend, React/Vite frontend, PostgreSQL OLTP database, and optional ETL/DWH scripts. Local setup currently requires users to install and coordinate Python, Node.js, npm, PostgreSQL, and environment variables manually. The frontend uses relative `/api` calls, the backend reads settings from environment variables or `.env`, and the backend currently initializes database tables and seed data at startup.

The Docker design must preserve the existing local development path while adding a repeatable containerized path for demos and onboarding.

## Goals / Non-Goals

**Goals:**

- Provide a single Docker Compose entry point for running the web application and database.
- Build a backend container from the existing FastAPI app and `backend/requirements.txt`.
- Build a production frontend container from the Vite app and serve it through Nginx.
- Keep frontend API calls same-origin by proxying `/api` to the backend service.
- Configure container-to-container database URLs using Compose service names.
- Persist PostgreSQL data across container restarts.
- Document Docker startup, verification, teardown, and troubleshooting.
- Leave room for optional ETL/DWH commands without making them mandatory for the web app startup path.

**Non-Goals:**

- Replacing local non-Docker development workflows.
- Introducing Kubernetes, cloud deployment, CI/CD, or production secrets management.
- Reworking database migrations beyond the existing startup initialization behavior.
- Changing API routes, frontend behavior, authentication, or data model semantics.
- Containerizing Power BI Desktop or SQL Server DWH backup restore flows.

## Decisions

### Use Docker Compose as the local orchestration layer

Docker Compose will define services for `db`, `backend`, and `frontend`, with optional support for ETL/data commands. This matches the project scale and keeps onboarding simple.

Alternative considered: separate manual `docker build`/`docker run` commands. That would be harder to document and more error-prone because service networking, environment variables, and startup order must be repeated manually.

### Serve the frontend with Nginx and proxy `/api`

The frontend image will use a multi-stage build: Node.js builds the Vite app, then Nginx serves the generated static files. Nginx will route `/api` requests to `backend:8000`.

Alternative considered: running `npm run dev` in the frontend container. That is useful for development but less representative of a deployable demo and still depends on Vite proxy behavior. Nginx also handles browser refreshes for client-side routes cleanly.

### Use Compose service names for internal database connectivity

The backend container will use `postgresql+asyncpg://postgres:postgres@db:5432/postgres` and `postgresql+psycopg2://postgres:postgres@db:5432/postgres`. ETL commands that use psycopg2 will use a plain `postgresql://postgres:postgres@db:5432/postgres` URL if run in a container.

Alternative considered: using `localhost` inside containers. That would point to the container itself, not the database service, and would break Compose networking.

### Keep database initialization minimal for the first Docker pass

The Compose setup will rely on the backend startup `init_db()` path to create OLTP tables and seed demo data. DWH SQL execution can be documented as an optional follow-up command or included as optional initialization only if implementation verifies idempotency.

Alternative considered: mounting all SQL files into `/docker-entrypoint-initdb.d/`. This can be useful, but mixing SQL schema initialization with SQLAlchemy `create_all()` and ad hoc migration statements increases the chance of duplicate or order-dependent setup issues.

### Use example Docker environment files, not committed secrets

The implementation will add a Docker-specific example env file with demo-safe defaults. Real `.env` values remain local and should not be baked into images.

Alternative considered: copying the repository `.env` into images. That risks leaking machine-specific paths or secrets and makes the image non-portable.

## Risks / Trade-offs

- Backend may start before PostgreSQL is fully ready -> Add database health checks and Compose `depends_on` health conditions where supported.
- SQLAlchemy startup initialization is convenient but not a full migration system -> Document that this Docker setup targets local demo/onboarding and does not replace production migrations.
- Frontend route refreshes may 404 under static serving -> Configure Nginx SPA fallback to `index.html`.
- ETL uses a different PostgreSQL URL format than the async backend -> Document the distinction and avoid reusing the async URL for psycopg2 commands.
- Windows path and line-ending differences can affect Docker builds -> Keep Docker files path-stable and avoid host-specific absolute paths.

## Migration Plan

1. Add Docker and Nginx configuration files without removing existing local run instructions.
2. Build images locally with Docker Compose.
3. Start the stack and verify `GET /api/health` through the frontend origin.
4. Verify the React app loads and can log in using seeded demo data.
5. Document optional commands for ETL/DWH setup and validation.

Rollback is to stop the Compose stack and continue using the existing Python/npm/PostgreSQL local workflow. No application data migration is required for adoption.

## Open Questions

- Should Redis be included in the initial Compose stack even though it is currently configured but not clearly required by the app?
- Should DWH schema initialization be automated in Compose or left as an explicit documented command?
- Should there be a separate development Compose override that runs Vite dev server and backend reload mode?
