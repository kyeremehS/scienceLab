# ScienceLab API

> Derived from `REQUIREMENTS.md`, `DOMAIN_MODEL.md`, and the persistence constraints implied by them.
> (`DATABASE_SCHEMA.md` was empty at the time of writing; no schema-level decisions beyond `REQUIREMENTS.md` §24 / `CR-05` are assumed here. See `DECISIONS.md` §8.)
> This document describes the API surface required by the MVP. It does not implement endpoints and introduces no post-MVP APIs.
> For each area: purpose, authentication, authorization, resource, key validation/business rules, success behavior, and important error cases.

## Global conventions (apply to all areas)

- **Authentication:** all learning and teaching operations require an authenticated session, except explicitly public entry points (registration, login). Sessions are created on registration/login and terminated on logout (`FR-STU-01`–`FR-STU-03`, `FR-TEA-01`–`FR-TEA-03`).
- **Authorization:** role-based (`CR-01`) and ownership/class-membership-based, enforced server-side (`CR-02`). Client-provided roles, hidden UI controls, and client-side checks are never sufficient.
- **Validation:** all externally supplied input validated server-side (`CR-03`); invalid input rejected with safe, understandable errors.
- **Business rules:** assignment gating, class ownership, data isolation, one-attempt, sequential progression, required observations, assessment-once, completion conditions, and completed-attempt immutability enforced server-side (`CR-04`).
- **Failure safety:** duplicate-safe handling, transactions where multiple related state changes occur, no partial learning state, controlled errors without internals leakage (`CR-06`, `CR-07`, `CR-10`).
- **AI:** assistance endpoints never determine authoritative state, scores, completion, or authorization (`PRODUCT.md` §10–§11).

Resource naming below is logical, not a prescription of exact routes or HTTP verbs. Implementation must cover the behavior, not necessarily these exact paths.

---

## 1. Authentication and session

### 1.1 Student registration (`FR-STU-01`)

- **Purpose:** create a student account and authenticate.
- **Authn:** public (unauthenticated).
- **Authz:** creates `STUDENT` role only. Server determines role; any client-provided role is ignored (`FR-TEA-01` rule applies by analogy).
- **Resource:** User.
- **Validation/rules:** name, email, password required; email format valid; email unique; password securely handled (hashed, never returned/logged).
- **Success:** account created; authenticated session created; directed to student experience.
- **Errors:** validation failure; duplicate email (safe error, no account enumeration beyond what is necessary); hashing/session failure → controlled error.

### 1.2 Teacher registration (`FR-TEA-01`)

- Same as §1.1, with role `TEACHER`. Teacher self-registration allowed in MVP. Server determines role. No email verification in MVP.

### 1.3 Login — student (`FR-STU-02`) / teacher (`FR-TEA-02`)

- **Purpose:** authenticate an existing user and create a session.
- **Authn:** public; credentials submitted.
- **Authz:** role directs experience (student → student dashboard; teacher → teacher dashboard), but role checks on every subsequent request are server-side.
- **Validation/rules:** email + password required.
- **Success:** session created; directed to role-appropriate experience.
- **Errors:** invalid credentials → safe generic error (no distinction leaking which field failed, no internals).

### 1.4 Logout — student (`FR-STU-03`) / teacher (`FR-TEA-03`)

- **Purpose:** terminate the authenticated session.
- **Authn:** required.
- **Authz:** a user terminates their own session.
- **Success:** session invalidated; unauthenticated state.
- **Errors:** no-session / already-terminated handled safely.

---

## 2. Student dashboard and progress (`FR-STU-04`, `FR-STU-30`)

- **Purpose:** provide the student's starting point and simple progress view.
- **Authn:** required (student session).
- **Authz:** student sees only their own data (`FR-STU-31`).
- **Resources:** Assignments (via memberships), Attempts, Assessment Results — aggregated read-only.
- **Rules:** assigned vs independent experiments presented separately; no complex analytics.
- **Success:** returns assigned experiments, in-progress attempts, recently completed experiments, overall progress (completed / in-progress / assessment performance / assigned vs independent).
- **Errors:** unauthenticated → denied; another student's data requested → denied.

---

## 3. Experiment discovery (`FR-STU-05`, `FR-STU-06`)

### 3.1 List published experiments

- **Purpose:** let a student discover available experiments.
- **Authn:** required (student).
- **Authz:** student role; only `PUBLISHED` experiments listed in normal flow.
- **Resource:** Experiment (summary fields).
- **Rules:** each entry exposes at minimum title, description, difficulty, estimated duration, STEM topic.
- **Success:** list of published experiments.
- **Errors:** unauthenticated → denied.

### 3.2 View experiment details

- **Purpose:** let the student understand the experiment before starting.
- **Authn:** required (student).
- **Authz:** student role; normally `PUBLISHED` only.
- **Resource:** Experiment + Steps overview + Objectives + Materials + Safety + Duration.
- **Rules:** detail view does not create an attempt; does not bypass gating (gating enforced at start, §4).
- **Success:** full pre-start information returned.
- **Errors:** unknown/non-published experiment → safe not-found/denied; unauthenticated → denied.

### 3.3 Create experiment (teacher)

- **Purpose:** let a teacher contribute a complete experiment package (`FR-TEA-31`).
- **Authn:** required (teacher).
- **Authz:** teacher role; content is shared (no per-teacher ownership of experiments).
- **Resource:** Experiment + Experiment Version (v1 `PUBLISHED`) + Steps + Observation Definitions + Assessment + Questions, created atomically.
- **Rules:** full package validated (required content fields; at least one step; MCQ options with a defined correct answer; short-answer expected answers); version 1 publishes immediately per `DECISIONS.md` §10.
- **Success:** `201` with the created experiment identity and version.
- **Errors:** validation failure; unauthenticated/non-teacher → denied; partial failure → no partial content (transactional).

---

## 4. Starting experiments and assignment gating (`FR-STU-07`, `FR-STU-08`, `FR-STU-09`)

### 4.1 Start experiment / resume attempt

- **Purpose:** begin or resume the student's work on an experiment.
- **Authn:** required (student).
- **Authz:** own records only; experiment must be startable by this student.
- **Resources:** Experiment → Experiment Attempt.
- **Key validation/business rules (server-enforced):**
  - Assignment gate (`FR-STU-07`): if the student has any incomplete experiment assigned through any active class, independently starting another experiment is refused.
  - One attempt per student per experiment (`FR-STU-09`): if an attempt already exists, resume it; never create a second in the MVP.
  - Assignments never create attempts (`FR-TEA-18`); the start operation creates the attempt.
  - Experiment must be `PUBLISHED` for normal starts.
- **Success:** new attempt created (belongs to student, references experiment, records start time, status `IN_PROGRESS`) and entered at current step; or existing incomplete attempt returned with its persisted current step.
- **Important errors:**
  - Gating refusal → explanatory error directing to assigned work.
  - Duplicate/second-attempt attempt → resume existing or explanatory refusal (no duplicate created, safe under retry).
  - Invalid/unknown experiment, unauthenticated, or another student's attempt → denied.
  - Concurrent duplicate starts → exactly one attempt survives (`CR-06` idempotency).

---

## 5. Step progression (`FR-STU-10`–`FR-STU-13`, `CR-04`, `CR-07`)

- **Purpose:** advance (and review) steps within an `IN_PROGRESS` attempt.
- **Authn:** required (student, owner of attempt).
- **Authz:** attempt must belong to the requesting student; completed attempts immutable (`FR-STU-27`).
- **Resources:** Experiment Attempt + Experiment Step + Step Progress.
- **Key validation/business rules (server-enforced):**
  - Only the owning student advances their attempt.
  - Sequential progression: required steps complete in valid order; skipping via API is rejected.
  - Current location vs per-step completion state distinguished; backward review allowed without un-completing or bypassing.
  - State persisted server-side immediately; refresh/leave/resume safe.
- **Success:** step marked complete (where valid); current step advanced; persisted progress returned.
- **Important errors:**
  - Out-of-order skip → rejected.
  - Attempt not owned / not found → denied.
  - Completed attempt modification → rejected.
  - Multi-step updates applied transactionally; failures leave no partial state.

---

## 6. Observations (`FR-STU-14`, `FR-STU-15`, `FR-STU-16`)

### 6.1 Record observation

- **Purpose:** capture what the student observed during an active attempt.
- **Authn:** required (student, owner).
- **Authz:** own attempt only; attempt must be `IN_PROGRESS`.
- **Resources:** Observation (+ Observation Definition + Attempt + Step).
- **Rules:** each observation associates with student, attempt, relevant observation definition and step; required-vs-optional defined by experiment content.
- **Success:** observation stored and linked correctly.
- **Errors:** wrong attempt/step/definition linkage → rejected; completed attempt → rejected; unauthenticated/other-student → denied.

### 6.2 Edit observation

- **Purpose:** modify an observation while work is active.
- **Authn/Authz:** as §6.1; only while attempt `IN_PROGRESS`.
- **Success:** updated observation persisted.
- **Errors:** completed attempt → rejected (read-only, `FR-STU-16`).

### 6.3 Review observations

- Read-only access to own observations, including after completion (`FR-STU-29`).

---

## 7. AI assistance (`FR-STU-17`–`FR-STU-20`)

- **Purpose:** provide contextual help during learning; conceptual clarification during assessment.
- **Authn:** required (student, owner of attempt context).
- **Authz:** own learning context only; AI output never grants access or determines state.
- **Resources:** AI Interaction (+ Experiment + Attempt + Step context).
- **Key validation/business rules:**
  - Requests carry experiment, current step, authoritative instructions, materials, student question.
  - Responses stay contextual to experiment/step; use authoritative content (`FR-STU-18`).
  - During assessment: clarification/terminology/general guidance allowed; direct answers, generated responses, and score determination forbidden (`FR-STU-20`).
  - Interactions are private learning records (`FR-STU-31`).
- **Success:** contextual guidance returned; interaction logged to the student's history.
- **Important errors/fallbacks:**
  - AI service unavailable → helpful fallback response; experiment workflow continues (`FR-STU-19`).
  - AI failure never blocks navigation, progression, observation, or assessment submission.
  - AI output never persisted as authoritative state (steps, observations, scores, completion).

---

## 8. Assessment (`FR-STU-21`–`FR-STU-25`)

### 8.1 View assessment

- **Purpose:** present the experiment's assessment (multiple-choice + short-answer in MVP).
- **Authn:** required (student, owner).
- **Authz:** own attempt only.
- **Resource:** Assessment + Assessment Questions (authoritative content).
- **Success:** questions returned without leaking authoritative answers/scores beyond what the assessment design exposes.

### 8.2 Submit assessment

- **Purpose:** validate, evaluate, score, store, and lock the assessment.
- **Authn:** required (student, owner).
- **Authz:** own `IN_PROGRESS` attempt only.
- **Resources:** Assessment Submission + Assessment Answers (relational per-answer records) + Assessment Result.
- **Key validation/business rules (server-enforced):**
  - All required assessment information present.
  - MCQ evaluated against defined correct answers (`FR-STU-23`).
  - Short-answer evaluated by content-defined expected answers / simple rules; AI is not the grader (`FR-STU-24`).
  - Once only: after submission, no resubmission and no result replacement (`FR-STU-25`); retakes out of MVP.
  - Submission safe against duplicate requests (idempotent retry, `CR-06`).
- **Success:** submission validated → evaluated → result calculated and stored → submission marked submitted (single record).
- **Important errors:**
  - Incomplete submission → rejected with understandable errors.
  - Duplicate submission → rejected (existing result preserved, no replacement).
  - Completed-attempt or other-student submission → denied.
  - Evaluation/scoring failure → controlled error, retry-safe, no partial state.

---

## 9. Completion and results (`FR-STU-26`–`FR-STU-29`)

### 9.1 Complete experiment

- May be an explicit operation or a server-validated transition upon meeting conditions; either way the rule is identical.
- **Purpose:** transition an attempt to `COMPLETED` when (and only when) all conditions hold.
- **Authn:** required (student, owner).
- **Authz:** own attempt only.
- **Resource:** Experiment Attempt.
- **Key rules (all server-enforced):**
  1. All required steps completed.
  2. All required observations recorded.
  3. Assessment submitted.
  4. Attempt currently `IN_PROGRESS`.
- **Success:** status `COMPLETED`; subsequent modifications blocked (see §9.2).
- **Errors:** unmet conditions → rejected with what remains; already-completed → no transition; other-student/completed-modification → denied.

### 9.2 Completed-attempt protection

- Once `COMPLETED`: cannot return to `IN_PROGRESS`; observations read-only; assessment cannot be resubmitted; learning records not modifiable via normal student operations (`FR-STU-27`).

### 9.3 View result / review completed experiment

- **Purpose:** show completion status, assessment result + feedback, relevant observations, experiment summary; allow read-only review (`FR-STU-28`, `FR-STU-29`).
- **Authn:** required (student, owner).
- **Authz:** own records only.
- **Success:** read-only completed record returned.
- **Errors:** other-student access → denied.

---

## 10. Classes and membership (`FR-TEA-05`–`FR-TEA-14`, `FR-STU-32`)

### 10.1 Create class (teacher)

- **Purpose:** create a teacher-owned learning group.
- **Authn:** required (teacher).
- **Authz:** teacher role; class belongs to creating teacher.
- **Resource:** Class.
- **Rules:** name required, description optional; system generates unique shareable code (unique among active classes; not teacher-chosen).
- **Success:** class created with generated code.
- **Errors:** validation failure; unauthenticated/non-teacher → denied.

### 10.2 List/view own classes (teacher)

- **Purpose:** show classes the teacher owns (name, description, student count, active assignments) and single-class detail (info, members, assigned experiments, assignment status, progress).
- **Authn:** required (teacher).
- **Authz:** only classes owned by the requesting teacher (`FR-TEA-07`); server-enforced.
- **Errors:** other teacher's class → denied.

### 10.3 View/share class code (teacher)

- **Purpose:** retrieve the system-generated code for sharing.
- **Authn/Authz:** owning teacher only.

### 10.4 Join class (student)

- **Purpose:** add the student to a class via code.
- **Authn:** required (student).
- **Authz:** student role; student joins as themselves.
- **Resource:** Class Membership (records student, class, join time, active flag).
- **Rules:** code validated; duplicate active membership refused with clear "already a member" response (`FR-TEA-12`).
- **Success:** membership created.
- **Errors:** invalid code → safe error; duplicate → explanatory refusal (no duplicate created).

### 10.5 View class members (teacher)

- **Purpose:** list members of an owned class (name, join date, assigned-work status; detail via progress endpoints §12).
- **Authn/Authz:** owning teacher only.

### 10.6 Remove student from class (teacher)

- **Purpose:** end a membership in an owned class.
- **Authn/Authz:** owning teacher only.
- **Rules:** historical learning records preserved (attempts, observations, assessment results retained) (`FR-TEA-14`).
- **Success:** membership ended/deactivated; history intact.
- **Errors:** other teacher's class → denied; history deletion → never performed.

---

## 11. Assignments (`FR-TEA-15`–`FR-TEA-24`)

### 11.1 Create assignment (teacher)

- **Purpose:** require an owned class to perform a published experiment.
- **Authn:** required (teacher).
- **Authz:** teacher must own the class; server-enforced.
- **Resource:** Assignment (class + experiment + creating teacher + date assigned + optional start/due dates).
- **Rules:** experiment normally `PUBLISHED`; no Required/Optional distinction (all active assignments are required); no duplicate active assignment for same experiment in same class; creation creates no attempts.
- **Success:** `ACTIVE` assignment created.
- **Errors:** non-owned class → denied; non-published experiment → rejected; duplicate active assignment → rejected; validation failure → safe error.

### 11.2 View assignment (teacher)

- **Purpose:** show assignment details for an owned class.
- **Authn/Authz:** owning teacher only.

### 11.3 Update assignment dates (teacher)

- **Purpose:** update start/due dates of an active assignment.
- **Authn/Authz:** owning teacher only.
- **Rules:** only dates mutable; experiment replacement forbidden (new assignment required for a different experiment).
- **Success:** dates updated.
- **Errors:** experiment-swap attempt → rejected; non-owned/closed-where-inapplicable → denied/rejected per rules.

### 11.4 Assignment status (teacher-visible)

- Derived from student learning state (`Not Started / In Progress / Completed`); never set manually. Read via class/assignment progress endpoints.

### 11.5 Close/cancel assignment (teacher)

- **Purpose:** retire an active assignment while preserving history.
- **Authn/Authz:** owning teacher only.
- **Rules:** record preserved; no longer functions as active required work (excluded from gating).
- **Success:** status `CLOSED` (or equivalent terminal state); history retained.
- **Errors:** non-owned → denied. Hard-delete during normal management → not performed (`FR-TEA-23`).

---

## 12. Teacher progress monitoring (`FR-TEA-25`–`FR-TEA-30`, `FR-STU-32`)

### 12.1 View class progress

- **Purpose:** per-assigned-experiment counts (`Total / Not Started / In Progress / Completed`).
- **Authn:** required (teacher).
- **Authz:** owned class only; server-enforced class isolation.
- **Success:** aggregated counts derived from attempts/assessment state.
- **Errors:** non-owned class → denied.

### 12.2 View individual student progress

- **Purpose:** assignment status, steps completed, required observations, assessment result, completion date for a student in an owned class; includes independent experiment progress for that student (`FR-TEA-27`).
- **Authn/Authz:** owning teacher, student-in-owned-class only.
- **Rules:** read-only; teachers cannot modify attempts, observations, answers, results, or completion state (`FR-TEA-28`).
- **Success:** student progress returned within class boundary.
- **Errors:** student not in teacher's class → denied; modification attempt → rejected.

---

## 13. Administration (`FR-ADM-01`)

- Admin functionality is intentionally minimal and outside the primary learning experience.
- Any admin API is limited to platform-management operations required to operate ScienceLab, under RBAC (`CR-01`) and server-side authorization (`CR-02`).
- No admin API may complicate or bypass student/teacher workflows, data isolation, or immutability rules.
- No additional admin endpoints are defined in this MVP API surface.

---

## 14. Out of scope (explicitly no API in MVP)

Per `PRODUCT.md` §15 and `REQUIREMENTS.md` §35, the MVP defines no APIs for: payments, subscriptions, marketplace, social features, live classes, voice AI, computer vision, native mobile, hardware integrations, digital simulation, physical-action verification, complex recommendations, predictive failure models, complex analytics infrastructure, or multi-region/scaling infrastructure.
