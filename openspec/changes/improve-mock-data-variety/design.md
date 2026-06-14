## Context

The current OLTP mock generator seeds a small fixed catalog of patients, hospitals, doctors, ICD-10 codes, and drugs, then creates encounters with many repeated placeholder values. This is enough for smoke testing but weak for dashboard demonstrations, ETL validation, and realistic data exploration.

The generator must remain compatible with the existing PostgreSQL schema and ETL pipeline. Vietnamese-facing values must use proper Vietnamese accents because the project presents healthcare data to Vietnamese users and dashboards.

## Goals / Non-Goals

**Goals:**
- Produce varied mock OLTP data while keeping clinical relationships plausible.
- Use Vietnamese with accents for Vietnamese-facing display fields.
- Support reproducible generation through an explicit random seed.
- Keep existing generator defaults usable for quick local seeding.
- Add controlled edge cases so dashboards and ETL paths see realistic irregular data.

**Non-Goals:**
- Do not change the OLTP database schema.
- Do not model full medical guideline correctness.
- Do not introduce external paid APIs or network-dependent generation.
- Do not generate real patient data or personally identifiable real-world records.

## Decisions

### Decision: Use scenario-based generation

Represent each disease scenario as a structured bundle containing ICD-10 code, Vietnamese disease name, likely symptoms, clinical note templates, relevant specialties, lab tests, imaging likelihood, drug options, follow-up behavior, and severity ranges.

This is preferred over choosing each column independently because independent random values create incoherent records, such as unrelated specialties, generic symptoms, or prescriptions that do not match the diagnosis.

Alternative considered: only expand the existing constant lists. This would increase row variety but still leave encounters feeling repetitive because symptoms, labs, and treatments would not be tied to diagnosis context.

### Decision: Keep reusable data pools local and deterministic

Use local Python data structures or fixture modules for names, addresses, hospitals, doctors, drug catalog entries, lab tests, and Vietnamese text templates. The generator should not depend on network calls.

Generation should accept a seed so the same command can reproduce the same dataset. Without a seed, the generator can use normal random behavior.

Alternative considered: use an external faker package. Faker can help with names and addresses, but the current need is mostly domain-specific clinical coherence and Vietnamese healthcare text. A local pool is easier to review and tune for this project.

### Decision: Preserve existing CLI behavior while adding options

Keep `--encounters` working as it does today. Add options such as `--patients` and `--seed` so callers can control dataset size and reproducibility without breaking existing scripts.

Alternative considered: replace the generator interface entirely. This would be cleaner but would risk breaking documented setup or demo commands.

### Decision: Generate Vietnamese accents at the source

Vietnamese-facing values should be stored with accents directly in the seed data and generated text. Downstream ETL should normalize only where required by analytics logic, not because source mock data is missing accents.

Examples include patient names, hospital names, addresses, symptoms, clinical notes, appointment reasons, consent purposes, dosage instructions, disease names, drug groups, and imaging conclusions.

Alternative considered: keep ASCII-only source values and add accent restoration downstream. That would hide source quality problems and make mock data less realistic.

### Decision: Add controlled irregularity

Add probability-based edge cases with explicit bounds, such as missing optional phone numbers, abnormal lab results, cancelled appointments, expired consents, chronic follow-up encounters, and patients with multiple related visits.

This is preferred over fully uniform data because dashboards and ETL code need to handle non-ideal but valid operational records.

## Risks / Trade-offs

- More complex generator logic -> Mitigation: keep scenario definitions declarative and isolate generation helpers by concern.
- Accented Vietnamese may expose encoding problems in terminals, database clients, or CSV exports -> Mitigation: use UTF-8 source files and verify data survives insert and ETL reads.
- Random generation can make tests flaky -> Mitigation: require seeded generation for deterministic test fixtures.
- Clinical realism can be over-engineered -> Mitigation: target plausible demo coherence, not guideline-grade medical simulation.
- Larger datasets may slow local seeding -> Mitigation: keep defaults modest and make higher counts opt-in.

## Migration Plan

1. Add scenario and pool definitions without changing the database schema.
2. Update the generator to use the scenario engine while keeping existing command defaults.
3. Add reproducible seed support and dataset size options.
4. Validate seeded output through the current insert flow and ETL transform path.
5. Roll back by restoring the previous generator behavior if the new generator blocks demo seeding.

## Open Questions

- Should the default dataset remain small for setup speed, or should it be increased for richer dashboards?
- Should reusable pools live in `scripts/` next to the generator or in a shared fixture package used by both scripts and tests?
- Do dashboards need any minimum distribution guarantees, such as at least one abnormal lab per disease group?
