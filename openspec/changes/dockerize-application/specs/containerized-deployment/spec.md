## ADDED Requirements

### Requirement: Docker Compose stack startup
The system SHALL provide a Docker Compose configuration that starts the database, backend API, and frontend web application with one documented command.

#### Scenario: Start complete web stack
- **WHEN** a user runs the documented Docker Compose startup command from the repository root
- **THEN** the database, backend, and frontend services are created on a shared Docker network

#### Scenario: Persist database data
- **WHEN** the Docker Compose stack is stopped and started again without deleting volumes
- **THEN** PostgreSQL data persists across the restart

### Requirement: Backend container runtime
The system SHALL provide a backend container image that installs the FastAPI runtime dependencies and starts the API server on port 8000.

#### Scenario: Backend health endpoint responds
- **WHEN** the Docker Compose stack is running and a request is sent to the backend health endpoint
- **THEN** the API returns a successful health response

#### Scenario: Backend uses Docker database hostname
- **WHEN** the backend runs inside Docker Compose
- **THEN** it connects to PostgreSQL using the Compose database service hostname instead of `localhost`

### Requirement: Frontend static serving and API proxy
The system SHALL provide a frontend container image that serves the built React application and proxies browser API requests under `/api` to the backend service.

#### Scenario: Frontend application loads
- **WHEN** a user opens the documented frontend URL in a browser
- **THEN** the React application is served successfully

#### Scenario: API requests are proxied same-origin
- **WHEN** the browser sends a request to `/api/health` through the frontend origin
- **THEN** the request is forwarded to the backend and returns the backend health response

#### Scenario: Client-side routes refresh successfully
- **WHEN** a user refreshes a frontend client-side route
- **THEN** the frontend server returns the React application entrypoint instead of a static 404

### Requirement: Docker-safe configuration
The system SHALL provide Docker-specific configuration examples that allow local demo startup without committing real secrets.

#### Scenario: Example environment is available
- **WHEN** a user inspects the repository after the change
- **THEN** there is a documented example of the environment variables needed for Docker startup

#### Scenario: Local secrets are not baked into images
- **WHEN** Docker images are built from the repository
- **THEN** local `.env` secret values are not copied into the image layers as application files

### Requirement: Docker operation documentation
The system SHALL document how to build, start, verify, stop, and troubleshoot the Dockerized application.

#### Scenario: User verifies stack after startup
- **WHEN** a user follows the Docker documentation after starting the stack
- **THEN** they can identify the frontend URL, backend health check, and expected service status

#### Scenario: User runs optional data workflow
- **WHEN** a user wants to run the existing mock data or ETL workflow in a Docker context
- **THEN** the documentation explains the supported command path or explicitly states any manual step that remains outside the default stack
