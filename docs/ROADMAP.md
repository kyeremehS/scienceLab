# ScienceLab Roadmap

> Derived from `PRODUCT.md` (§7 MVP Scope, §13 Should Have, §14 Could Have, §15 Won't Have, §16 Success Criteria, §19 MVP Definition) and `REQUIREMENTS.md` (§35 MVP Boundary).
> Clearly separates MVP from post-MVP. Introduces no dates or deadlines and promotes no excluded idea into a current requirement.

## 1. MVP — build now

The MVP must demonstrate one complete, believable practical STEM learning journey. Success is judged per `PRODUCT.md` §16: a student completes an experiment end-to-end without developer intervention; a teacher creates a class, gets students joined, assigns an experiment, and sees meaningful progress; the loop Learn → Perform → Observe → Reflect → Assess → Improve works; critical flows are reliable; authorization holds; invalid states are prevented; the repo demonstrates sound engineering.

### 1.1 Authentication and access

- Student registration, login, logout with secure handling and role-based access (`FR-STU-01`–`FR-STU-03`).
- Teacher registration, login, logout; server-determined roles (`FR-TEA-01`–`FR-TEA-03`).
- Minimal platform administration only (`FR-ADM-01`).

### 1.2 Student learning journey

- Student dashboard (assigned vs independent, in-progress, recently completed, overall progress).
- Experiment catalogue + experiment details (objectives, materials, safety, duration, step overview).
- Assignment-gated independent starts (server-enforced).
- Start/resume with one attempt per experiment.
- Step-by-step flow with sequential progression, backward review, persisted resumable state.
- Observation recording/editing while active; read-only after completion.
- Contextual AI assistance with authoritative content + fallback + assessment-time boundaries.
- Assessment (multiple-choice + short-answer), submit-once with safe retry, content-rule grading (AI never the grader).
- Completion (required steps + required observations + submitted assessment + `IN_PROGRESS`) with completed-attempt immutability.
- Results, review, and simple progress tracking.

### 1.3 Teacher teaching journey

- Teacher dashboard (classes, active assignments, activity, quick actions).
- Class creation with system-generated codes; multiple classes allowed; code sharing.
- Student joining via code; duplicate prevention; member listing; removal preserving history.
- Experiment assignment (published experiments to owned classes, optional start/due dates); no duplicate active assignment per experiment per class; assignments create no attempts.
- Assignment management: view, update dates, derived statuses, history preservation, close/cancel preserving history; no experiment replacement.
- Progress monitoring: class counts (`Total / Not Started / In Progress / Completed`) and individual student progress (steps, observations, assessment result, completion date, including independent work of students in owned classes); read-only; class-isolated; support identification via status signals (no predictive AI).

### 1.4 Platform and engineering

- Experiment management (published content lifecycle: `DRAFT / PUBLISHED / ARCHIVED` per domain model; students/teachers operate on published).
- Relational data storage (PostgreSQL), authorization, API layer, server-side validation, error handling, logging (no sensitive logging), automated tests for critical rules, database migrations, seed/demo data (including the first experiment: Building a Simple Electrical Circuit, `PRODUCT.md` §12), deployment.
- Cross-cutting bars: server-side authorization, two-layer integrity, failure safety, persistence, ~100-concurrent-user performance, accessibility, deployability (see `ARCHITECTURE.md` §10).

### 1.5 First experiment (MVP proof content)

Building a Simple Electrical Circuit — objectives, materials (battery, LED, resistor, wires, breadboard/connection method), and the flow Introduction → Objectives → Materials → Safety → Steps 1–5 → Observation → Troubleshooting → Reflection → Assessment. This content exercises the full journey; it is seed content, not a separate roadmap item.

## 2. Post-MVP — future possibilities (explicitly NOT current requirements)

### 2.1 Should Have (candidates once the core MVP is stable; must not delay it)

Per `PRODUCT.md` §13:

- Experiment search and filtering.
- Richer progress analytics.
- Teacher notes.
- Experiment difficulty levels.
- Student achievement indicators.
- Richer AI explanations.
- Experiment recommendations.

These may be considered only after the §1 journeys work reliably.

### 2.2 Could Have (longer-term possibilities; intentionally outside the MVP)

Per `PRODUCT.md` §14:

- Experiment image uploads; AI analysis of experiment photos.
- Computer vision for physical experiments.
- Voice-based assistance.
- Interactive simulations.
- Curriculum-specific learning paths.
- Multilingual support.
- Offline experiment mode.
- Mobile application.
- School administration; parent accounts.

### 2.3 Won't Have in MVP (explicit exclusions; see also `REQUIREMENTS.md` §35)

Per `PRODUCT.md` §15 (and `REQUIREMENTS.md` §35, which additionally excludes physical-action verification, complex recommendations, predictive failure models, complex analytics infrastructure, multi-region/speculative scaling infrastructure):

- Payments, subscriptions, marketplace.
- Social networking.
- Live classes.
- Voice AI, computer vision.
- Native mobile application.
- Hardware integrations.
- Digital experiment simulation.
- Complex recommendation systems.
- Complex analytics infrastructure.
- Multi-region deployment.
- Speculative infrastructure not required by the MVP.

These do not help prove the core product at this stage and must not be built or promised as part of the MVP. Promoting any of them requires a deliberate roadmap decision with corresponding requirements, domain, schema, architecture, and security updates — not an implementation shortcut.

## 3. Ordering principle

> Does this help us deliver a complete, reliable practical STEM learning experience? (`PRODUCT.md` §17)

If yes, it belongs in §1. If no, it stays in §2 until the MVP success criteria are met.
