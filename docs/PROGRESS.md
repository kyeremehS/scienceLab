# ScienceLab Implementation Progress

> Phase-by-phase build checklist. Each phase lists its scope (requirement IDs),
> what was actually implemented (files, endpoints, tests), and how it was
> verified. Mark a phase complete only when all three exist: implementation +
> tests + verification. This file is updated in the same change that completes
> a phase — never ahead of it.

## Legend

- ✅ Complete (implemented, tested, verified live where applicable)
- 🟡 In progress
- ⬜ Not started

---

## Phase 0 — Documentation foundation ✅

**Scope:** All of `docs/` except UI.

**Delivered:**

- `PRODUCT.md`, `REQUIREMENTS.md`, `DOMAIN_MODEL.md` (authoritative, pre-existing)
- `DATABASE_SCHEMA.md` — 16 tables, whole-experiment versioning, assignment
  locking, composite FKs, trigger backstops (locked decisions in `DECISIONS.md` §8)
- `USER_FLOWS.md`, `API.md`, `ARCHITECTURE.md`, `SECURITY.md`, `DECISIONS.md`,
  `ROADMAP.md`, `AGENTS.md`, `ENGINEERING.md`, `TESTING.md`
- `docs/UI_DESIGN.md` — locked visual language + auth contract + theme rules +
  responsiveness verification rule (§5)

**Verification:** Section-by-section deliberation against authoritative docs;
no contradictions outstanding.

---

## Phase 1 — Authentication + sessions ✅

**Scope:** `FR-STU-01`–`FR-STU-03`, `FR-TEA-01`–`FR-TEA-03`, `CR-01`–`CR-03`
(input validation, server-determined roles, safe errors).

**Delivered:**

- `src/lib/passwords.ts` — scrypt hash/verify (Node crypto, no extra dep)
- `src/lib/validation.ts` — registration/login validation, email normalization
  (extra body fields incl. `role` ignored)
- `src/lib/session.ts` — jose JWT (HS256, 7-day) in
  `HttpOnly; SameSite=Lax; Secure-in-prod` cookie
- `src/lib/auth-service.ts` — register/login/logout/me logic; role from URL
  path only; duplicate-email race handled via cause-chain 23505 check; dummy-hash
  login timing cover
- Routes: `POST register/student`, `POST register/teacher`, `POST login`,
  `POST logout`, `GET me`
- `src/middleware.ts` — dashboard role gates (unauth → `/login`, cross-role →
  own dashboard, auth pages redirect when signed in)
- Pages: `/login`, `/register`, `/dashboard/student`, `/dashboard/teacher`
  (shells with empty states), landing with session redirect
- Session secret: dev-only `SESSION_SECRET` in `.env` (production must override)
- Tests: `validation.test.ts`, `passwords.test.ts`, `session.test.ts` (14 tests)

**Verification:** 14/14 vitest, `tsc`, eslint clean; live 10/10 (201 register,
409 duplicate, 401 generic, 200 login/me/dashboard, 307 role gates, TEACHER
role, logout → 401). One live-found bug fixed (Drizzle-wrapped 23505).

---

## Phase 1b — Auth UI + theme ✅

**Scope:** Visual identity + `docs/UI_DESIGN.md` contract; no behavior change.

**Delivered:**

- `src/app/auth/AuthLayout.tsx` — split-screen shell (desktop), stacked brand
  block (mobile); form capped 480px; panels pulled toward divider
- `src/app/auth/CircuitIllustration.tsx` — battery→resistor→LED line art;
  grays via `currentColor`, accent via `--circuit-accent` (theme-adaptive)
- `src/app/auth/PasswordInput.tsx` — in-field eye toggle (`aria-label`,
  `aria-pressed`)
- `src/app/ThemeToggle.tsx` — manual light/dark (`useSyncExternalStore` +
  `MutationObserver`); `localStorage` persist, OS fallback, pre-paint head
  script in `layout.tsx`; class-based `dark:` variant in `globals.css`
- Register: confirm-password (client match check only), role cards
  (Student/Teacher, no Admin; `fieldset`/`legend` with sr-only label)
- Toggle placement: brand header row on mobile, form corner on desktop,
  beside Logout on dashboards, landing corner
- Brand panel follows theme on all viewports (no half-lit page)

**Verification:** 14/14 vitest, `tsc`, eslint clean; live HTML checks
(tiered circuit classes, no pills, role cards, no Admin, toggle + theme script
present, `.dark` vars in compiled CSS).

---

## Phase 1c — Password recovery ✅

**Scope:** `FR-AUTH-01`, `FR-AUTH-02` (enumeration-safe request, short-lived
single-use tokens, login with new password). Email verification stays
explicitly deferred.

**Delivered:**

- `password_reset_tokens` table + migration (`0001`, hash-only storage,
  1-hour expiry, `used_at` single-use, unique hash)
- `src/lib/reset-tokens.ts` (256-bit RNG, SHA-256, expiry), `src/lib/mailer.ts`
  (channel abstraction; SMTP to Mailpit at `localhost:1025` by default in
  dev, `console` fallback, real provider required before pilot),
  `src/lib/rate-limit.ts` (in-memory sliding window, 10/hour per IP)
- Mailpit service in `docker-compose.yml` (UI `localhost:8025`); `nodemailer`
  dependency
- `POST /api/auth/forgot-password` (byte-identical response either way),
  `POST /api/auth/reset-password` (atomic redeem + password change in a
  transaction)
- Pages `/forgot-password`, `/reset-password?token=`, "Forgot password?"
  link on login; recovery pages in middleware auth-redirect set
- Branded email shell (`email-templates.ts`: light table layout, CTA button +
  plain-link fallback, HTML + text parts); verified live in Mailpit
- Tests: `reset-tokens.test.ts`, validation additions, DB integration
  `password-reset.test.ts` (enumeration safety, single-use, expiry, invalid
  token, new-password login, rate limits) — 23 tests total

**Verification:** 23/23 vitest, `tsc`, eslint clean; live end-to-end
(register → forgot → token link → reset 200 → reuse 400 → login with new
password 200; missing-email response identical; both pages 200).

**Accepted limitations:** a real delivery provider replaces Mailpit before any
pilot (`EMAIL_PROVIDER`); pre-existing sessions are not revoked
on reset (7-day JWT expiry bounds this).

---

## Phase 2 — Classes + membership ✅

**Scope:** `FR-TEA-05`–`FR-TEA-14`, `FR-STU-32`, `CR-05` (membership uniqueness,
history preservation).

**Delivered:**

- `classes` + `class_memberships` tables + migration (`0002`, restrictive
  FKs, partial unique `(student_id, class_id) WHERE active`)
- `src/lib/class-codes.ts` — 6-char Crockford-base32 codes, collision-retry
- Teacher: create (validated name), list own with counts, detail with
  members, remove (soft-end, history kept); all ownership-checked
- Student: join by code (case-insensitive, 409 already-member, 404 bad code),
  joined list (class + teacher name only)
- UI: `/dashboard/teacher/classes` (list + create), detail (copy-code,
  members, confirm-remove), teacher dashboard link, student dashboard joined
  list + join form
- Teacher UI pass: hierarchy eyebrows (YOUR CLASSES / ACTIVE ASSIGNMENTS /
  RECENT ACTIVITY), real class cards with counts, honest empty states naming
  the delivering phase, shared `PageHeader` (controls wrap on mobile),
  class-detail order (code → assignments → students); contract §12
- App shell (`dashboard/layout.tsx` + `AppShell`): top bar with wordmark,
  role nav (Teacher: Dashboard/Classes; Student: Dashboard), theme + logout;
  mobile hamburger menu; per-page floating controls removed; designed
  code-bearing empty members state; contract §§13–14
- Tests: `class-codes.test.ts`, DB integration `classes.test.ts`
  (duplicate, ownership denial, history preserved, invalid code, role gates)

**Verification:** 30/30 vitest, `tsc`, eslint clean; live end-to-end
(create 201 → join 201 → duplicate 409 → detail shows member → wrong-role
403 → all pages 200 → remove 200 → member list empty, history row inactive
in DB).

---

## Phase 3 — Experiments catalogue + versions ✅

**Scope:** `FR-STU-05`, `FR-STU-06` (published discovery + pre-start details).

**Delivered:**

- 6 tables + migrations (`0003` catalogue, `0004` difficulty/topic):
  `experiments`, `experiment_versions` (one-published partial unique,
  version-number unique, composite id pair), `experiment_steps`,
  `observation_definitions`, `assessments`, `assessment_questions`
- `GET /api/experiments` (published only, step counts),
  `GET /api/experiments/[id]` (objectives/materials/safety/step overview;
  no assessment content)
- Seed `pnpm db:seed`: Simple Electrical Circuit v1 PUBLISHED (5 steps,
  4 observation definitions, 3 questions); idempotent
- UI: student catalogue with `ExperimentCard` (diagram visual + CTA),
  experiment detail page, dashboard v1 (greeting, live first-steps checklist,
  experiment cards), Experiments nav entry

**Verification:** 33/33 vitest (catalogue integration: drafts hidden,
details shape, no answer leakage, 404, 401), `tsc`, eslint clean; live
(catalogue 1 item/5 steps, detail 200, all pages 200, checklist + cards
render).

---

## Phase 4 — Attempts + steps + observations ✅

**Scope:** `FR-STU-07`–`FR-STU-16`, `CR-04`, `CR-07` (gating, one-attempt,
progression, persistence/resume).

**Delivered:**

- 4 tables + migration (`0005`, restrictive FKs, composite version FKs,
  partial uniques, §24 trigger backstops): `assignments` (persistence-only —
  teacher endpoints stay Phase 7), `experiment_attempts` (nullable
  `assignment_id`, version inheritance), `step_progress` (absent =
  `NOT_STARTED`, version-consistency check), `observations`
- `src/lib/attempts-service.ts` — start/resume, gate across all active
  classes (closed/cancelled excluded), sequential progression with backward
  review, observation record/edit, owner-only + `IN_PROGRESS`-only guards,
  23505-safe concurrent starts, transactional start/step completion
- Routes: `POST /api/experiments/[id]/start`, `GET /api/attempts/[id]`,
  `POST .../steps/[stepId]/complete` (422 with next-required step on skip),
  `POST .../observations`, `PATCH .../observations/[observationId]`
- Runner UI: experiment detail Start/Continue button (gating message inline),
  workspace page (`AttemptRunner`: step navigator done/current/todo,
  instructions, observation record/edit, Previous/Continue, progress strip,
  honest Phase 5/6 placeholders); contract §§15–17
- Tests: `attempts.test.ts` (gating single + multi-class + close-lifts-gate,
  assignment version inheritance, one-attempt incl. concurrent race,
  sequential + idempotent repeat, observation linkage/edit/duplicate/foreign,
  cross-student 404s, resume GET, trigger backstops incl. DELETE paths) —
  10 tests

**Verification:** 43/43 vitest, `tsc`, eslint clean; live end-to-end
(register 201 → catalogue → start 201 → skip 422 → complete step →
observation 201 → resume GET → runner + detail pages 200 with Continue
label; live data cleaned up). One live-found bug fixed (BEFORE DELETE
trigger returned `NEW`, which is null in DELETE context and silently
skipped deletes — now `TG_OP`-branched; file fix mirrored into dev DB via
`CREATE OR REPLACE`, migration `0005` uncommitted/local-only at the time).

---

## Phase 5 — AI assistance ✅

**Scope:** `FR-STU-17`–`FR-STU-20` (contextual help, authoritative content,
failure fallback, assessment boundaries).

**Delivered:**

- `ai_interactions` table + migration (`0006`, student/created index,
  best-effort logging, no trigger backstop per schema §24)
- `src/lib/ai-service.ts` — OpenRouter Chat Completions
  (`AI_MODEL`, default `thinkingmachines/inkling-small`; `OPENROUTER_API_KEY`;
  20s timeout; 500-token cap) with context built from the attempt's version
  (objectives, materials, safety, steps, current step, observation
  requirements); no personal data leaves the server; 30/hour per-student
  limit; any failure or missing key → fallback response, workflow continues
- Assessment-time guard (`assessmentContext` flag): clarification only, no
  direct answers/responses/scores — full grading stays Phase 6
- Route `POST /api/attempts/[id]/assist` (owner-only, `IN_PROGRESS`-only)
- Runner AI panel wired (`AIPanel`: ask, response, offline badge,
  non-blocking; read-only notice on completed attempts)
- Tests: `ai-assist.test.ts` (contextual success + row logging + request
  shape, outage/500/no-key fallback, assessment prompt guard, owner-only,
  completed-refusal, rate limit) — 7 tests

**Verification:** 50/50 vitest, `tsc`, eslint clean; live end-to-end
(register → start → assist fallback → step still completes → runner 200
with ask panel; live data cleaned up). AI success path covered by tests
with stubbed HTTP; no `OPENROUTER_API_KEY` is configured on any
environment yet — set it (plus optional `AI_MODEL` override) before any
demo that needs live answers.

---

## Phase 6 — Assessment + completion + results ✅

**Scope:** `FR-STU-21`–`FR-STU-30` (submit-once, grading rules, completion
conditions, immutability, results, progress).

**Delivered:**

- `assessment_submissions` (single `SUBMITTED` row with score/feedback,
  one per attempt), `assessment_answers` tables + migration (`0007`) +
  triggers
- `assessment-service.ts` — question view without expected answers,
  completeness validation, MCQ/short-answer grading by normalized
  content comparison (AI never grader), atomic submit, idempotent
  resubmit returning the stored result, explicit complete with
  what-remains 422, read-only result view
- `progress-service.ts` — class counts (`Total / Not Started /
  In Progress / Completed` per active assignment) and per-student
  detail (assigned + independent, steps, observations, score,
  completion date), teacher-only, class-isolated, read-only
- Routes: assessment GET/POST, complete POST, result GET, class
  progress GET, student progress GET
- UI: runner `AssessmentSection` (form → score → complete → result),
  teacher class Progress tab, student progress page linked from
  member rows
- Tests: `assessment.test.ts` (no-leak view, completeness, grading,
  wrong-answer score, submit-once incl. concurrent race, blocked
  completion with remaining counts, full journey, post-completion
  immutability, trigger backstop, teacher counts/isolation) — 8 tests

**Verification:** 58/58 vitest, `tsc`, eslint clean; live full journey
on the seeded experiment (5 steps → 3 required observations → submit
0.6667 → resubmit idempotent → COMPLETED → result; live data cleaned
up).

---

## Phase 7 — Assignments (teacher workflow) ⬜

**Scope:** `FR-TEA-15`–`FR-TEA-24` (version locking, no duplicate active,
date updates, close/cancel with history).

**To deliver:**

- `assignments` table + migration (composite FK, partial unique,
  `CLOSED`/`CANCELLED` terminal)
- Assign published version to owned class, view/update dates, derived
  statuses, close/cancel preserving history

**Verification:** _pending_

---

## Phase 8 — Hardening + deploy ⬜

**Scope:** `CR-06`–`CR-12` (transactions audit, logging hygiene, ~100-user
performance, accessibility pass, production config/migrations/secrets).

**To deliver:**

- Transaction/idempotency audit across multi-record writes
- Sensitive-logging audit, request/correlation IDs
- Accessibility pass per `CR-11` + `UI_DESIGN.md`
- Production deployment (migrations, secrets, AI config)

**Verification:** _pending_

---

## How to advance this file

1. Work the earliest non-complete phase, top to bottom.
2. When a phase's implementation + tests + verification are all done, flip its
   box to ✅ and fill Delivered/Verification in the same change.
3. Never check a phase from tests alone — `TESTING.md` §2 lists the mandatory
   behaviors per area; slice-4+ phases also need a live pass like Phase 1 had.
