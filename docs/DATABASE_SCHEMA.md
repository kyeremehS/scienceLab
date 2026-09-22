# ScienceLab Database Schema

## 1. Purpose

This document defines the database structure for the ScienceLab MVP.

The database is the source of truth for persistent application state and data integrity.

The schema supports:

- Student, Teacher, and Admin accounts
- Classes and class membership
- Experiments and immutable experiment versions
- Teacher assignments
- Student experiment attempts
- Step progression
- Required observations
- Assessments and questions
- Assessment submissions and answers
- AI interaction history

The schema is intentionally limited to the MVP requirements. It does not introduce infrastructure or data structures for features outside the MVP boundary.

---

# 2. Database Principles

## 2.1 Database as Source of Truth

Persistent application state must be stored in PostgreSQL.

The AI layer is not a source of truth for:

- experiment content
- student progress
- assessment scores
- assignment state
- completion state
- authorization

---

## 2.2 Database Constraints vs Application Logic

PostgreSQL should enforce data truths that can be expressed locally at the database level.

Examples:

- primary keys
- foreign keys
- non-null requirements
- unique values
- enum values
- simple uniqueness conditions
- simple row-level integrity conditions

Application/service logic is responsible for rules requiring:

- authenticated-user context
- role checks
- ownership checks
- time-dependent business rules
- cross-request workflows
- assignment gating
- progression rules
- publishing workflows
- completion validation
- AI authorization

---

# 3. Final MVP Tables

The MVP contains 17 tables.

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | Student, Teacher, and Admin accounts |
| 2 | `classes` | Teacher-owned classes |
| 3 | `class_memberships` | Student membership in classes |
| 4 | `experiments` | Stable experiment identity |
| 5 | `experiment_versions` | Immutable experiment content versions |
| 6 | `experiment_steps` | Steps belonging to an experiment version |
| 7 | `observation_definitions` | Observations students are required to record |
| 8 | `assignments` | Experiment work assigned to a class |
| 9 | `experiment_attempts` | Student execution of an experiment |
| 10 | `step_progress` | Student progress through experiment steps |
| 11 | `observations` | Student-recorded observations |
| 12 | `assessments` | Assessment associated with an experiment version |
| 13 | `assessment_questions` | Questions belonging to an assessment |
| 14 | `assessment_submissions` | Student's submitted assessment and result |
| 15 | `assessment_answers` | Individual answers within a submission |
| 16 | `ai_interactions` | Student AI interaction history |
| 17 | `password_reset_tokens` | Single-use password recovery tokens |

---

# 4. High-Level Relationships

```text
users
 ├── classes
 │    └── class_memberships
 │         └── users
 │
 ├── assignments
 │    └── experiment_versions
 │
 ├── experiment_attempts
 │    ├── experiment_versions
 │    │    └── experiment_steps
 │    │         └── observation_definitions
 │    │
 │    ├── step_progress
 │    ├── observations
 │    ├── assessment_submissions
 │    │    └── assessment_answers
 │    │
 │    └── ai_interactions
 │
experiments
 └── experiment_versions
      ├── experiment_steps
      │    └── observation_definitions
      │
      └── assessments
           └── assessment_questions
```

---

# 5. `users`

Stores all authenticated ScienceLab users.

Students, Teachers, and Admins use the same identity table.

## Columns

| Column          | Type        | Required | Notes                         |
| --------------- | ----------- | -------: | ----------------------------- |
| `id`            | UUID        |      Yes | Primary key                   |
| `name`          | TEXT        |      Yes | User's display/name           |
| `email`         | TEXT        |      Yes | Unique normalized email       |
| `password_hash` | TEXT        |      Yes | Secure password hash          |
| `role`          | ENUM        |      Yes | `STUDENT`, `TEACHER`, `ADMIN` |
| `created_at`    | TIMESTAMPTZ |      Yes | Creation timestamp            |
| `updated_at`    | TIMESTAMPTZ |      Yes | Last update timestamp         |

## Constraints

* Primary key on `id`
* Unique `email`
* `role` restricted to the defined roles
* Required fields cannot be null

Email normalization is handled by the application before persistence.

---

# 6. `classes`

Represents a teacher-owned class.

## Columns

| Column        | Type        | Required | Notes                             |
| ------------- | ----------- | -------: | --------------------------------- |
| `id`          | UUID        |      Yes | Primary key                       |
| `teacher_id`  | UUID        |      Yes | FK → `users.id`                   |
| `name`        | TEXT        |      Yes | Class name                        |
| `description` | TEXT        |       No | Optional description              |
| `code`        | TEXT        |      Yes | System-generated unique join code |
| `created_at`  | TIMESTAMPTZ |      Yes | Creation timestamp                |
| `updated_at`  | TIMESTAMPTZ |      Yes | Last update timestamp             |

## Constraints

* Primary key on `id`
* Foreign key `teacher_id → users.id`
* Unique `code`

Global code uniqueness is a deliberate tightening of `FR-TEA-09` (unique among active classes). It satisfies the requirement and avoids cross-history code collisions.

## Business Rules

* A teacher can manage multiple classes.
* A class belongs to its creating teacher.
* Teachers may only access and manage their own classes.
* Ownership is enforced at the application/service layer.

---

# 7. `class_memberships`

Represents a student's membership in a class.

Membership history is preserved.

## Columns

| Column       | Type        | Required | Notes                    |
| ------------ | ----------- | -------: | ------------------------ |
| `id`         | UUID        |      Yes | Primary key              |
| `class_id`   | UUID        |      Yes | FK → `classes.id`        |
| `student_id` | UUID        |      Yes | FK → `users.id`          |
| `joined_at`  | TIMESTAMPTZ |      Yes | Membership start         |
| `active`     | BOOLEAN     |      Yes | Current membership state |
| `left_at`    | TIMESTAMPTZ |       No | When membership ended    |

## Constraints

* Primary key on `id`
* Foreign key `class_id → classes.id`
* Foreign key `student_id → users.id`
* Partial unique index on:

```text
(student_id, class_id)
WHERE active = true
```

This allows historical membership records while preventing duplicate active memberships.

## Business Rules

* Students join using a valid class code.
* A student cannot have duplicate active membership in the same class.
* Teachers may remove students from their own classes.
* Removing membership must preserve historical records.

---

# 8. `experiments`

Represents the stable identity of an experiment.

Experiment content does not live directly on this table.

## Columns

| Column       | Type        | Required | Notes                 |
| ------------ | ----------- | -------: | --------------------- |
| `id`         | UUID        |      Yes | Primary key           |
| `created_at` | TIMESTAMPTZ |      Yes | Creation timestamp    |
| `updated_at` | TIMESTAMPTZ |      Yes | Last update timestamp |

The experiment identity remains stable across content versions.

---

# 9. `experiment_versions`

Stores a complete version of an experiment.

Experiment versioning is whole-experiment versioning.

A version contains the complete content package for the experiment.

## Columns

| Column             | Type        | Required | Notes                            |
| ------------------ | ----------- | -------: | -------------------------------- |
| `id`               | UUID        |      Yes | Primary key                      |
| `experiment_id`    | UUID        |      Yes | FK → `experiments.id`            |
| `version_number`   | INTEGER     |      Yes | Sequential version number        |
| `status`           | ENUM        |      Yes | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `title`            | TEXT        |      Yes | Experiment title                 |
| `description`      | TEXT        |      Yes | Experiment description           |
| `objectives`       | TEXT        |      Yes | Learning objectives              |
| `materials`        | TEXT        |      Yes | Required materials               |
| `safety`           | TEXT        |      Yes | Safety instructions              |
| `duration_minutes` | INTEGER     |      Yes | Expected duration                |
| `created_at`       | TIMESTAMPTZ |      Yes | Creation timestamp               |
| `updated_at`       | TIMESTAMPTZ |      Yes | Last update timestamp            |

## Constraints

* Primary key on `id`
* Foreign key `experiment_id → experiments.id`
* Unique `(experiment_id, version_number)`
* Partial unique index on:

```text
experiment_id
WHERE status = 'PUBLISHED'
```

This guarantees at most one published version for an experiment.

## Immutability

Once a version is published:

* its content cannot be edited in place
* changing content requires creating a new version
* the published version may subsequently become archived
* archived versions remain immutable

## Versioning Rule

If a published experiment needs content changes:

```text
Published Version 1
        ↓
Create Version 2
        ↓
Edit Version 2
        ↓
Publish Version 2
```

Version 1 remains available for historical records.

---

# 10. `experiment_steps`

Stores the ordered steps belonging to an experiment version.

## Columns

| Column                  | Type        | Required | Notes                         |
| ----------------------- | ----------- | -------: | ----------------------------- |
| `id`                    | UUID        |      Yes | Primary key                   |
| `experiment_version_id` | UUID        |      Yes | FK → `experiment_versions.id` |
| `order`                 | INTEGER     |      Yes | Step sequence                 |
| `title`                 | TEXT        |      Yes | Step title                    |
| `instructions`          | TEXT        |      Yes | Authoritative instructions    |
| `created_at`            | TIMESTAMPTZ |      Yes | Creation timestamp            |

## Constraints

* Primary key on `id`
* Foreign key `experiment_version_id → experiment_versions.id`
* Unique `(experiment_version_id, order)`

## Business Rules

* Steps belong to one experiment version.
* Published version steps are immutable.
* Required progression is enforced by application logic.
* Students may move backward to review completed steps.
* Students cannot bypass required progression.

---

# 11. `observation_definitions`

Defines observations that a student may or must record during an experiment.

An experiment step may have zero, one, or multiple observation definitions.

## Columns

| Column               | Type        | Required | Notes                               |
| -------------------- | ----------- | -------: | ----------------------------------- |
| `id`                 | UUID        |      Yes | Primary key                         |
| `experiment_step_id` | UUID        |      Yes | FK → `experiment_steps.id`          |
| `order`              | INTEGER     |      Yes | Display order                       |
| `prompt`             | TEXT        |      Yes | Observation prompt                  |
| `required`           | BOOLEAN     |      Yes | Whether the observation is required |
| `created_at`         | TIMESTAMPTZ |      Yes | Creation timestamp                  |

## Constraints

* Primary key on `id`
* Foreign key `experiment_step_id → experiment_steps.id`
* Unique `(experiment_step_id, order)`

## Step scope (locked)

`experiment_step_id` is mandatory. All MVP observations are step-scoped; experiment-level observations without a step are out of MVP scope. This is a deliberate tightening of `DOMAIN_MODEL.md` §3.6 ("may be associated with a step") for MVP simplicity. A definition's experiment version is traceable through its step.

## Immutability

Observation definitions are immutable once their parent experiment version is published.

Changing an observation requirement requires a new experiment version.

---

# 12. `assignments`

Represents an experiment version assigned by a teacher to a class.

The assignment locks the exact experiment version at creation time.

## Columns

| Column                  | Type        | Required | Notes                           |
| ----------------------- | ----------- | -------: | ------------------------------- |
| `id`                    | UUID        |      Yes | Primary key                     |
| `class_id`              | UUID        |      Yes | FK → `classes.id`               |
| `teacher_id`            | UUID        |      Yes | FK → `users.id`                 |
| `experiment_id`         | UUID        |      Yes | FK → `experiments.id`           |
| `experiment_version_id` | UUID        |      Yes | FK → `experiment_versions.id`   |
| `status`                | ENUM        |      Yes | `ACTIVE`, `CLOSED`, `CANCELLED` |
| `assigned_at`           | TIMESTAMPTZ |      Yes | Assignment creation             |
| `start_at`              | TIMESTAMPTZ |       No | Optional start date             |
| `due_at`                | TIMESTAMPTZ |       No | Optional due date               |
| `created_at`            | TIMESTAMPTZ |      Yes | Creation timestamp              |
| `updated_at`            | TIMESTAMPTZ |      Yes | Last update timestamp           |

## Constraints

* Primary key on `id`
* FK `class_id → classes.id`
* FK `teacher_id → users.id`
* FK `experiment_id → experiments.id`
* FK `experiment_version_id → experiment_versions.id`
* Unique active assignment:

```text
(class_id, experiment_id)
WHERE status = 'ACTIVE'
```

## Terminal states (locked)

`CLOSED` and `CANCELLED` are both terminal states with identical gating and history behavior: the record is preserved but no longer counts as active required work. This refines `DOMAIN_MODEL.md` §3.7 (`ACTIVE`/`CLOSED`) to cover `FR-TEA-24` ("close or cancel"). Downstream docs treat both as terminal.

## Version Integrity

The database must guarantee that:

```text
assignment.experiment_id
```

and

```text
assignment.experiment_version_id
```

refer to the same experiment.

This is enforced with a composite foreign key:

```text
(experiment_version_id, experiment_id)
    → experiment_versions(id, experiment_id)
```

with a corresponding unique constraint on:

```text
experiment_versions(id, experiment_id)
```

## Business Rules

* Only teachers who own the class may create assignments.
* New assignments must reference a published version.
* The assignment locks its selected version.
* An assignment does not create an attempt.
* Closing an assignment preserves its history.
* A teacher cannot change the experiment version of an existing assignment.
* If newer content is required, the existing assignment is closed and a new assignment is created.

---

# 13. `experiment_attempts`

Represents a student's execution of an experiment.

Starting an experiment creates an attempt.

## Columns

| Column                  | Type        | Required | Notes                         |
| ----------------------- | ----------- | -------: | ----------------------------- |
| `id`                    | UUID        |      Yes | Primary key                   |
| `student_id`            | UUID        |      Yes | FK → `users.id`               |
| `experiment_id`         | UUID        |      Yes | FK → `experiments.id`         |
| `experiment_version_id` | UUID        |      Yes | FK → `experiment_versions.id` |
| `assignment_id`         | UUID        |       No | FK → `assignments.id`         |
| `status`                | ENUM        |      Yes | `IN_PROGRESS`, `COMPLETED`    |
| `started_at`            | TIMESTAMPTZ |      Yes | Start timestamp               |
| `completed_at`          | TIMESTAMPTZ |       No | Completion timestamp          |
| `created_at`            | TIMESTAMPTZ |      Yes | Creation timestamp            |
| `updated_at`            | TIMESTAMPTZ |      Yes | Last update timestamp         |

## Constraints

* Primary key on `id`
* FK `student_id → users.id`
* FK `experiment_id → experiments.id`
* FK `experiment_version_id → experiment_versions.id`
* Optional FK `assignment_id → assignments.id`
* Unique `(student_id, experiment_id)`

The unique student/experiment constraint enforces the MVP rule of one attempt per student per experiment.

## Version Integrity

The database must guarantee:

```text
attempt.experiment_version_id
```

belongs to:

```text
attempt.experiment_id
```

using the same composite foreign-key pattern as assignments.

## Assignment Relationship

`assignment_id` is nullable.

* `NULL` means the attempt was started independently.
* A populated value means the attempt was started through that assignment.

When an attempt is started through an assignment, it inherits the assignment's exact experiment version. Recording provenance does not violate `FR-TEA-18`: the assignment still creates nothing; the start operation creates the attempt.

## Independent Start

An independent experiment start uses the experiment's current published version.

## Assignment Start

An assignment-based start uses the exact version stored on the assignment.

## Version Staleness

An assignment may continue to reference an older version after a newer version is published.

This is intentional for the MVP.

Therefore:

* independent starts use the current published version
* new assignments use the current published version
* existing active assignments use their locked version

An existing assignment's bound version remains valid for that assignment even if it is later archived.

## Immutability

While `IN_PROGRESS`, the attempt can change as the student progresses.

Once `COMPLETED`:

* the attempt cannot be modified
* child learning records cannot be modified

A PostgreSQL trigger provides a database-level backstop against updates after completion.

---

# 14. `step_progress`

Stores a student's progress through individual experiment steps.

## Columns

| Column               | Type        | Required | Notes                         |
| -------------------- | ----------- | -------: | ----------------------------- |
| `id`                 | UUID        |      Yes | Primary key                   |
| `attempt_id`         | UUID        |      Yes | FK → `experiment_attempts.id` |
| `experiment_step_id` | UUID        |      Yes | FK → `experiment_steps.id`    |
| `status`             | ENUM        |      Yes | `CURRENT`, `COMPLETED`        |
| `completed_at`       | TIMESTAMPTZ |       No | Completion timestamp          |
| `created_at`         | TIMESTAMPTZ |      Yes | Creation timestamp            |
| `updated_at`         | TIMESTAMPTZ |      Yes | Last update timestamp         |

## Constraints

* Primary key on `id`
* FK `attempt_id → experiment_attempts.id`
* FK `experiment_step_id → experiment_steps.id`
* Unique `(attempt_id, experiment_step_id)`

## State semantics (locked)

* No row for an (attempt, step) pair means `NOT_STARTED`.
* `CURRENT` means the student has entered the step and it is in progress (it also marks current location; only one step per attempt is the current location at a time — enforced by application logic).
* `COMPLETED` means the step's completion requirements were satisfied, with `completed_at` set.
* Backward review does not change a `COMPLETED` row back to `CURRENT`.

## Version consistency (locked)

The server must verify that `experiment_step_id` belongs to the attempt's `experiment_version_id` before writing. Cross-version step contamination is rejected at the application layer.

## Business Rules

* Progress belongs to an attempt, not the shared experiment.
* Students may return to previous steps.
* Required steps cannot be bypassed.
* Completed attempts cannot have their step progress changed.

A database trigger provides a backstop against writes when the parent attempt is completed.

---

# 15. `observations`

Stores observations recorded by students during an attempt.

## Columns

| Column                      | Type        | Required | Notes                             |
| --------------------------- | ----------- | -------: | --------------------------------- |
| `id`                        | UUID        |      Yes | Primary key                       |
| `attempt_id`                | UUID        |      Yes | FK → `experiment_attempts.id`     |
| `observation_definition_id` | UUID        |      Yes | FK → `observation_definitions.id` |
| `response_text`             | TEXT        |      Yes | Student's observation             |
| `recorded_at`               | TIMESTAMPTZ |      Yes | Time recorded                     |
| `updated_at`                | TIMESTAMPTZ |      Yes | Last modification                 |

## Constraints

* Primary key on `id`
* FK `attempt_id → experiment_attempts.id`
* FK `observation_definition_id → observation_definitions.id`
* Unique `(attempt_id, observation_definition_id)`

This allows the student to edit an observation during an active attempt without allowing duplicate observations for the same definition.

## Completion Rule

An attempt satisfies its required observation condition when every required observation definition associated with that attempt's experiment version has a corresponding observation row.

This is evaluated by application logic using relational data.

## Immutability

Observations may be edited while the attempt is active.

Observations become read-only once the attempt is completed.

A PostgreSQL trigger provides a database-level backstop.

---

# 16. `assessments`

Represents the assessment associated with an experiment version.

## Columns

| Column                  | Type        | Required | Notes                         |
| ----------------------- | ----------- | -------: | ----------------------------- |
| `id`                    | UUID        |      Yes | Primary key                   |
| `experiment_version_id` | UUID        |      Yes | FK → `experiment_versions.id` |
| `title`                 | TEXT        |      Yes | Assessment title              |
| `instructions`          | TEXT        |      Yes | Assessment instructions       |
| `created_at`            | TIMESTAMPTZ |      Yes | Creation timestamp            |
| `updated_at`            | TIMESTAMPTZ |      Yes | Last update timestamp         |

## Constraints

* Primary key on `id`
* FK `experiment_version_id → experiment_versions.id`
* Unique `experiment_version_id`

The MVP supports one assessment per experiment version.

Published assessment content is immutable because it belongs to an immutable experiment version.

---

# 17. `assessment_questions`

Stores individual assessment questions.

## Columns

| Column            | Type        | Required | Notes                             |
| ----------------- | ----------- | -------: | --------------------------------- |
| `id`              | UUID        |      Yes | Primary key                       |
| `assessment_id`   | UUID        |      Yes | FK → `assessments.id`             |
| `order`           | INTEGER     |      Yes | Question sequence                 |
| `type`            | ENUM        |      Yes | `MULTIPLE_CHOICE`, `SHORT_ANSWER` |
| `question_text`   | TEXT        |      Yes | Question                          |
| `options`         | JSONB       |       No | Multiple-choice options           |
| `expected_answer` | TEXT        |       No | Expected short-answer response    |
| `created_at`      | TIMESTAMPTZ |      Yes | Creation timestamp                |

## Constraints

* Primary key on `id`
* FK `assessment_id → assessments.id`
* Unique `(assessment_id, order)`

## Option rule (locked)

`options` is required if and only if `type = 'MULTIPLE_CHOICE'`, enforced by application validation. `expected_answer` carries the content-defined grading reference for short-answer questions.

## Business Rules

* Multiple-choice questions are automatically graded.
* Short-answer questions use teacher/content-defined expected answers or simple grading rules.
* AI is not the authoritative grader.
* Published questions are immutable.

---

# 18. `assessment_submissions`

Stores a student's single assessment submission and its resulting evaluation.

The MVP does not use a separate assessment-results table.

## Columns

| Column         | Type        | Required | Notes                         |
| -------------- | ----------- | -------: | ----------------------------- |
| `id`           | UUID        |      Yes | Primary key                   |
| `attempt_id`   | UUID        |      Yes | FK → `experiment_attempts.id` |
| `submitted_at` | TIMESTAMPTZ |      Yes | Submission timestamp          |
| `score`        | NUMERIC     |      Yes | Resulting score               |
| `feedback`     | TEXT        |       No | Evaluation feedback           |
| `status`       | ENUM        |      Yes | Submission/result state       |
| `created_at`   | TIMESTAMPTZ |      Yes | Creation timestamp            |
| `updated_at`   | TIMESTAMPTZ |      Yes | Last update timestamp         |

## Constraints

* Primary key on `id`
* FK `attempt_id → experiment_attempts.id`
* Unique `attempt_id`

This guarantees one assessment submission per attempt.

## Status (locked)

`status` has a single value in the MVP: `SUBMITTED`. The row is written once with `score` (and `feedback` where applicable) at evaluation time and never updated afterward. There is no separate grading-pending state because evaluation is synchronous with submission.

## Submission/result merge (locked)

`DOMAIN_MODEL.md` distinguishes Submission (what was submitted) from Result (the evaluation) as concepts. This schema stores both in one row without collapsing the distinction: submission identity and timing (`id`, `attempt_id`, `submitted_at`) are separate columns from evaluation output (`score`, `feedback`). The single-row form is a storage choice; the conceptual Submission ≠ Result rule still governs behavior (submit once, evaluate per content rules, never replace).

## Business Rules

* A student submits the assessment once.
* The submission is evaluated as part of the assessment workflow.
* Score and feedback are persisted.
* AI does not determine the authoritative score.
* Submission cannot be changed after the attempt is completed.

A PostgreSQL trigger provides a database-level immutability backstop.

---

# 19. `assessment_answers`

Stores one answer for each question in a student's submission.

Answers are relational rather than stored as JSONB.

## Columns

| Column          | Type        | Required | Notes                            |
| --------------- | ----------- | -------: | -------------------------------- |
| `id`            | UUID        |      Yes | Primary key                      |
| `submission_id` | UUID        |      Yes | FK → `assessment_submissions.id` |
| `question_id`   | UUID        |      Yes | FK → `assessment_questions.id`   |
| `answer_text`   | TEXT        |      Yes | Student's answer                 |
| `is_correct`    | BOOLEAN     |       No | Evaluation result                |
| `created_at`    | TIMESTAMPTZ |      Yes | Creation timestamp               |

## Constraints

* Primary key on `id`
* FK `submission_id → assessment_submissions.id`
* FK `question_id → assessment_questions.id`
* Unique `(submission_id, question_id)`

## Business Rules

* One answer exists per submission/question pair.
* All required questions must be answered before submission.
* Question membership in the submission's assessment is validated by application logic.
* Published assessment questions cannot be modified.

---

# 20. `ai_interactions`

Stores a lightweight immutable log of student AI interactions.

AI interaction history is private student data.

## Columns

| Column               | Type        | Required | Notes                         |
| -------------------- | ----------- | -------: | ----------------------------- |
| `id`                 | UUID        |      Yes | Primary key                   |
| `attempt_id`         | UUID        |      Yes | FK → `experiment_attempts.id` |
| `experiment_step_id` | UUID        |       No | FK → `experiment_steps.id`    |
| `student_id`         | UUID        |      Yes | FK → `users.id`               |
| `question_text`      | TEXT        |      Yes | Student's question            |
| `response_text`      | TEXT        |      Yes | AI response                   |
| `created_at`         | TIMESTAMPTZ |      Yes | Interaction timestamp         |

## Constraints

* Primary key on `id`
* FK `attempt_id → experiment_attempts.id`
* Optional FK `experiment_step_id → experiment_steps.id`
* FK `student_id → users.id`
* Index on `(student_id, created_at)`

## Business Rules

AI interactions:

* are contextual to the experiment and current step where applicable
* are not authoritative experiment content
* are not authoritative assessment scores
* are not used for completion
* are not used for assignment gating
* are not used to determine student progress

AI history is accessible only to the student who owns the relevant learning record.

If the AI service fails, no interaction row is required and the core experiment workflow must continue.

Logging is best effort.

---

# 21. Composite Foreign Keys
The schema stores both `experiment_id` and `experiment_version_id` on assignments and attempts.

Independent foreign keys would not guarantee that the two values refer to the same experiment.

Therefore the database must enforce the relationship.

## Required constraint

`experiment_versions` exposes a uniqueness pair:

```text
UNIQUE(id, experiment_id)
```

Assignments and attempts then reference:

```text
(experiment_version_id, experiment_id)
```

against:

```text
experiment_versions(id, experiment_id)
```

This prevents invalid states such as:

```text
experiment_id = Experiment A
experiment_version_id = Version belonging to Experiment B
```

---

# 22. Referential Integrity

Foreign keys should prevent references to nonexistent records.

Historical learning records must not be destroyed by ordinary parent deletion.

The application should prefer:

* archive
* close
* cancel
* deactivate

over destructive deletion.

Learning history must remain available for historical review.

---

# 23. Deletion Policy

The MVP should avoid cascade deletion for core learning history.

In particular:

* completed attempts must not disappear because a class changes
* observations must not disappear because an assignment closes
* assessment submissions must not disappear because an experiment is archived
* AI interaction history must remain associated with the relevant learning record
* experiment versions are archived rather than deleted

Where deletion would compromise historical integrity, restrictive foreign keys should be used.

---

# 24. Immutability Strategy

Immutability is enforced using two layers.

## Layer 1: Application

The service layer checks the current state before accepting a write.

Example:

```text
if attempt.status === COMPLETED
    reject mutation
```

This provides clear application-level errors.

## Layer 2: PostgreSQL Backstop

PostgreSQL triggers prevent writes that bypass application logic.

Triggers are intentionally limited to records where immutability is critical.

Backstop triggers apply to:

* `experiment_attempts`
* `step_progress`
* `observations`
* `assessment_submissions`

Published experiment versions are immutable by design because the application does not provide an update operation for published versions.

---

# 25. Critical Uniqueness Rules

| Rule                                       | Database Enforcement                            |
| ------------------------------------------ | ----------------------------------------------- |
| User email must be unique                  | `UNIQUE(users.email)`                           |
| Class code must be unique                  | `UNIQUE(classes.code)`                          |
| One active membership per student/class    | Partial unique index                            |
| One version number per experiment          | `UNIQUE(experiment_id, version_number)`         |
| One published version per experiment       | Partial unique index                            |
| One step order per version                 | `UNIQUE(experiment_version_id, order)`          |
| One observation definition order per step  | `UNIQUE(experiment_step_id, order)`             |
| One attempt per student/experiment         | `UNIQUE(student_id, experiment_id)`             |
| One progress record per attempt/step       | `UNIQUE(attempt_id, experiment_step_id)`        |
| One observation per attempt/definition     | `UNIQUE(attempt_id, observation_definition_id)` |
| One active assignment per class/experiment | Partial unique index                            |
| One assessment per experiment version      | `UNIQUE(experiment_version_id)`                 |
| One question order per assessment          | `UNIQUE(assessment_id, order)`                  |
| One submission per attempt                 | `UNIQUE(attempt_id)`                            |
| One answer per submission/question         | `UNIQUE(submission_id, question_id)`            |
| One reset token hash                     | `UNIQUE(password_reset_tokens.token_hash)`      |

---

# 26. Server-Side Business Rules

The following must not depend solely on database constraints.

## Authorization

The server determines:

* authenticated user
* user role
* resource ownership
* whether the user may access the resource

## Assignment Gating

A student with incomplete assignments from any active class cannot independently start another experiment.

This must be evaluated server-side at experiment start.

## Experiment Starting

The server determines whether the start is:

* assignment-based
* independent

and selects the appropriate experiment version.

## Step Progression

The server determines whether the requested step can be entered or completed.

## Observation Completion

The server checks whether all required observation definitions have corresponding observations.

## Assessment Completion

The server checks whether the assessment has been submitted and required questions answered.

## Attempt Completion

The server checks:

```text
all required steps completed
AND
all required observations recorded
AND
assessment submitted
AND
attempt is IN_PROGRESS
```

before transitioning the attempt to `COMPLETED`.

## Ownership

The server enforces:

* students access only their own learning records
* teachers access only their own classes
* teachers manage only their own assignments
* teachers monitor only students belonging to their classes

---

# 27. Requirement-to-Schema Mapping

| Requirement                        | Supporting Tables / Constraints                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Student/Teacher/Admin accounts     | `users`                                                                                 |
| Authentication                     | `users`                                                                                 |
| Password recovery                  | `password_reset_tokens`                                                                 |
| Teacher-owned classes              | `classes`                                                                               |
| Student membership                 | `class_memberships`                                                                     |
| Membership history                 | `class_memberships.active`, `left_at`                                                   |
| Experiment identity                | `experiments`                                                                           |
| Historical experiment content      | `experiment_versions`                                                                   |
| Immutable published content        | `experiment_versions`, `experiment_steps`, `observation_definitions`, assessment tables |
| Experiment discovery               | Published `experiment_versions`                                                         |
| Teacher assignment                 | `assignments`                                                                           |
| Assignment version locking         | `assignments.experiment_version_id`                                                     |
| Assignment does not create attempt | `assignments` separate from `experiment_attempts`                                       |
| Student attempt                    | `experiment_attempts`                                                                   |
| One attempt per experiment         | `UNIQUE(student_id, experiment_id)`                                                     |
| Step progression                   | `step_progress`                                                                         |
| Required observations              | `observation_definitions`, `observations`                                               |
| Observation editing                | `observations`                                                                          |
| Assessment                         | `assessments`                                                                           |
| Assessment questions               | `assessment_questions`                                                                  |
| Student answers                    | `assessment_answers`                                                                    |
| Single submission                  | `assessment_submissions`                                                                |
| Assessment result                  | `assessment_submissions.score`, `feedback`, `status`                                    |
| AI interaction history             | `ai_interactions`                                                                       |
| Student AI privacy                 | `ai_interactions.student_id` + server authorization                                     |
| Completed attempt immutability     | attempt + child triggers                                                                |
| Assignment history                 | `assignments.status`                                                                    |
| Simple progress                    | attempts + step progress + assignments                                                  |
| Historical learning records        | restrictive FKs + archive/close behavior                                                |

---

# 28. MVP Data Integrity Invariants

The following invariants must hold.

1. A teacher can manage only classes they own.
2. A teacher can create assignments only for their own classes.
3. A new assignment references a published experiment version.
4. An assignment locks its experiment version.
5. An assignment does not create an attempt.
6. Starting an experiment creates or resumes the student's attempt according to MVP rules.
7. A student has at most one attempt for a given experiment.
8. An attempt's experiment and version must refer to the same experiment.
9. An assignment's experiment and version must refer to the same experiment.
10. Required experiment steps cannot be bypassed.
11. Required observations must exist before completion.
12. An assessment must be submitted before completion.
13. A completed attempt cannot be modified.
14. Learning records belonging to a completed attempt cannot be modified.
15. AI cannot determine authoritative experiment content.
16. AI cannot determine the authoritative assessment score.
17. AI failure cannot block the core experiment workflow.
18. Students can access only their own learning records.
19. Teachers can monitor only their own classes.
20. Closing an assignment preserves its historical record.
21. An active incomplete assignment participates in the independent-start gate.
22. Experiment versions preserve the content used by historical attempts.
23. Observation definitions belong to experiment steps and therefore to a specific experiment version.
24. Assessment answers belong to a specific submission/question pair.
25. AI interaction history remains private to the owning student.

---

# 29. Explicit MVP Boundaries

The database does not include structures for:

* payments
* subscriptions
* marketplace functionality
* social features
* live classes
* voice AI
* computer vision
* hardware integrations
* digital experiment simulation
* complex recommendation systems
* predictive student-failure models
* complex analytics infrastructure
* multi-region infrastructure

These should not be added to the schema unless the product requirements change.

---

# 30. Implementation Principle

The Drizzle schema should implement this document.

Database migrations should be used for:

* tables
* enums
* foreign keys
* indexes
* unique constraints
* partial unique indexes
* composite foreign keys
* immutability triggers

Application services should implement business rules that require runtime context.

Any schema change that affects a rule in this document should first update the relevant product, requirements, domain-model, or architecture documentation.

This document is the database source of truth for the ScienceLab MVP.

---

# 31. `password_reset_tokens`

Stores single-use password recovery tokens (`FR-AUTH-01`, `FR-AUTH-02`).

Only the SHA-256 hash of a token is persisted; the raw token exists solely
inside the reset link sent to the user.

## Columns

| Column       | Type        | Required | Notes                        |
| ------------ | ----------- | -------: | ---------------------------- |
| `id`         | UUID        |      Yes | Primary key                  |
| `user_id`    | UUID        |      Yes | FK → `users.id`              |
| `token_hash` | TEXT        |      Yes | SHA-256 hex of the reset token |
| `expires_at` | TIMESTAMPTZ |      Yes | Expiry (1 hour after creation) |
| `used_at`    | TIMESTAMPTZ |       No | Set when the token is redeemed |
| `created_at` | TIMESTAMPTZ |      Yes | Creation timestamp           |

## Constraints

* Primary key on `id`
* FK `user_id → users.id`
* Unique `token_hash`

## Business Rules

* Tokens are generated with a cryptographic RNG (256-bit) and expire after 1 hour.
* A token is accepted only when it exists, is unexpired, and `used_at` is NULL.
* Redemption sets `used_at` atomically with the password change; the token can never be reused.
* Lookup by hash never reveals whether an email exists (enumeration safety is enforced by the identical-response rule in `FR-AUTH-01`).
