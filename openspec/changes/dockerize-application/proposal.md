## Why

CentralizedEHR currently requires separate local setup for Python, Node.js, PostgreSQL, and optional ETL/DWH scripts, which makes onboarding and demo runs fragile across machines. Dockerizing the application provides a repeatable way to run the FastAPI backend, React frontend, PostgreSQL database, and supporting data workflows from a single command.

## What Changes

- Add containerized deployment support for the application using Docker Compose.
- Add a backend image that installs Python dependencies and runs the FastAPI app with Docker-safe database and CORS configuration.
- Add a frontend image that builds the Vite/React app and serves the static build through Nginx.
- Add an Nginx reverse proxy rule so browser requests to `/api` reach the backend while the frontend remains same-origin.
- Add a PostgreSQL service with persistent storage and health checks.
- Add Docker environment examples for local demo usage without committing secrets.
- Add optional ETL/data pipeline execution guidance for Docker-based runs.
- Update documentation with build, startup, health check, and troubleshooting steps.

## Capabilities

### New Capabilities

- `containerized-deployment`: Defines how the project can be built, configured, started, and verified using Docker containers.

### Modified Capabilities

- None.

## Impact

- Affected code and config: root Docker Compose files, backend Dockerfile/config inputs, frontend Dockerfile/Nginx config, Docker ignore rules, environment examples, and README/docs.
- Affected runtime systems: FastAPI backend, React frontend, PostgreSQL database, optional Redis/ETL components if included in the compose topology.
- No API contract changes are expected; frontend API calls should continue using `/api`.
- No database schema changes are required for the Docker deployment itself.
