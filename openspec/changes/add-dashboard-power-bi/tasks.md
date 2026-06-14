## 1. Source And Metric Inventory

- [x] 1.1 Review current SQL Server and PostgreSQL DWH scripts for available `dwh` tables and `mart` views.
- [x] 1.2 Map each required dashboard page to source views, tables, dimensions, facts, and fields.
- [x] 1.3 Identify any missing mart view or measure needed for KPI overview, encounters, diseases, prescriptions, appointments, consents, or patient mapping.

## 2. Dashboard Documentation

- [x] 2.1 Create a Power BI dashboard guide under `docs/` with connection prerequisites for SQL Server and PostgreSQL DWH targets.
- [x] 2.2 Document the recommended Power BI semantic model, including table imports, relationships, filter dimensions, and privacy-safe field usage.
- [x] 2.3 Document dashboard pages, required visuals, slicers, drill or cross-filter behavior, and expected source objects.
- [x] 2.4 Document DAX measures or measure definitions for all core KPIs and page-level metrics.

## 3. Data Mart Support

- [x] 3.1 Add or update mart SQL only if required dashboard metrics are not available from existing views.
- [x] 3.2 Keep SQL Server and PostgreSQL DWH guidance aligned where both dialects are supported.
- [x] 3.3 Ensure any new mart output avoids direct patient identifiers and exposes aggregate or hashed patient-related fields only.

## 4. Refresh And Validation Workflow

- [x] 4.1 Document the local refresh order: apply schemas, generate mock OLTP data, run ETL, run pipeline checks, then refresh Power BI.
- [x] 4.2 Add validation queries or commands that compare Power BI totals with `mart.vw_System_KPI_Overview` and related mart views.
- [x] 4.3 Document troubleshooting for empty data, stale data, missing connection settings, and failed DWH connectivity.

## 5. Optional Power BI Assets

- [x] 5.1 Add a dedicated dashboard asset folder if a `.pbit`, screenshots, or exported model documentation is created.
- [x] 5.2 Keep Markdown documentation as the reviewable source of truth for any binary Power BI asset.

## 6. Verification

- [x] 6.1 Run available formatting or lint checks for changed Markdown and SQL files.
- [x] 6.2 Run or document the ETL validation command used to confirm DWH/mart data availability.
- [x] 6.3 Review the final artifacts against the `power-bi-dashboard` spec requirements.
