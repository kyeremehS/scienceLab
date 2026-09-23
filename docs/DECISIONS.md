# ScienceLab Decisions

> Records decisions already established in `PRODUCT.md`, `REQUIREMENTS.md`, and `DOMAIN_MODEL.md`.
> No historical decisions are invented here. Terminology follows the authoritative documents.
> `DATABASE_SCHEMA.md` was empty at the time of writing; schema-level mechanics that were never specified are marked as open in §8 rather than decided here.

## 1. One attempt per student per experiment (MVP)

- **Decision:** a student has at most one experiment attempt for a given experiment in the MVP. No retakes, restarts, or additional attempts.
- **Consequences:** starting when an attempt exists resumes it; assignment work and independent work share the same attempt; duplicate creation is refused/idempotent.
- **Source:** `REQUIREMENTS.md` `FR-STU-09`; `DOMAIN_MODEL.md` §3.8, §6 rule 6.

## 2. Observation definitions are content; observations are student state

- **Decision:** what the experiment asks the student to observe (Observation Definition, part of authoritative experiment content, optionally tied to a step, with a required flag) is a separate concept from what the student actually records (Observation, belonging to the student's attempt, linked to definition + attempt + relevant step).
- **Consequences:** required observations gate completion; observations editable while `IN_PROGRESS`, read-only after `COMPLETED`.
- **Source:** `DOMAIN_MODEL.md` §3.6, §3.10, §5; `REQUIREMENTS.md` `FR-STU-14`–`FR-STU-16`, `FR-STU-26`.

## 3. Assessment answers are relational records under the submission

- **Decision:** the question (what was asked, part of authoritative assessment content) is distinct from the answer (what this student submitted, belonging to the submission). A submission belongs to one attempt + one assessment and contains per-question answers; the submission produces a separate result (evaluation).
- **Consequences:** submit-once; answers evaluated per content rules (MCQ auto-graded; short-answer by expected answers/simple rules, AI never the grader); duplicate submission refused without replacing the result.
- **Source:** `DOMAIN_MODEL.md` §3.11–§3.15, §5; `REQUIREMENTS.md` `FR-STU-21`–`FR-STU-25`.

## 4. AI interactions are logged assistance, never authoritative state

- **Decision:** AI is an assistance layer (explanations, hints, contextual troubleshooting). Each interaction is associated with the student's learning context (student, attempt, experiment, step) and persisted as part of the student's private learning records. AI output never determines instructions, required observations, step completion, scores, attempt completion, authorization, or ownership. AI failure falls back helpfully and never blocks the experiment workflow.
- **Source:** `PRODUCT.md` §10–§11; `REQUIREMENTS.md` `FR-STU-17`–`FR-STU-20`, `FR-STU-31`; `DOMAIN_MODEL.md` §3.16, §5–§6.

## 5. Authorization is enforced at the application (server) layer

- **Decision:** RBAC (`STUDENT / TEACHER / ADMIN`), class ownership, student data isolation, and teacher class isolation are enforced by server-side application logic on every operation. Hidden frontend controls, client-provided roles, and client-side checks are never sufficient. The server determines roles and re-checks ownership/membership per request.
- **Source:** `REQUIREMENTS.md` `CR-01`, `CR-02`, `CR-04`, `FR-STU-31`, `FR-TEA-07`, `FR-TEA-30`, `FR-TEA-01`.

## 6. Database constraints complement application logic (two-layer integrity)

- **Decision:** data integrity is enforced through both (1) database constraints and (2) server-side business logic. The database prevents structurally invalid relationships and backs up state rules; the application decides authorization and sequencing policy.
- **Established examples** (`REQUIREMENTS.md` `CR-05`): attempt must belong to existing student + experiment; observation must belong to correct attempt + step; submission must belong to correct attempt; teacher manages assignments only for owned classes; no duplicate membership; no multiple attempts (MVP); completed attempts not modifiable; removal from class preserves history.
- **Source:** `REQUIREMENTS.md` §24 / `CR-05`; `ARCHITECTURE.md` §8 records the layer split.

## 7. Immutability backstop for completed learning records

- **Decision:** completed attempts (and their observations, submissions, results) are immutable through normal operations: no return to `IN_PROGRESS`, no edits, no resubmission. Membership removal and assignment close/cancel preserve history; assignments are not hard-deleted in normal management.
- **Source:** `REQUIREMENTS.md` `FR-STU-27`, `FR-TEA-14`, `FR-TEA-23`, `FR-TEA-24`; `DOMAIN_MODEL.md` §3.8, §6 rules 10, §9; `PRODUCT.md` §9.

## 8. Locked: whole-experiment versioning and assignment locking (`DATABASE_SCHEMA.md`)

Previously open; locked during schema finalization:

- **Whole-experiment versioning:** stable `experiments` identity + complete immutable `experiment_versions` content packages (steps, observation definitions, assessment, questions). Content edits require a new version; published versions are never edited in place; at most one `PUBLISHED` version per experiment.
- **Experiment version immutability:** published (and archived) versions immutable by design (no update path) plus trigger backstops on learning records.
- **Assignment version locking:** assignments pin `experiment_version_id` at creation with composite-FK integrity; version cannot be swapped (new assignment required); existing assignments keep their locked version even after archival; independent starts and new assignments use the current published version.
- **Attempt provenance:** nullable `assignment_id` on attempts records which assignment caused an attempt; assignments still create nothing (`FR-TEA-18`).
- **Locked refinements:** observation definitions step-mandatory (MVP observations step-scoped); `CLOSED`/`CANCELLED` equivalent terminal assignment states; step-progress absent-row = `NOT_STARTED` with `CURRENT`/`COMPLETED` plus server version-consistency check; single `SUBMITTED` submission status (submission+result in one row, concepts kept distinct in columns).

## 9. Assignment semantics (established, versioning-independent)

These assignment decisions are established and do not depend on the open versioning question:

- Assignment = required current learning work; no Required/Optional distinction in MVP (`FR-TEA-16`).
- Assignment does not create an attempt; the student creates the attempt by starting (`FR-TEA-18`, `FR-STU-08`).
- No duplicate active assignment for the same experiment in the same class (`FR-TEA-17`).
- Experiment cannot be swapped on an existing assignment; a different experiment needs a new assignment (`FR-TEA-21`).
- Assignment dates (start/due) are the mutable fields (`FR-TEA-20`).
- Statuses (`Not Started / In Progress / Completed`) are derived from learning state, never set manually (`FR-TEA-22`).
- Only active incomplete assignments participate in the independent-experiment gate (`FR-STU-07`; `DOMAIN_MODEL.md` §3.7, §6 rule 17); closed assignments are history only (`FR-TEA-24`).
- Assignment lifecycle: `ACTIVE → CLOSED | CANCELLED`, history retained, no hard-delete in normal management (`FR-TEA-23`, `FR-TEA-24`; refined in `DATABASE_SCHEMA.md` §12).

## 10. Teacher experiment creation publishes directly

- **Decision:** a teacher creates an experiment as one complete package that becomes version 1 `PUBLISHED` immediately (`FR-TEA-31`). There is no teacher-side draft state because no role can publish a draft yet; draft/publish/archive workflows are admin scope for later.
- **Consequences:** teacher-created content is instantly discoverable, assignable, and attemptable under the same versioning immutability as seeded content. Teachers cannot edit published content in the MVP; corrections require admin assistance or a new experiment.
- **Source:** `REQUIREMENTS.md` `FR-TEA-31`; `DATABASE_SCHEMA.md` §§8–9 (whole-experiment versioning, one published version).

## 11. Reflection is recorded through observation prompts

- **Decision:** the Reflect stage of the learning loop has no separate entity. Reflective observation definitions (e.g. "Why is the resistor needed in this circuit?") and the troubleshooting prompts are the reflection vehicle: the student reflects by recording what they observed and what it means (`PRODUCT.md` §19 "record observations and reflections").
- **Consequences:** no reflection table, no reflection-specific API. Experiment authors cover Reflect by including reflective required prompts; the seed experiment does. A dedicated reflection artifact is post-MVP scope.
- **Source:** `PRODUCT.md` §§5–6, §19; `DOMAIN_MODEL.md` §3.6, §3.10.

## 12. Short-answer grading is keyword overlap, MCQ stays exact

- **Decision:** multiple-choice answers grade by normalized exact match against the defined correct option. Short answers grade by key-term overlap: significant words (length ≥ 4, excluding common stopwords) are extracted from the content-defined expected answer, and the response is correct when it contains at least half of them (rounded up; a keyword-less expected answer falls back to normalized equality). AI never grades (`FR-STU-24`).
- **Consequences:** paraphrased student answers can pass while exact-option MCQs stay strict. The rule is deterministic and explainable; teachers authoring content should keep expected answers to core terms.
- **Source:** `REQUIREMENTS.md` `FR-STU-24`.

## 13. MVP infrastructure boundaries

- **Decision:** the MVP uses minimal infrastructure sufficient for ~100 concurrent active users: relational storage, API layer, server validation, logging, migrations, seed/demo data, deployment. Explicitly excluded: distributed systems, complex analytics/scaling infrastructure, multi-region deployment, and all product exclusions in `PRODUCT.md` §15 / `REQUIREMENTS.md` §35 (payments, subscriptions, marketplace, social, live classes, voice/vision, native mobile, hardware, simulation, physical verification, complex recommendations, predictive models).
- **Source:** `PRODUCT.md` §7–§8, §15; `REQUIREMENTS.md` §35, `CR-08`, `CR-12`.
