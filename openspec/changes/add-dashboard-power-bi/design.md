## Context

CentralizedEHR is a demo healthcare data platform with a FastAPI/PostgreSQL OLTP application, a Python ETL pipeline, and SQL Server/PostgreSQL DWH scripts. The SQL Server DWH script already creates `dwh` tables and `mart` views aimed at Power BI usage, including KPI overview, encounter trends, disease ranking, prescription usage, appointment status, consent status, and patient mapping by hospital.

The dashboard should be treated as an analytics deliverable over the DWH/mart layer, not as a replacement for the React operational dashboards. The primary users are administrators, health department users, and project evaluators who need summarized operational and clinical analytics across hospitals.

## Goals / Non-Goals

**Goals:**

- Define a Power BI report structure that uses the warehouse `mart` views and supporting `dwh` dimensions/facts.
- Provide repeatable setup documentation for connecting Power BI Desktop to the local SQL Server or PostgreSQL DWH.
- Define expected pages, visuals, filters, measures, refresh workflow, and validation checks.
- Keep sensitive patient identifiers out of visuals and dashboard-level exports.
- Make the implementation usable with generated demo data and the existing ETL pipeline.

**Non-Goals:**

- Build or replace the in-app React admin dashboard.
- Add production-grade Power BI tenant governance, gateways, or row-level security administration.
- Add real-time streaming analytics.
- Change the OLTP schema or HIS integration APIs.
- Introduce new patient-level personally identifiable information into the DWH.

## Decisions

1. Use the DWH/mart layer as the Power BI source.

   Rationale: The repository already separates operational records from analytics tables, and the mart views encode report-friendly aggregations. Using these views avoids coupling the report to OLTP transactional tables.

   Alternative considered: Connect Power BI directly to OLTP tables. This was rejected because it duplicates transformation logic, risks exposing direct identifiers, and makes dashboard metrics inconsistent with the ETL/DWH documentation.

2. Prefer import mode for the initial report template.

   Rationale: The project is a demo/local environment with modest generated data volume. Import mode gives fast visuals and simple setup in Power BI Desktop.

   Alternative considered: DirectQuery. This can be added later for larger or frequently changing data, but it adds connection and performance complexity that is unnecessary for the initial dashboard.

3. Define a star-style semantic model in Power BI.

   Rationale: Core facts should relate to shared date, hospital, doctor, disease, drug, and patient dimensions so filters behave consistently across pages.

   Alternative considered: A flat model from only mart views. This is simpler but limits cross-page drill-through and makes shared filters harder to validate.

4. Deliver the implementation as repository documentation plus optional Power BI template assets.

   Rationale: Binary `.pbix` files are hard to review in Git. A setup guide, measure catalog, validation checklist, and optional `.pbit` template provide a maintainable baseline while still supporting Power BI authoring.

   Alternative considered: Commit only a `.pbix` file. This was rejected because reviewers cannot easily diff report logic or verify source assumptions.

## Risks / Trade-offs

- [Risk] Power BI binary files are difficult to review in source control -> Mitigation: Keep the authoritative contract in Markdown documentation and treat any `.pbix` or `.pbit` as generated/supporting artifacts.
- [Risk] Local environments may use either SQL Server or PostgreSQL DWH scripts -> Mitigation: Document both connection paths and make the expected tables/views explicit.
- [Risk] Dashboard numbers can become stale if ETL is not run before refresh -> Mitigation: Include a refresh runbook and validation checks using `etl.check_pipeline` and mart row-count queries.
- [Risk] Patient privacy issues can arise from overly granular visuals -> Mitigation: Require aggregate dashboard visuals and prohibit direct display of identity numbers, insurance codes, or local patient IDs except as aggregated counts.
- [Risk] Mart view names differ by SQL dialect or case conventions -> Mitigation: Document required logical datasets and map them to the current SQL Server mart views, with notes for PostgreSQL equivalents when needed.

## Migration Plan

1. Verify the OLTP schema, DWH schema, mock data generator, and ETL pipeline run locally.
2. Add Power BI dashboard documentation under `docs/` covering data sources, model relationships, measures, pages, refresh, and validation.
3. Add or update SQL mart views only if required dashboard metrics are missing from the current DWH scripts.
4. Optionally add Power BI template assets under a dedicated dashboard folder, with documentation remaining the source of truth.
5. Validate the dashboard against generated demo data and record expected checks in the guide.

Rollback is documentation- and asset-level: remove the added Power BI guide/template artifacts and leave the existing OLTP, ETL, and DWH scripts unchanged unless later implementation explicitly modifies mart SQL.

## Open Questions

- Should the first implementation target SQL Server only, or include PostgreSQL connection screenshots/queries as first-class guidance?
- Will the final deliverable include a committed `.pbit` template, or only documentation that guides manual Power BI report creation?
- Are Vietnamese dashboard labels required for the final report, or should the report use English labels to match most current technical docs?
