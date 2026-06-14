## ADDED Requirements

### Requirement: Dashboard Uses Warehouse Analytics Sources
The Power BI dashboard SHALL use the CentralizedEHR DWH and mart layer as its reporting source, with mart views preferred for aggregate visuals and DWH dimensions/facts used when model relationships or drill paths require them.

#### Scenario: Connect to prepared DWH
- **WHEN** the DWH schema has been applied and the ETL pipeline has loaded demo data
- **THEN** the dashboard setup SHALL identify the required SQL Server or PostgreSQL connection target and the required `mart` and `dwh` objects.

#### Scenario: Avoid direct OLTP reporting
- **WHEN** a report visual needs encounter, prescription, appointment, consent, or hospital mapping data
- **THEN** the visual MUST use the DWH or mart layer instead of querying OLTP application tables directly.

### Requirement: Dashboard Presents Core Healthcare Analytics Pages
The Power BI dashboard SHALL provide pages for executive overview, encounter trends, disease analytics, prescription analytics, appointment and consent operations, and HIS/patient mapping coverage.

#### Scenario: View executive overview
- **WHEN** an administrator opens the dashboard
- **THEN** the dashboard SHALL show total patients, hospitals, doctors, encounters, prescription lines, lab results, imaging reports, appointments, consents, and last refresh information.

#### Scenario: Analyze encounters
- **WHEN** a user opens the encounter analytics page
- **THEN** the dashboard SHALL show encounter volume by month, hospital, hospital level, doctor specialty, and service-completeness indicators for lab, imaging, and prescription availability.

#### Scenario: Analyze diseases and prescriptions
- **WHEN** a user opens disease or prescription analytics
- **THEN** the dashboard SHALL show top ICD-10 disease patterns and prescription usage by drug, month, quantity, and average duration where source data is available.

#### Scenario: Analyze operations and integration coverage
- **WHEN** a user opens operations or HIS integration analytics
- **THEN** the dashboard SHALL show appointment status, consent status, patient mapping totals, mapped patient counts, and local patient ID coverage by hospital.

### Requirement: Dashboard Supports Standard Filters And Drill Paths
The Power BI dashboard SHALL provide consistent filters for date period, hospital, hospital level, specialty, disease group, and drug group where those fields exist in the semantic model.

#### Scenario: Apply common filters
- **WHEN** a user filters the report by date period and hospital
- **THEN** all pages with compatible measures SHALL update consistently using shared date and hospital dimensions or equivalent mart fields.

#### Scenario: Drill from summary to detail category
- **WHEN** a user selects a hospital, disease, doctor specialty, or drug category from a summary visual
- **THEN** the dashboard SHALL support drill or cross-filter behavior to related visuals without exposing direct patient identifiers.

### Requirement: Dashboard Defines Measures And Validation Checks
The dashboard implementation SHALL document the measures, source objects, and validation checks needed to verify dashboard numbers against DWH and mart data.

#### Scenario: Validate dashboard totals
- **WHEN** dashboard totals are refreshed after ETL completes
- **THEN** documented validation queries or commands SHALL allow implementers to compare Power BI totals against `mart.vw_System_KPI_Overview` and relevant mart views.

#### Scenario: Detect stale or empty data
- **WHEN** required source tables or mart views contain no rows
- **THEN** the dashboard guide SHALL instruct the implementer to run the mock data generator, ETL pipeline, and pipeline check before treating the report as valid.

### Requirement: Dashboard Protects Patient Privacy
The Power BI dashboard MUST avoid displaying direct patient identifiers, identity numbers, insurance codes, or local HIS patient IDs as row-level report values.

#### Scenario: Display patient mapping coverage
- **WHEN** the dashboard reports patient mapping coverage
- **THEN** it SHALL show aggregate mapping counts and distinct mapped-patient counts by hospital, not individual local patient IDs.

#### Scenario: Export dashboard data
- **WHEN** a user exports data from a dashboard visual
- **THEN** exported fields MUST exclude direct patient identifiers and use aggregate or hashed warehouse fields only where patient-related data is necessary.

### Requirement: Dashboard Includes Refresh Workflow Documentation
The repository SHALL include guidance for refreshing dashboard data from the local demo pipeline through Power BI Desktop or Power BI Service.

#### Scenario: Refresh local demo dashboard
- **WHEN** a developer wants current demo data in the report
- **THEN** the documentation SHALL describe the order to generate or update OLTP demo data, run ETL, verify DWH counts, and refresh the Power BI dataset.

#### Scenario: Refresh fails due to connection settings
- **WHEN** Power BI cannot connect to the configured DWH
- **THEN** the documentation SHALL identify the connection variables, database names, schemas, and credentials that must be checked.
