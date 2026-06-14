## ADDED Requirements

### Requirement: Generate varied mock master data
The mock data generator SHALL create sufficiently varied patients, hospitals, doctors, ICD-10 entries, drugs, lab tests, and related master data so generated datasets do not rely on one repeated sample pattern.

#### Scenario: Generate configurable patient volume
- **WHEN** the generator is run with a requested patient count greater than the current fixed sample size
- **THEN** it creates that number of distinct mock patients using varied names, genders, dates of birth, identity numbers, insurance codes, and optional contact values

#### Scenario: Avoid obvious repeated master records
- **WHEN** master data is seeded
- **THEN** hospitals, doctors, disease entries, drugs, and lab test options include multiple distinct Vietnamese-facing values suitable for demo dashboards and ETL validation

### Requirement: Use Vietnamese with accents for Vietnamese-facing data
The mock data generator SHALL use proper Vietnamese with accents for fields intended to be displayed or interpreted as Vietnamese text.

#### Scenario: Seed Vietnamese display text
- **WHEN** the generator creates Vietnamese-facing fields such as patient names, hospital names, addresses, symptoms, clinical notes, appointment reasons, consent purposes, dosage instructions, disease names, drug descriptions, or imaging conclusions
- **THEN** those values contain Vietnamese text with accents instead of ASCII-only placeholder text

#### Scenario: Preserve accented text through insert
- **WHEN** generated Vietnamese text is inserted into the OLTP database
- **THEN** the stored values preserve UTF-8 accented characters without mojibake or accent loss

### Requirement: Generate clinically coherent encounter scenarios
The mock data generator SHALL generate encounters from disease scenarios that keep diagnoses, symptoms, specialties, labs, imaging, prescriptions, and follow-up behavior clinically plausible for demo use.

#### Scenario: Match encounter details to diagnosis
- **WHEN** an encounter is generated for a selected ICD-10 scenario
- **THEN** the symptoms, clinical notes, doctor specialty, lab tests, imaging probability, prescribed drugs, and follow-up appointment reason are selected from data compatible with that scenario

#### Scenario: Vary encounter text
- **WHEN** multiple encounters are generated for the same diagnosis scenario
- **THEN** their symptoms, clinical notes, dosage instructions, and conclusions vary across available templates instead of repeating one fixed sentence

### Requirement: Support reproducible random generation
The mock data generator SHALL support deterministic output when a random seed is provided and varied output when no seed is provided.

#### Scenario: Reproduce dataset with seed
- **WHEN** the generator is run twice with the same generation options and the same seed against an empty target database
- **THEN** it produces equivalent mock records for the generated data domain

#### Scenario: Generate varied dataset without seed
- **WHEN** the generator is run without an explicit seed
- **THEN** it may produce different generated values across runs while still satisfying schema constraints and clinical scenario rules

### Requirement: Include controlled edge cases
The mock data generator SHALL include configurable or bounded probabilities for realistic edge cases without making the dataset invalid.

#### Scenario: Generate optional missing values
- **WHEN** patient and transactional data are generated
- **THEN** a bounded subset of optional fields, such as phone numbers or appointment notes, may be missing while required fields remain valid

#### Scenario: Generate operational state variation
- **WHEN** appointments and consents are generated
- **THEN** statuses include realistic variation such as pending, confirmed, completed, cancelled, active, revoked, and expired records

#### Scenario: Generate abnormal clinical observations
- **WHEN** lab results are generated
- **THEN** a bounded subset includes abnormal or out-of-range values consistent with the selected disease scenario

### Requirement: Preserve schema and ETL compatibility
The mock data generator SHALL remain compatible with the existing OLTP tables and downstream ETL transformation expectations.

#### Scenario: Seed without schema migration
- **WHEN** the enhanced generator runs against the current database schema
- **THEN** it inserts data without requiring new tables, columns, or schema migrations

#### Scenario: Transform generated data through ETL
- **WHEN** generated OLTP mock data is read by the existing ETL transformation flow
- **THEN** the transforms can produce dimensional and fact outputs without failing because of the new data variety or accented Vietnamese text
