# ScienceLab Engineering Conventions

> Derived from the actual project setup and `ARCHITECTURE.md`. Covers how code is written, organized, and shipped in this repo. Introduces no conventions that conflict with the established architecture.

## 0. Current project facts (ground truth at time of writing)

- Package manager: `pnpm@10.33.4` (`package.json`). Scripts: `dev` / `build` / `start` / `lint`.
- Runtime/UI: `next@16.3.4`, `react@19.2.8` / `react-dom@19.2.8`. **Next 16 has breaking changes** — read `node_modules/next/dist/docs/` before writing framework code (repo `AGENTS.md` notice).
- Styling: `tailwindcss@4` via `@tailwindcss/postcss` (`postcss.config.mjs`).
- DB: `drizzle-orm@^0.45.2` + `postgres@^3.4.9` (`src/db/index.ts` uses `drizzle-orm/postgres-js` over `postgres`, connection from `process.env.DATABASE_URL`); `drizzle-kit@^0.31.10` with `drizzle.config.ts` (`schema: ./src/db/schema.ts`, `out: ./drizzle`, `dialect: postgresql`). Local DB: `postgres:17` via `docker-compose.yml` (`sciencelab-postgres`, db `sciencelab`).
- Language: `typescript@^5`, `strict: true`, `@/* → ./src/*` path alias, bundler resolution, `isolatedModules` (`tsconfig.json`).
- Lint: flat config + `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` (`eslint.config.mjs`); run via `pnpm lint`.
- Layout: `src/app/` (App Router; `layout.tsx`, `page.tsx`, `globals.css`, `api/health/`), `src/db/` (`schema.ts`, `index.ts`), `drizzle/` migrations, `docs/` documentation, `public/` assets.
- Only table modeled so far: `users` (+ `user_role` enum `STUDENT | TEACHER | ADMIN`, unique email) — the rest of the schema is documentation-first work still to be specified in `DATABASE_SCHEMA.md`.

## 1. TypeScript

- `strict` stays on. No implicit `any`, no unchecked indexing assumptions, no `@ts-ignore` without a linked justification.
- Prefer precise domain union types mirroring the docs (`STUDENT | TEACHER | ADMIN`; `ACTIVE | CLOSED`; `IN_PROGRESS | COMPLETED`; `MULTIPLE_CHOICE | SHORT_ANSWER` when the schema defines it) over bare strings.
- Use `dotenv`-loaded env only through validated accessors; `process.env.DATABASE_URL!`-style non-null assertions are tolerated only at the single DB-client boundary (`src/db/index.ts`), never scattered through feature code.
- Path alias `@/*` for cross-module imports; relative imports only within the same feature folder.

## 2. Next.js (App Router, v16)

- Server-first: default to Server Components and Route Handlers / Server Actions (per v16 docs) for data access, auth checks, and mutations. Client Components only where interactivity genuinely requires it (step flow UI, assessment forms, AI chat surface).
- Never fetch-or-mutate the database from client code. Client calls the server API; the server enforces authz + business rules + validation.
- Read the v16 docs for routing, caching, metadata, and error conventions before adding pages, layouts, loading/error boundaries, or route handlers. Do not carry over pre-v16 patterns (e.g. pages-router data fetching, deprecated metadata or caching APIs) without checking deprecations.
- Keep `next.config.ts` minimal; any addition needs a comment explaining why the MVP requires it.

## 3. Server / client boundaries

- **Server owns:** session validation, RBAC/ownership/membership checks, input validation, gating, progression, observations, assessment grading, completion transitions, immutability refusal, transactions, logging.
- **Client owns:** presentation, navigation, form state, optimistic display clearly marked as unconfirmed, accessible feedback, AI-assistance display (non-blocking; navigation never awaits AI).
- Shared validation schemas (e.g. zod or equivalent, if adopted) live in one shared module imported by both layers so client messages match server refusals — but the server check is the enforcement.

## 4. Database access

- Single access path: `src/db/index.ts` (`db`) + `src/db/schema.ts` (Drizzle tables). No second ORM, no raw `postgres` client in feature code, no bypassing `db`.
- Feature code never hand-writes SQL except through Drizzle query builders or reviewed migrations. Unreviewed string-concatenated SQL is forbidden.
- Every read that returns learning data filters by ownership/membership in the query (defense in depth with the service-layer check), never "fetch all then filter in JS".
- Multi-record writes use transactions (e.g. submission + answers + result; completion transition). Retryable creates (attempts, submissions, memberships, assignments) are idempotent: unique constraints + upsert-or-return-existing, never blind inserts.
- Indexes for the MVP access patterns (owner lookups, class membership, assignment lookups, attempt-by-student-experiment, step/observation/submission-by-attempt) are defined with the schema, not bolted on later. Keep queries minimal per `CR-08`.

## 5. Validation

- Validate all external input server-side (`CR-03`): bodies, query params, route params, headers/session, class codes, IDs, observation text, answers, dates.
- Reject with safe, understandable errors (field-level messages for forms; generic-safe for auth). Never echo secrets or internals.
- Completion and progression endpoints re-validate the full precondition set on every call (steps, observations, submission, current status) rather than trusting a client-supplied "ready" flag.

## 6. Error handling

- Expected failures (validation, authz denial, gating refusal, duplicate, out-of-order step, incomplete completion, resubmission) → typed, user-safe errors with stable codes/messages the UI can render.
- Unexpected failures (DB outage, AI outage beyond fallback, unhandled exception) → controlled 5xx-equivalent without internals; logged with request/correlation ID (`CR-10`).
- Failed operations leave no partial learning state; use transactions and check-then-act atomically where races are possible (one-attempt, submit-once, join-once, assign-once).

## 7. Migrations

- Schema changes only via `drizzle-kit generate` → reviewed SQL in `drizzle/` → `drizzle-kit migrate` (or the project's adopted migrate command). Never edit the database by hand; never edit an applied migration in place — write a new one.
- Every migration must be deploy-safe (expand-then-contract where needed) and runnable in production with only `DATABASE_URL` + documented env (`CR-12`).
- Seed/demo data (including the first experiment content per `PRODUCT.md` §12) lives as versioned seed scripts, separate from migrations, runnable in dev and reviewable for staging/demo.

## 8. Testing

- Conventions for what to test live in `TESTING.md`. Practical rules: colocate unit tests with the rule they cover; name tests by requirement ID + behavior (e.g. `FR-STU-07 blocks independent start with active assignment`); one behavior per test; use transactions/rollback or isolated test DB so tests never pollute each other.
- No arbitrary coverage percentage. Missing coverage of a critical rule is a defect; missing coverage of a trivial presentational component is not.

## 9. Logging

- Log unexpected server errors, important DB failures, and important AI-service failures with request/correlation IDs and minimal context (`CR-10`).
- Never log passwords, hashes, tokens, session secrets, or unnecessary student PII. Distinguish expected validation/authz failures from unexpected errors in log level and content.
- No `console.log` debugging left in shipped code; use the project's logger (once adopted) consistently.

## 10. Naming

- Code names mirror domain language (`AGENTS.md` §4): `ExperimentAttempt` not `Session`; `ObservationDefinition` vs `Observation`; `AssessmentSubmission` vs `AssessmentResult`; `ClassMembership` not `Enrollment`; `StepProgress` not `StepState`.
- Functions read as rules: `startExperiment`, `resumeAttempt`, `completeStep`, `recordObservation`, `submitAssessment`, `completeAttempt`, `createAssignment`, `closeAssignment`, `joinClassByCode`.
- Files: kebab- or lowerCamel per existing tree; keep feature modules together (route + service + tests) rather than scattering by technical layer.

## 11. Dependency discipline

- The dependency set is the MVP set in `package.json`. Adding a dependency requires: a documented MVP need, a check that the platform (Next/React/Drizzle/Tailwind) does not already cover it, and a preference for small, maintained packages.
- No new infrastructure dependencies (queues, caches, analytics, AI frameworks beyond the specified integration, auth providers) without a roadmap + architecture update. `CR-08` / `CR-12` forbid speculative infrastructure.

## 12. Avoiding unnecessary abstractions

- No generic plugin systems, no premature repositories/factories/builders, no shared "utils" dumping ground. Extract a helper only on third use or when two critical rules share genuinely identical logic.
- Keep the layering in `ARCHITECTURE.md` visible: UI → server/API → service logic → `db` → PostgreSQL. Do not insert layers (service locators, event buses, ORMs-behind-ORMs) the MVP does not need.
- Documentation changes ride with code changes: if behavior changes, update the affected doc section in the same change; if a doc gap blocks you, report it (`AGENTS.md` §5) instead of coding around it.
