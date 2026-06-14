## 1. Docker Build Inputs

- [x] 1.1 Add root `.dockerignore` rules to exclude virtual environments, node modules, build outputs, caches, local env files, and git metadata from Docker build contexts.
- [x] 1.2 Add a backend Dockerfile that installs `backend/requirements.txt`, copies the backend application, and runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- [x] 1.3 Add a frontend multi-stage Dockerfile that installs npm dependencies, builds the Vite app, and copies the production build into an Nginx runtime image.

## 2. Runtime Configuration

- [x] 2.1 Add an Nginx configuration for the frontend container that serves static assets, falls back to `index.html` for client-side routes, and proxies `/api` to `backend:8000`.
- [x] 2.2 Add a Docker environment example with container-safe `DATABASE_URL`, `DATABASE_URL_SYNC`, `REDIS_URL`, `JWT_SECRET`, and `CORS_ORIGINS` values.
- [x] 2.3 Ensure Docker images do not copy local `.env` secrets into image layers.

## 3. Compose Stack

- [x] 3.1 Add a root Docker Compose file with `db`, `backend`, and `frontend` services on one network.
- [x] 3.2 Configure PostgreSQL credentials, exposed ports, persistent volume, and health check for the `db` service.
- [x] 3.3 Configure backend environment variables, port mapping, and startup dependency on healthy PostgreSQL.
- [x] 3.4 Configure frontend port mapping and dependency on the backend service.

## 4. Optional Data Workflow

- [x] 4.1 Document or add a supported Docker command path for running mock data generation with a psycopg2-compatible PostgreSQL URL.
- [x] 4.2 Document or add a supported Docker command path for running the ETL pipeline and pipeline check in Docker context.
- [x] 4.3 Decide whether DWH schema initialization is automated or manual, then document the chosen behavior clearly.

## 5. Documentation

- [x] 5.1 Update project documentation with Docker prerequisites and the command to build/start the stack.
- [x] 5.2 Document frontend URL, backend health checks, Swagger URL, and expected seeded demo behavior.
- [x] 5.3 Document teardown, volume reset, logs, rebuilds, and common troubleshooting cases.
- [x] 5.4 Preserve existing non-Docker local run instructions.

## 6. Verification

- [x] 6.1 Build the Docker images successfully with Docker Compose.
- [x] 6.2 Start the stack and verify the frontend serves the React app.
- [x] 6.3 Verify `/api/health` works through the frontend origin and directly through the backend mapping if exposed.
- [x] 6.4 Verify backend database initialization and demo login behavior work against the Compose PostgreSQL service.
- [x] 6.5 Verify stopping and restarting the stack preserves PostgreSQL data when volumes are retained.
