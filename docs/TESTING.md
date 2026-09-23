# ScienceLab Testing Strategy

> Derived from `REQUIREMENTS.md` (§28 / `CR-09` test areas, §23–§27 rules) and `DATABASE_SCHEMA.md`-implied persistence obligations (via `CR-05`).
> Prioritizes the established critical business rules. Imposes no arbitrary coverage percentage, per `CR-09`.

## 1. Principles

1. **Test behavior from the requirements, not implementation.** Each test names the requirement ID + behavior (e.g. `FR-STU-07`, `FR-STU-26`, `CR-05`).
2. **Critical rules first.** The areas in §2 are mandatory automated coverage. Everything else is secondary.
3. **Server-side proof.** Rules enforced server-side (`CR-02`, `CR-04`) are tested at the API/service level, including direct-call bypass attempts — not only through the UI.
4. **Persistence proof.** Rules with database backstops (`CR-05`, `CR-07`) are tested against a real PostgreSQL (test database), not mocks: constraints, transactions, immutability, and resume-after-refresh.
5. **No coverage theater.** `CR-09` explicitly rejects exhaustive UI-component coverage and arbitrary percentages. A missing critical-rule test is a defect; a missing trivial-render test is not.

## 2. Mandatory test areas (from `CR-09`, mapped to requirements)

| # | Area | What must be proven | Key requirements |
|---|---|---|---|
| 1 | Assignment gating across multiple classes | Independent start refused while any active incomplete assignment exists (single-class and multi-class); permitted when none; closed assignments excluded; direct API bypass also refused | `FR-STU-07`, `FR-TEA-16`, `FR-TEA-24` |
| 2 | One attempt per experiment | Second start returns/resumes existing, never creates a duplicate — including concurrent/duplicate requests; no retakes | `FR-STU-08`, `FR-STU-09`, `CR-06` |
| 3 | Step progression | Valid sequential completion advances; out-of-order required-step skip rejected via UI path and direct API; backward review allowed without un-completing or bypassing | `FR-STU-10`–`FR-STU-13`, `CR-04` |
| 4 | Required observations | Completion blocked until all required observations recorded; observation linked to correct attempt/definition/step; edit allowed while `IN_PROGRESS`, refused after `COMPLETED` | `FR-STU-14`–`FR-STU-16`, `FR-STU-26` |
| 5 | Assessment submission | Submission validates completeness; MCQ graded per defined answers; short-answer per content rules (AI never grader); result calculated, stored, and marked submitted | `FR-STU-21`–`FR-STU-24` |
| 6 | Duplicate submission protection | Second submit (including retried/duplicate requests) refused; original result preserved, never replaced | `FR-STU-25`, `CR-06` |
| 7 | Completion conditions | `COMPLETED` only when required steps + required observations + submitted assessment + currently `IN_PROGRESS`; partial states rejected with what-remains feedback | `FR-STU-26` |
| 8 | Completed-attempt immutability | After `COMPLETED`: no return to `IN_PROGRESS`; no observation edit; no resubmission; no modification via normal student or teacher operations; review stays read-only | `FR-STU-27`, `FR-TEA-28` |
| 9 | Class-based authorization | Teacher operates only on owned classes (view, members, assign, update dates, close, progress); non-owned access denied; client-role spoofing ineffective | `FR-TEA-07`, `FR-TEA-30`, `CR-01`, `CR-02` |
| 10 | Student data isolation | Student reads/writes only own attempts, observations, answers, results, AI history; cross-student ID-guessing denied on every endpoint | `FR-STU-31`, `FR-STU-32`, `CR-04` |
| 11 | Teacher class isolation | Teacher sees learning data only for students in owned classes (including independent work of those students); outsiders denied | `FR-TEA-25`–`FR-TEA-27`, `FR-TEA-30` |
| 12 | AI failure fallback | AI outage returns helpful fallback; experiment navigation, progression, observations, assessment, and completion all still work; no authoritative state derived from AI | `FR-STU-17`–`FR-STU-20` |
| 13 | Transactional state changes | Multi-record operations (e.g. submission + answers + result; completion transition) are atomic; failures leave no partial state; retried requests create no duplicates | `CR-06` |
| 14 | Auth/session basics | Registration validation + duplicate-email refusal + secure password handling + session creation; login success/failure (safe errors); logout termination; unauthenticated denial | `FR-STU-01`–`FR-STU-03`, `FR-TEA-01`–`FR-TEA-03` |
| 17 | Password recovery | Identical response for existing/non-existing email; token accepted once then refused; expired token refused; invalid token refused; new password works for login; rate limits hold | `FR-AUTH-01`, `FR-AUTH-02` |
| 15 | Membership/assignment integrity | Duplicate membership refused with clear response; removal preserves history; no duplicate active assignment per experiment per class; experiment-swap refused; close/cancel preserves history and exits gating | `FR-TEA-11`–`FR-TEA-14`, `FR-TEA-17`, `FR-TEA-21`, `FR-TEA-23`, `FR-TEA-24` |
| 16 | Persistence/resume | Refresh/leave/return resumes persisted progress; significant state persisted server-side immediately; completed records stable | `FR-STU-11`, `CR-07` |

## 3. Test levels

- **Service/API tests (primary):** exercise the server's rule enforcement directly — gating, ownership, isolation, progression, observations, submission-once, completion, immutability, transactions, idempotency. Must include adversarial cases (direct calls bypassing UI order, forged ownership IDs, duplicate concurrent requests).
- **Persistence tests:** run against real PostgreSQL; assert foreign-key linkage, uniqueness refusals, immutability backstops, history preservation on membership/assignment retirement, and resume-after-restart.
- **UI tests (targeted):** assigned-vs-independent separation on the dashboard; gating/completion messaging; accessible validation/error rendering; AI-non-blocking navigation. No exhaustive component coverage.
- **Manual/exploratory:** full student journey (sign-in → result → progress) and teacher journey (create class → individual progress) on a seeded environment with the first experiment, per `PRODUCT.md` §16 success criteria.

## 4. Data and environments

- Seed data includes the first experiment (Simple Electrical Circuit) plus representative users, classes, memberships, assignments, and attempts so journeys run without hand-construction.
- Tests use isolated state (transaction rollback or dedicated test database); parallel-safe; no dependence on execution order.

## 6. End-to-end (Playwright)

- `e2e/student-journey.spec.ts`: register → discover → start → five steps with observations → AI fallback → assessment → complete → result → dashboard progress.
- `e2e/teacher-journey.spec.ts`: register → create class → student joins via code → assign → gated start → class/individual progress → close with history.
- Runs against an isolated `sciencelab_e2e` database (never dev data); the AI helper runs keyless so the offline fallback is exercised deterministically. Prepare once per machine: create the database, `drizzle-kit migrate`, `db:seed` with `DATABASE_URL` pointed at it (see `playwright.config.ts`).
- Run: `pnpm test:e2e`. Chromium only, serial workers. To reset accumulated run data, drop and recreate `sciencelab_e2e`, then migrate + seed again.

## 5. What is explicitly not required

- No arbitrary coverage percentage (`CR-09`).
- No exhaustive UI-component coverage.
- No performance, load (beyond the ~100-user design target as a design concern, `CR-08`), or multi-region testing in the MVP.
- No post-MVP behavior tests (anything in `ROADMAP.md` §2).
