# ScienceLab Agent Instructions

> Instructions for future coding agents working on ScienceLab. Derived from the established documentation hierarchy. Agents introduce no product behavior and make no architectural decisions beyond what the docs state.

## 1. Documentation hierarchy (source of truth)

Read before coding, in this order. Higher documents constrain lower ones:

```text
PRODUCT.md          what ScienceLab is; what belongs in the MVP
  → REQUIREMENTS.md   what the system must do (observable behavior + constraints)
  → DOMAIN_MODEL.md   concepts, relationships, invariants (no tables/columns)
  → DATABASE_SCHEMA.md how persistent state is represented and constrained
  → ARCHITECTURE.md   responsibilities of UI / server / service logic / DB / auth / AI
  → USER_FLOWS.md / API.md / SECURITY.md / DECISIONS.md / ROADMAP.md / ENGINEERING.md / TESTING.md
  → implementation
```

- `PRODUCT.md` defines the MVP journeys and boundaries. If a requested feature is in Should/Could/Won't Have (`PRODUCT.md` §13–§15) or `ROADMAP.md` §2, do not build it as MVP work.
- `REQUIREMENTS.md` requirement IDs (e.g. `FR-STU-07`, `CR-04`) are the acceptance authority. Quote them in PRs/tests.
- `DOMAIN_MODEL.md` owns concept definitions and distinctions (Assignment ≠ Attempt; Step ≠ Step Progress; Definition ≠ Observation; Question ≠ Answer; Submission ≠ Result; AI Interaction ≠ authoritative state). Preserve them in code naming and structure.
- `DATABASE_SCHEMA.md` owns tables/columns/indexes/constraints. **Status:** finalized with whole-experiment versioning, assignment version locking, and the §4 refinements (see `DECISIONS.md` §8). Implement exactly what it specifies; do not invent alternative versioning/locking mechanics.
- `ARCHITECTURE.md` owns layer responsibilities and the app-rules-vs-DB-constraints split. Do not move authorization, grading, gating, or completion decisions into the client or into AI output.
- `DECISIONS.md` records what is already decided — and marks what is open (§8). Treat open items as blockers for design, not as freedom to choose.

## 2. Before writing any code

1. Read `PRODUCT.md`, `REQUIREMENTS.md`, and `DOMAIN_MODEL.md` in full for the area you are touching, plus `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, and the relevant section of `TESTING.md`.
2. For Next.js work, read the relevant guide in `node_modules/next/dist/docs/` first — this project uses Next 16, which has breaking changes versus older Next.js (see repo `AGENTS.md` auto-generated notice). Heed deprecation notices; do not rely on memorized APIs.
3. Check `DECISIONS.md`: if your task touches an open item (e.g. versioning/locking), stop and report instead of deciding.
4. Check `ROADMAP.md`: confirm the work is MVP (§1), not post-MVP (§2).

## 3. Hard rules

1. **Do not invent product behavior.** If it is not in `REQUIREMENTS.md` / `USER_FLOWS.md` / `API.md`, do not build it. Ask or file a requirements gap.
2. **Enforce business rules server-side.** Gating, ownership, isolation, one-attempt, progression order, required observations, submit-once, completion conditions, immutability — all in server code, all re-checked per request (`CR-02`, `CR-04`). Never rely on hidden UI, client roles, or client checks.
3. **Respect database constraints.** Writes must satisfy the integrity rules in `CR-05` / `ARCHITECTURE.md` §8. Use transactions for multi-record changes and idempotent handling for retryable operations (attempt creation, submissions, memberships, assignments).
4. **Preserve historical and immutable records.** Completed attempts, observations, submissions, and results are read-only via normal operations. Membership removal and assignment close/cancel preserve history; never hard-delete learning history (`FR-TEA-14`, `FR-TEA-23`, `FR-STU-27`).
5. **Keep AI non-authoritative.** AI output never determines state, scores, completion, or authorization. Apply the assessment-time restrictions (`FR-STU-20`) and the failure fallback (`FR-STU-19`). Never log secrets or send unnecessary personal data to the AI service.
6. **Validate everything server-side** (`CR-03`) and return safe, understandable errors. Never leak internals, stack traces, hashes, or tokens.
7. **Write tests for critical business rules** (see `TESTING.md`): gating, one-attempt, progression, observations, submission-once, completion, immutability, isolation, class boundaries, AI fallback, transactional safety. Add or update tests with every behavior change.
8. **Make bounded changes.** Touch only what the task requires. Avoid unrelated refactoring, dependency upgrades, or "drive-by" cleanups.
9. **Follow `ENGINEERING.md` conventions** (TypeScript strictness, server/client boundaries, Drizzle access path, migrations, logging, naming, dependency discipline). Do not introduce abstractions or infrastructure the MVP does not need.
10. **Verify your work.** Run the relevant checks (typecheck, lint, migrations, targeted tests) and report what you ran. Do not claim verification you did not perform.

## 4. Domain language to use in code

- User (role `STUDENT | TEACHER | ADMIN`); Class; ClassMembership; Experiment; ExperimentStep; ObservationDefinition; Assignment (`ACTIVE | CLOSED | CANCELLED`, last two terminal); ExperimentAttempt (`IN_PROGRESS | COMPLETED`); StepProgress; Observation; Assessment; AssessmentQuestion; AssessmentSubmission; AssessmentAnswer; AssessmentResult; AIInteraction.
- Keep definition-vs-state pairs separate in types, tables, and function names (e.g. `observationDefinitions` vs `observations`; `questions` vs `answers`).

## 5. When you find a contradiction or gap

- Stop. Do not resolve it by inventing a decision.
- Report: which documents conflict (file + section), what each says, and what is blocked.
