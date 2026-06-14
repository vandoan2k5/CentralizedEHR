## Why

CentralizedEHR already has an OLTP application, ETL pipeline, and DWH mart views, but it does not yet define a deliverable Power BI dashboard workflow for administrators and health management users. This change formalizes the dashboard capability so reporting can be built, validated, and refreshed consistently from the existing warehouse outputs.

## What Changes

- Add a Power BI dashboard capability for CentralizedEHR analytics.
- Define the expected dashboard pages, metrics, filters, and drill paths using the existing `dwh` and `mart` schemas as the primary data source.
- Add repository artifacts for Power BI connection guidance, dataset/model expectations, refresh workflow, and validation checks.
- Document how demo data, ETL output, and mart views support the dashboard.
- No breaking changes to the OLTP backend, frontend, or existing ETL contract.

## Capabilities

### New Capabilities

- `power-bi-dashboard`: Covers Power BI reporting requirements, source mart usage, dashboard pages, refresh expectations, and validation checks for CentralizedEHR analytics.

### Modified Capabilities

- None.

## Impact

- Affected areas: `database/dwh/`, `docs/`, and optional dashboard assets or templates added for Power BI users.
- Data dependencies: existing ETL outputs in `dwh` and mart views such as system KPI overview, encounter trends, disease ranking, prescription usage, appointment status, consent status, and patient mapping by hospital.
- Runtime dependencies: Power BI Desktop or Power BI Service for report authoring and viewing; SQL Server or PostgreSQL DWH connectivity depending on the target environment.
- Security considerations: dashboard guidance must avoid exposing direct patient identifiers and should rely on hashed or aggregated patient data already present in the warehouse layer.
