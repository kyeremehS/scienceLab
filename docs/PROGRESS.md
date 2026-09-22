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

## Phase 2 — Classes + membership 🟡 (next)

**Scope:** `FR-TEA-05`–`FR-TEA-14`, `FR-STU-32`, `CR-05` (membership uniqueness,
history preservation).

**To deliver:**

- `classes`, `class_memberships` tables + migration (partial unique index,
  `active`/`left_at` history)
- Teacher: create class (system code), list/own classes, view class + members,
  share code, remove student (history preserved)
- Student: join by code, duplicate-join refusal, view own classes
- Server-side ownership checks on every operation
- Tests: duplicate membership, non-owned access denied, removal preserves
  history, invalid code

**Verification:** _pending_

---

## Phase 3 — Experiments catalogue + versions ⬜

**Scope:** `FR-STU-05`, `FR-STU-06`, experiment lifecycle
(`DRAFT/PUBLISHED/ARCHIVED`, one published per experiment).

**To deliver:**

- `experiments`, `experiment_versions`, `experiment_steps`,
  `observation_definitions`, `assessments`, `assessment_questions` tables +
  migration (version immutability, unique orders, single published)
- Student catalogue + experiment details (objectives, materials, safety,
  step overview)
- Seed: Building a Simple Electrical Circuit (`PRODUCT.md` §12)
- Tests: draft/archived hidden, step order integrity

**Verification:** _pending_

---

## Phase 4 — Attempts + steps + observations ⬜

**Scope:** `FR-STU-07`–`FR-STU-16`, `CR-04`, `CR-07` (gating, one-attempt,
progression, persistence/resume).

**To deliver:**

- `experiment_attempts` (nullable `assignment_id`, version inheritance),
  `step_progress` (absent = `NOT_STARTED`, version-consistency check),
  `observations` tables + migration + triggers
- Start/resume, assignment gate across all active classes, sequential
  progression with backward review, observation record/edit, read-only after
  completion
- Experiment runner UI (per `UI_DESIGN.md` evolution)

**Verification:** _pending_

---

## Phase 5 — AI assistance ⬜

**Scope:** `FR-STU-17`–`FR-STU-20` (contextual help, authoritative content,
failure fallback, assessment boundaries).

**To deliver:**

- `ai_interactions` table + migration (best-effort logging)
- Contextual assistance endpoint (experiment + step + materials + question),
  fallback response, non-blocking UI panel
- Assessment-time restrictions (clarify only; no answers/scores)

**Verification:** _pending_

---

## Phase 6 — Assessment + completion + results ⬜

**Scope:** `FR-STU-21`–`FR-STU-30` (submit-once, grading rules, completion
conditions, immutability, results, progress).

**To deliver:**

- `assessment_submissions` (single `SUBMITTED` row with score/feedback),
  `assessment_answers` tables + migration + triggers
- Submit-once with idempotent retry, MCQ auto-grade, short-answer content
  rules (AI never grader), completion transition, result/review views,
  student progress
- Teacher class/student progress views (`FR-TEA-25`–`FR-TEA-30`, read-only,
  class-isolated)

**Verification:** _pending_

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
