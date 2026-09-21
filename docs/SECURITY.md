# ScienceLab Security

> Derived from `REQUIREMENTS.md`, `DOMAIN_MODEL.md`, and `PRODUCT.md` (§11 source-of-truth boundaries).
> This document states the MVP security requirements. It introduces no compliance regimes or security systems beyond what the established documents require.

## 1. Authentication

- Separate student and teacher registration/login/logout flows with identical security properties (`FR-STU-01`–`FR-STU-03`, `FR-TEA-01`–`FR-TEA-03`).
- Registration requires name, email, password; email uniqueness enforced; input validated server-side (`CR-03`).
- No email verification in the MVP (explicitly out of scope; not a gap).
- Login requires valid credentials; invalid credentials produce a safe generic error that does not reveal whether the email exists or which field failed.
- Registration creates an authenticated session; login creates an authenticated session; logout terminates the session.
- Every learning/teaching operation beyond registration/login requires a valid session. Unauthenticated requests are denied before business logic runs.
- Account enumeration, timing, and error-message behavior must not needlessly leak user existence or internals; unexpected failures produce controlled errors (`CR-07`).

## 2. Password handling

- Passwords are securely handled at registration and login (`FR-STU-01`).
- Plain-text passwords are never persisted, never returned in any response, and never written to logs (see §9).
- Password hashes are never returned in responses and never written to logs.
- Password-related failures produce safe errors without indicating the nature of the credential mismatch.

## 3. Sessions

- Sessions are server-managed: created on registration/login, validated per request, terminated on logout.
- Session tokens (or equivalent credentials) are never logged and never exposed beyond their required transport/storage mechanism.
- Expired, missing, or invalid sessions are denied with safe errors.
- A user terminates their own session via logout; any server-side session invalidation required for security must take effect without client cooperation.

## 4. Role-based access control (RBAC)

- Three roles: `STUDENT`, `TEACHER`, `ADMIN` (`CR-01`). Users access only operations permitted for their role.
- Role is determined server-side at registration and checked server-side per request. Client-provided roles are never trusted (`FR-TEA-01`, `CR-02`).
- Role directs the experience (student ↔ student dashboard; teacher ↔ teacher dashboard) but every subsequent operation re-authorizes server-side.

## 5. Ownership enforcement

- **Class ownership:** a teacher manages only classes they own (`FR-TEA-07`, domain invariants 1–2). Viewing, assigning, updating, closing, and member management on a non-owned class are denied server-side.
- **Assignment ownership:** a teacher creates/manages assignments only for owned classes (`CR-05`).
- **Attempt ownership:** an attempt belongs to one student; only that student advances it, records/edits its observations, submits its assessment, or completes it.
- Frontend hiding of controls is never treated as enforcement (`CR-02`).

## 6. Student data isolation

- Each student accesses only their own private learning records (`FR-STU-31`), server-enforced:
  - experiment attempts
  - observations
  - assessment answers
  - assessment results
  - AI interaction history
- A student sees only: classes they belong to, their class names, their teachers' names (`FR-STU-32`). They cannot access another student's information or progress through any API.
- Direct-object access (e.g. guessing another attempt/observation/submission identifier) must be denied by ownership checks on every read and write.

## 7. Teacher class isolation

- A teacher accesses student learning information only for students belonging to classes the teacher owns (`FR-TEA-30`), server-enforced.
- This covers class progress, individual student progress (including independent experiment progress of those students, `FR-TEA-27`), members, assignments, and statuses.
- Teachers cannot modify student learning records in any case (`FR-TEA-28`): no direct modification of attempts, observations, answers, results, or completion state. Monitoring is read-only.
- Class-code knowledge alone grants no teacher privileges; joining via code creates a student membership only.

## 8. Input validation

- All externally supplied input validated on the server (`CR-03`): registration fields, login credentials, class names/descriptions, class codes, experiment/step/attempt identifiers, observation content, assessment answers, assignment dates, and any AI prompt input.
- Invalid input rejected with safe, understandable errors; no internals leaked.
- Validation is the first gate before authorization-adjacent business rules run; failed validation never produces partial state (`CR-06`).

## 9. AI interaction privacy

- AI requests carry only the context the assistance needs (`FR-STU-17`): experiment, current step, authoritative instructions, materials, student question (plus observation requirements per domain model). Unnecessary personal or sensitive data is not sent.
- AI interactions are private learning records subject to the same isolation as other student records (`FR-STU-31`): a student sees only their own history; a teacher sees history only within owned classes and only as monitoring context, never as modifiable records.
- AI output never determines authorization, ownership, access, completion, or scores (`PRODUCT.md` §11). Prompt-injection or manipulated AI output must have no path to privilege escalation or state forgery — the server never treats AI text as a decision.
- During assessment the stricter AI policy applies (`FR-STU-20`): clarification allowed; direct answers, generated responses, and score determination forbidden.
- AI failure produces a fallback, never a bypass: failure must not open unauthorized access or skip required work (`FR-STU-19`).

## 10. Sensitive logging

Per `CR-10`, observability must not become a leak:

- **Never log:** passwords, password hashes, authentication tokens/session secrets, or unnecessary sensitive student information.
- **Do log:** unexpected server errors, important database failures, important external-service (AI) failures, with useful request/context information (e.g. request/correlation IDs).
- Expected validation and authorization failures are logged (or metered) in a way distinguishable from unexpected server errors, without recording sensitive payloads.
- Error responses to clients are controlled and omit internals, stack traces, query details, and secrets.

## 11. Immutable learning records

- Once an attempt is `COMPLETED`, its observations, assessment submission/result, and completion state cannot be modified through normal student or teacher operations (`FR-STU-27`, `FR-TEA-28`).
- Removing a student from a class never deletes historical learning records (`FR-TEA-14`).
- Assignments are not hard-deleted in normal management; closing/cancelling preserves history (`FR-TEA-23`, `FR-TEA-24`).
- The application layer refuses modifications to completed records; database-level backstops (to be finalized in `DATABASE_SCHEMA.md`) complement this refusal (see `ARCHITECTURE.md` §8 and `DECISIONS.md` §8).
- Auditability follows from immutability: completed records remain available for student review and teacher monitoring in their final form.

## 12. What this document does not introduce

- No GDPR/HIPAA/FERPA-or-similar compliance program, no encryption-at-rest/in-transit specification beyond the established secure-handling rules, no rate-limiting/WAF/2FA/SSO/password-complexity regime, no penetration-testing process. If such requirements emerge they are roadmap decisions, not MVP obligations. The MVP security bar is: secure auth/session handling, server-side RBAC/ownership/isolation, validation, AI privacy boundaries, safe logging, and immutable learning records — all enforced server-side.
