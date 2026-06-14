## 1. Data Pools and Scenarios

- [x] 1.1 Inventory current seed constants in `scripts/generate_mock_oltp_data.py` and identify every Vietnamese-facing field that currently uses ASCII-only or repeated placeholder text
- [x] 1.2 Create or refactor local mock data pools for Vietnamese patient names, hospitals, addresses, doctors, specialties, ICD-10 diseases, drugs, lab tests, symptoms, notes, dosage instructions, appointment reasons, consent purposes, and imaging conclusions
- [x] 1.3 Define disease scenario structures that bind ICD-10 code, Vietnamese disease name, likely symptoms, specialties, lab tests, imaging probability, drug options, follow-up behavior, and severity ranges
- [x] 1.4 Ensure all Vietnamese-facing pool values are stored as UTF-8 Vietnamese with accents

## 2. Generator Controls

- [x] 2.1 Add CLI options for configurable patient count while preserving the existing `--encounters` option
- [x] 2.2 Add a `--seed` CLI option and route all random choices through a deterministic random generator when the seed is provided
- [x] 2.3 Keep existing default command behavior usable for quick local seeding

## 3. Master Data Generation

- [x] 3.1 Generate distinct mock patients from configurable demographic profiles, including varied identity numbers, insurance codes, dates of birth, genders, names, and optional phone numbers
- [x] 3.2 Seed expanded hospitals and doctors with Vietnamese names, addresses, levels, practicing licenses, and specialties
- [x] 3.3 Seed expanded ICD-10 and drug master data with Vietnamese names, groups, and descriptions compatible with the scenario definitions
- [x] 3.4 Preserve existing upsert/conflict behavior so repeated runs do not create invalid duplicate master records

## 4. Transaction Generation

- [x] 4.1 Generate encounters by selecting a patient profile, disease scenario, compatible hospital, and compatible doctor specialty
- [x] 4.2 Generate varied accented Vietnamese symptoms and clinical notes from scenario-specific templates
- [x] 4.3 Generate lab results from scenario-specific tests, including bounded normal and abnormal values with units and normal ranges
- [x] 4.4 Generate imaging reports only according to scenario probability and use varied accented Vietnamese conclusions
- [x] 4.5 Generate prescriptions from scenario-compatible drugs with varied accented Vietnamese dosage instructions, quantities, and durations
- [x] 4.6 Generate appointments and consents with realistic status variation, follow-up reasons, notes, purposes, and date ranges
- [x] 4.7 Add bounded edge cases for missing optional values, cancelled appointments, expired consents, chronic follow-up visits, and repeated encounters

## 5. Validation and Tests

- [x] 5.1 Add validation or tests proving seeded generation with the same seed and options is reproducible
- [x] 5.2 Add validation or tests confirming Vietnamese accented text survives generation and database insert without mojibake
- [x] 5.3 Add validation or tests confirming encounter details are scenario-compatible rather than independently random
- [x] 5.4 Run the enhanced generator against the current schema to verify no migration is required
- [x] 5.5 Run or exercise the existing ETL transform path to confirm generated data still produces dimensional and fact outputs
