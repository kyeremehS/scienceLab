# ScienceLab Architecture

> Derived from `PRODUCT.md`, `REQUIREMENTS.md`, `DOMAIN_MODEL.md`, and the persistence constraints implied by them.
> (`DATABASE_SCHEMA.md` was empty at the time of writing; table-level decisions are therefore not stated here — only the architectural obligations the schema must satisfy, per `REQUIREMENTS.md` §24 / `CR-05`. See `DECISIONS.md` §8.)
> This document introduces no new architecture beyond what the established documents support. It is scoped to the MVP.

## 1. Architectural overview

ScienceLab is a web-based practical STEM learning platform (MVP) with a conventional three-tier shape:

```text
Browser (Next.js UI)
  → Server / API (Next.js server-side application + service logic)
  → PostgreSQL (authoritative persisted state, via Drizzle)
  → External AI service (assistance only, never authoritative)
```

Key principles (from authoritative docs):

1. **Database is the source of truth for application state** (`PRODUCT.md` §11): users, experiments, steps, attempts, observations, assignments, assessments, submissions, scores, progress.
2. **Application/service logic enforces business rules** (`PRODUCT.md` §11, `REQUIREMENTS.md` `CR-04`): gating, ownership, isolation, one-attempt, progression, observations, assessment-once, completion, immutability.
3. **AI is an assistance layer, never authoritative** (`PRODUCT.md` §10–§11, `DOMAIN_MODEL.md` §3.16): explanations, hints, troubleshooting; must not determine state, scores, completion, or authorization.
4. **Server is authoritative; client is not trusted** (`CR-02`): no reliance on hidden controls, client roles, or client-side checks.
5. **MVP infrastructure stays minimal** (`PRODUCT.md` §15, `REQUIREMENTS.md` §35, `CR-08`): ~100 concurrent active users, no distributed systems, no speculative scaling.

---

## 2. Frontend / UI

**Responsibilities:**

- Present the student journeys (dashboard, catalogue, experiment details, step flow, observations, AI chat surface, assessment, results, progress) and teacher journeys (dashboard, classes, members, assignments, class/student progress) defined in `USER_FLOWS.md`.
- Clearly separate assigned vs independent work on the student dashboard (`FR-STU-04`).
- Reflect server-side rules in messaging (e.g. gating refusals, progression errors, completion checklists) without enforcing them. Every rule is re-checked by the server.
- Provide an accessible web experience throughout (`CR-11`): keyboard navigation, labels, readable hierarchy, understandable validation/error messages, no color-only state, accessible feedback for important actions.
- Keep AI interactions non-blocking: ordinary experiment navigation must not wait on AI (`CR-08`).

**Non-responsibilities:**

- The UI never determines completion, scores, authorization, ownership, gating, or progression outcomes.
- The UI never persists authoritative learning state locally as the record of truth. Significant state changes are persisted server-side immediately (`CR-07`); the client holds only a view/cache that survives refresh only because the server persisted it.
- No complex analytics engine, recommendation system, simulation, or offline mode in the MVP.

---

## 3. Server / API layer

**Responsibilities:**

- Expose the MVP API surface described in `API.md` over authenticated sessions.
- Authenticate every request (session validation) and authorize by role + ownership + membership on every operation (`CR-01`, `CR-02`).
- Validate all externally supplied input and return safe, understandable errors (`CR-03`).
- Apply transactions and idempotency where duplicate or multi-record operations could corrupt state (`CR-06`): e.g. concurrent attempt creation (one-attempt), assessment submission (submit-once), membership creation (no duplicates), assignment creation (no duplicate active).
- Return controlled errors without leaking internals (`CR-07`, `CR-10`); distinguish expected validation/authorization failures from unexpected server errors in logs.
- Enforce the experiment lifecycle (`NOT_STARTED → IN_PROGRESS → COMPLETED`, no return) and assignment lifecycle (`ACTIVE → CLOSED`, history preserved).

**Non-responsibilities:**

- The API layer does not delegate business-rule decisions to the client or to AI output.
- No post-MVP concerns (payments, marketplace, live classes, mobile, vision/voice, hardware, simulation, recommendations, predictive models).

---

## 4. Application / service logic

This is where the domain invariants live (`DOMAIN_MODEL.md` §6, `REQUIREMENTS.md` §23–§24).

**Responsibilities — enforce server-side:**

| Rule | Source |
|---|---|
| Assignment gating across all active classes | `FR-STU-07` |
| Class ownership (manage only owned classes; assign only to owned classes) | `FR-TEA-07`, invariants 1–2 |
| Student data isolation (own attempts/observations/answers/results/AI history only) | `FR-STU-31` |
| Teacher class isolation (learning info only for students in owned classes) | `FR-TEA-30` |
| One attempt per student per experiment; resume otherwise; no retakes | `FR-STU-09` |
| Sequential step progression; backward review without bypass | `FR-STU-10`–`FR-STU-13` |
| Required observations before completion; read-only after | `FR-STU-14`–`FR-STU-16`, `FR-STU-26` |
| Assessment submit-once; MCQ auto-graded; short-answer by content rules (AI not grader); no resubmission | `FR-STU-21`–`FR-STU-25` |
| Completion requires required steps + required observations + submitted assessment + currently `IN_PROGRESS` | `FR-STU-26` |
| Completed-attempt immutability (no return to `IN_PROGRESS`, no edits via normal operations) | `FR-STU-27` |
| Assignment history preserved; remove-from-class preserves history; no hard-delete in normal management | `FR-TEA-14`, `FR-TEA-23`, `FR-TEA-24` |
| No duplicate active membership; no duplicate active assignment (same experiment + class) | `FR-TEA-12`, `FR-TEA-17` |
| Experiment replacement forbidden (new assignment required) | `FR-TEA-21` |
| Teacher read-only on learning records | `FR-TEA-28` |
| AI boundaries (no answers/scores/state from AI) + AI-failure fallback | `FR-STU-17`–`FR-STU-20` |

**Domain distinctions the service layer must preserve** (`DOMAIN_MODEL.md` §5):

- Assignment ≠ Attempt; Step ≠ Step Progress; Observation Definition ≠ Observation; Question ≠ Answer; Submission ≠ Result; AI Interaction ≠ authoritative state.

---

## 5. Database access

- Access goes through a single data-access path using the project's established ORM (`drizzle-orm` with `postgres-js`; migrations via `drizzle-kit` — see `ENGINEERING.md`). No ad-hoc SQL paths that bypass constraints or transactions.
- Reads respect authorization boundaries (isolation is enforced in queries, not just hidden in the UI).
- Writes that touch multiple related records (e.g. completing steps + recording observations + submitting assessment → completion transition; creating submissions + answers + results) use database transactions where appropriate (`CR-06`).
- Queries stay MVP-scaled: appropriate indexes, no unnecessary queries, no oversized loads (`CR-08`). AI calls kept off the critical navigation path.
- Migrations are versioned and applied to every environment including production (`CR-12`); development-only configuration never required for production.

---

## 6. PostgreSQL

**Responsibilities:**

- Authoritative store for all application state listed in §1.
- Structural integrity backstop complementing service logic (`CR-05`):
  - Referential integrity (attempt → existing student + experiment; observation → correct attempt/step/definition; submission → correct attempt/assessment; answers → correct submission/question).
  - Uniqueness where the domain forbids duplicates (e.g. user email; one attempt per student per experiment in MVP; one active membership per student per class; one active assignment per experiment per class — exact constraint shape to be finalized in `DATABASE_SCHEMA.md`).
  - State-transition backstops where expressible (e.g. completed attempts not modifiable through normal paths; preserved history on membership/assignment retirement).
- Durability for `CR-07` (persist significant learning state immediately; refresh/leave/resume safe).

**Non-responsibilities:**

- PostgreSQL does not implement authorization policy, role checks, gating logic, grading rules, AI behavior, or UX messaging. Those are service-logic concerns. The database provides integrity constraints as a backstop, not as the authorization system (see §8).

---

## 7. Authentication and session handling

- Session-based auth for students and teachers (registration creates a session; login creates a session; logout terminates it).
- Passwords securely handled (hashed; never returned, never logged as plain or hash — see `SECURITY.md`).
- Role is server-determined at registration and server-checked per request; client-provided roles ignored.
- Invalid credentials produce safe errors; session handling failures produce controlled errors.
- Session validation sits in front of every learning/teaching operation; unauthenticated requests are denied before any business logic runs.

---

## 8. Application business rules vs database integrity rules

This distinction is architectural and must be respected in implementation:

**Application/service business rules** decide whether an operation is *allowed*:

- Is this user permitted (role, ownership, membership)?
- Does gating permit this start?
- Is this step transition valid in sequence?
- Are completion conditions met?
- Is this assessment submission valid and first-time?
- Is this teacher allowed to see this student?

**Database integrity rules** ensure the persisted state stays *structurally valid* even if a bug or race reaches the store:

- Foreign keys prevent orphaned/dangling references.
- Unique constraints prevent duplicate emails, duplicate attempts (MVP), duplicate memberships, duplicate active assignments.
- Non-null / check constraints prevent malformed records.
- Immutability backstops (triggers on `experiment_attempts`, `step_progress`, `observations`, `assessment_submissions` per `DATABASE_SCHEMA.md` §24) make completed-record modification structurally difficult, complementing service-level refusal.

Neither layer alone is sufficient (`CR-05`). Service logic without constraints is vulnerable to races and bugs; constraints without service logic cannot express authorization or sequencing policy.

> Schema lock: versioning is whole-experiment (`experiments` identity + immutable `experiment_versions` package); assignments and attempts pin `experiment_version_id` with composite FKs; one published version per experiment. See `DATABASE_SCHEMA.md` §§9/12/13/21 and `DECISIONS.md` §8.

---

## 9. AI integration

- AI is a **separate, non-critical dependency** hung off the learning workflow, not in its critical path.
- Integration shape:
  ```text
  Student question + authoritative context
    (experiment, current step, instructions, materials, observation requirements)
    → AI service → guidance response
    → logged as AI Interaction (private to the student)
  ```
- Authoritative experiment content is supplied *to* the AI; AI output never flows back into authoritative state.
- Timeouts/failures produce a helpful fallback; the experiment loop, progression, observations, assessment, and completion proceed normally.
- During assessment, the integration applies the stricter policy (clarification allowed; answers/responses/scores forbidden).
- AI requests/responses must respect privacy and logging rules (see `SECURITY.md`): no passwords/tokens in prompts or logs; no unnecessary sensitive student data sent or stored.

---

## 10. Cross-cutting concerns

| Concern | Architectural treatment | Source |
|---|---|---|
| Reliability/persistence | Immediate server persistence; transactions; idempotency; controlled errors | `CR-06`, `CR-07` |
| Performance | ~100 concurrent users; indexes; minimal queries; AI off critical path | `CR-08` |
| Observability | Server logs for unexpected errors, DB failures, AI failures; request/correlation IDs; no sensitive logging | `CR-10` |
| Testability | Critical rules + API behavior covered by automated tests | `CR-09` |
| Accessibility | Built into UI layer throughout | `CR-11` |
| Deployability | App + DB + env + migrations + secrets + AI config; production-safe | `CR-12` |

---

## 11. MVP boundaries (what this architecture excludes)

No architectural provision for: payments, subscriptions, marketplace, social, live classes, voice AI, computer vision, native mobile, hardware integrations, digital simulation, physical-action verification, complex recommendations, predictive failure models, complex analytics, multi-region or speculative scaling infrastructure. Adding any of these is a roadmap decision (see `ROADMAP.md`), not an implementation detail.
