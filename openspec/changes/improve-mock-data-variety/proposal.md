## Why

Mock OLTP data is currently too repetitive: a small set of hard-coded patients, diseases, drugs, and fixed Vietnamese placeholder text makes dashboards and ETL validation look artificial. The generator needs varied but clinically coherent demo data, with Vietnamese fields rendered in proper accented Vietnamese wherever the data is intended for Vietnamese users.

## What Changes

- Add scenario-based mock generation so encounters, symptoms, clinical notes, labs, imaging, prescriptions, appointments, and consents vary by disease context.
- Expand patient, hospital, doctor, ICD-10, drug, lab test, and text template pools enough to avoid obvious repeated patterns.
- Generate Vietnamese display text with accents for Vietnamese-facing fields such as names, symptoms, clinical notes, appointment reasons, consent purposes, dosage instructions, disease names, drug descriptions, and hospital addresses.
- Add configurable generation controls such as patient count, encounter count, and random seed so demo datasets can be both varied and reproducible.
- Add controlled edge cases such as abnormal lab values, cancelled appointments, expired consents, missing optional contact fields, chronic follow-up visits, and repeated encounters for selected patients.
- Preserve compatibility with the existing OLTP schema and downstream ETL transformations.

## Capabilities

### New Capabilities
- `mock-data-generation`: Defines requirements for generating varied, clinically coherent, Vietnamese-accented mock OLTP data.

### Modified Capabilities

## Impact

- Affects `scripts/generate_mock_oltp_data.py` and any helper modules or fixture files introduced for reusable data pools.
- May affect ETL/demo assumptions if downstream outputs currently expect fixed mock values.
- No database schema changes are expected.
- No breaking CLI changes are expected; existing defaults should continue to work while new options add configurability.
