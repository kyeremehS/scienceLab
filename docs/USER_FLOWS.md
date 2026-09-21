# ScienceLab User Flows

> Derived from `PRODUCT.md` and `REQUIREMENTS.md`.
> This document describes the MVP user journeys. It introduces no new product behavior.
> Requirement IDs (e.g. `FR-STU-01`) refer to `REQUIREMENTS.md`.
> Domain terms (Assignment, Attempt, Step Progress, Observation vs Observation Definition, etc.) refer to `DOMAIN_MODEL.md`.

## Conventions used in this document

- **Assignment** = a teacher requiring a class to perform an experiment. Does not create an attempt.
- **Attempt** = a student's actual performance of an experiment. Created when the student starts.
- **Gating** = `FR-STU-07`: a student with incomplete active assigned work cannot independently start another experiment.
- All authorization, gating, progression, and completion rules are enforced server-side. The flows below describe what the user sees; enforcement is defined in `REQUIREMENTS.md` (`CR-02`, `CR-04`).

---

## 1. Student flows

### 1.1 Registration and login (`FR-STU-01`, `FR-STU-02`, `FR-STU-03`)

**Registration:**

```text
Landing / Register
  → Enter name, email, password
  → System validates input, rejects duplicate email
  → Account created with role STUDENT (server-determined)
  → Authenticated session created
  → Student dashboard
```

Notes:

- No email verification in the MVP.
- Password is securely handled; never echoed back.
- Duplicate email produces a safe error.

**Login:**

```text
Login
  → Enter email + password
  → Valid credentials → session created → student dashboard
  → Invalid credentials → safe generic error, no session
```

**Logout:**

```text
Any authenticated page
  → Logout
  → Session terminated
  → Returned to unauthenticated state (login/landing)
```

---

### 1.2 Student dashboard (`FR-STU-04`, `FR-STU-30`)

Entry point after login. Simple starting point, not complex analytics.

The dashboard shows, as separate areas:

- Assigned experiments (required current work from all active classes).
- Experiments in progress (incomplete attempts, resumable).
- Recently completed experiments.
- Overall progress (completed / in-progress / assigned; see §1.13).

Assigned work and independently available experiments are presented separately so the student understands what is required vs optional.

---

### 1.3 Joining a class (`FR-TEA-11`, `FR-TEA-12`, `FR-STU-32`)

```text
Dashboard (or Classes area)
  → Enter class code (shared by teacher out-of-band)
  → System validates code
  → If already a member → clear "already a member" response, no duplicate
  → Else → membership created with join timestamp → member of class
  → Student can now see: class name, teacher name
  → Assigned experiments for that class appear on dashboard
```

Notes:

- Invalid/unknown code is rejected with a safe, understandable error.
- Joining does not create any attempt.
- A student may belong to multiple classes.
- A student sees only classes they belong to, plus their own records. They cannot see other students' records.

---

### 1.4 Assigned work (`FR-STU-04`, `FR-TEA-16`, `FR-TEA-18`)

After joining a class with active assignments:

```text
Dashboard → Assigned experiments section
  → Each item shows experiment title + class + status
    (Not Started / In Progress / Completed, derived from learning state)
  → Select an assigned experiment → experiment details
  → Start (or Resume) → attempt created (or resumed)
```

Notes:

- There is no Required vs Optional distinction in the MVP: every active assignment is required current work.
- Assignment does not create the attempt. The attempt is created only when the student starts.
- If the student already has the one allowed attempt for that experiment (`FR-STU-09`), they resume it rather than creating a new one; this holds whether the experiment was originally started as assigned or independent work.

---

### 1.5 Assignment gating (`FR-STU-07`)

Gate evaluated server-side whenever a student attempts to independently start an experiment.

```text
Student selects an experiment that is NOT part of their assigned work
  → Server checks: does this student have any incomplete experiment
    assigned through any active class (ACTIVE assignment, incomplete learning state)?
  → If YES → start is refused with an explanatory message
    (direct the student to their assigned work)
  → If NO (no active incomplete assignments) → start is permitted
```

Additional rules:

- The rule applies across all active classes, not per-class.
- Closed/cancelled assignments do not count as current required work.
- Frontend messaging must reflect the rule, but the frontend is never the enforcement mechanism. Direct API calls must also be refused.
- Assigned experiments themselves are always startable (subject to the one-attempt rule), since starting them is how the student clears the gate.

---

### 1.6 Discovering an experiment (`FR-STU-05`)

Independent discovery, available only when the gate permits starting (browsing catalogue content itself is discovery; starting is gated).

```text
Dashboard / Catalogue
  → Browse published experiments
  → Each entry shows at minimum:
    title, description, difficulty, estimated duration, STEM topic
  → Select an experiment → experiment details
```

Notes:

- Only `PUBLISHED` experiments are normally discoverable. `DRAFT` and `ARCHIVED` are not part of normal student learning.
- Search/filtering beyond basic browsing is Should-Have, not MVP-required.

---

### 1.7 Starting an experiment (`FR-STU-08`, `FR-STU-09`)

From experiment details (`FR-STU-06`: objectives, description, materials, safety, duration, step overview):

```text
Experiment details
  → Understand objectives / materials / safety / step overview
  → Start experiment (if permitted by gate + one-attempt rule)
  → System creates attempt:
      belongs to this student
      references this experiment
      records start time, status IN_PROGRESS
  → Student enters experiment workflow at the current step
```

Variants:

- **First start:** new attempt created.
- **Existing incomplete attempt:** no new attempt; student resumes the same attempt at its persisted current step (`FR-STU-11`).
- **Existing attempt for same experiment (even if completed):** no second attempt in the MVP. Retakes/restarts are out of scope.
- Assignments never auto-create attempts.

Failure handling: invalid experiment reference, unauthorized access, or duplicate-attempt race is rejected safely without partial state (`CR-06`).

---

### 1.8 Experiment step progression (`FR-STU-10`–`FR-STU-13`)

The core experiment loop:

```text
Attempt (IN_PROGRESS)
  → View current step + instructions
  → Perform physical step using real materials
  → Mark step complete (server validates order)
  → Advance to next step
  → Repeat: step → observation (where required) → AI help (optional) → next step
  → ...
  → All required steps complete → eligible for completion (with observations + assessment)
```

Rules visible to the student:

- The system tracks current step, completed steps, required steps, and per-step completion state (Step Progress).
- Leaving/refreshing does not lose persisted progress; the student resumes at the persisted current step.
- Backward navigation to review completed steps is allowed, but does not un-complete them and does not allow bypassing required order.
- Forward progression requiring sequential order is enforced server-side. Skipping a required step via UI manipulation or direct API call is rejected.
- Step completion is persisted server-side immediately (`CR-07`).

---

### 1.9 Observations (`FR-STU-14`, `FR-STU-15`, `FR-STU-16`)

Observations occur inside the active attempt, tied to what the experiment definition asks for.

```text
During attempt (IN_PROGRESS)
  → Prompted for observation(s) defined by the experiment
    (each linked to the attempt + observation definition + relevant step)
  → Record observation text
  → While IN_PROGRESS: may edit previously recorded observations
  → Required observations must all be recorded before completion
  → After COMPLETED: observations become read-only, available for review
```

Notes:

- Observation Definition (what is asked) vs Observation (what the student recorded) remain distinct.
- Completed observations remain reviewable but not editable through normal student operations.

---

### 1.10 AI assistance (`FR-STU-17`–`FR-STU-20`)

Available during the experiment loop; never blocks the workflow.

```text
During attempt
  → Student asks a question (e.g. "My LED isn't lighting")
  → System sends contextual request:
      experiment + current step + authoritative instructions
      + materials + student question
  → AI responds with contextual hints / explanations / troubleshooting
      (prefer guiding toward discovery, not just giving answers)
  → Student continues experiment regardless of AI outcome
```

Rules:

- AI uses authoritative experiment content; it does not invent instructions.
- If the AI service fails: helpful fallback response is shown; the student continues normally.
- During assessment: AI may clarify concepts/terminology and give general guidance, but must not provide the direct answer, generate the student's response, or determine the score. The authoritative result comes from system assessment rules.

AI interactions are part of the student's private learning records.

---

### 1.11 Assessment (`FR-STU-21`–`FR-STU-25`)

Occurs within the attempt, after (or alongside) the practical steps, before completion.

```text
Attempt (IN_PROGRESS, steps + observations underway or done)
  → Open assessment (multiple-choice + short-answer in MVP)
  → Answer all required questions
  → Submit once
  → System: validates → evaluates (MCQ auto-graded; short-answer by
    content-defined expected answers / simple rules; AI is NOT the grader)
    → calculates result → stores result → marks assessment submitted
  → Assessment locked (no resubmission; retakes out of MVP)
```

Rules:

- Submission requires all required assessment information.
- Submission is idempotent/safe to retry: duplicate requests must not create duplicate records or replace the result.
- After submission the assessment cannot be resubmitted through normal operations.

---

### 1.12 Completion (`FR-STU-26`, `FR-STU-27`)

```text
Attempt (IN_PROGRESS)
  All of:
    (1) all required steps completed
    (2) all required observations recorded
    (3) assessment submitted
  → Attempt transitions to COMPLETED (server validates all conditions)
  → Attempt becomes immutable:
      cannot return to IN_PROGRESS
      observations read-only
      assessment cannot be resubmitted
      learning records not modifiable via normal student operations
```

Notes:

- Partial completion (e.g. steps done but assessment missing) does not complete the attempt.
- Failed completion checks produce clear errors indicating what remains.

---

### 1.13 Results and review (`FR-STU-28`, `FR-STU-29`)

After completion:

```text
COMPLETED attempt
  → Result view:
      completion status
      assessment result + feedback
      relevant observations
      experiment summary
  → Review completed experiment + observations (read-only)
  → Progress updated (dashboard / progress view)
```

### 1.14 Progress tracking (`FR-STU-30`)

```text
Dashboard / Progress
  → See: experiments completed, in progress,
    assessment performance, assigned progress,
    independent progress, overall progress
```

No complex analytics engine in the MVP. Progress is derived from persisted attempts, observations, and assessment results.

---

## 2. Teacher flows

### 2.1 Registration and login (`FR-TEA-01`–`FR-TEA-03`)

Same shape as student auth, with role `TEACHER`:

```text
Register (name, email, password; no email verification in MVP)
  → Role assigned server-side (client-provided role never trusted)
  → Session created → teacher dashboard
Login (email + password → session → teacher dashboard; invalid → safe error)
Logout (session terminated)
```

Teacher self-registration is allowed in the MVP.

---

### 2.2 Teacher dashboard (`FR-TEA-04`)

High-level overview, not complex analytics:

- Classes owned.
- Active assignments.
- Class activity.
- Quick actions (create class, assign experiment).

Individual student performance is viewed inside the relevant class, not on the top-level dashboard.

---

### 2.3 Creating a class (`FR-TEA-05`, `FR-TEA-06`, `FR-TEA-09`, `FR-TEA-10`)

```text
Teacher dashboard
  → Create class (name required; description optional)
  → Class belongs to this teacher
  → System generates unique, shareable class code
    (unique among active classes; teacher does not choose it)
  → Teacher views/shares code with students (out-of-band)
```

A teacher may create multiple classes; no artificial limit in the MVP.

---

### 2.4 Students joining (teacher view) (`FR-TEA-11`–`FR-TEA-14`)

```text
Teacher shares code
  → Students join via code (see §1.3)
  → Teacher views class members:
      student name, date joined, current assigned-work status
  → Teacher may remove a student from an owned class
      → membership ended but historical learning records preserved
         (attempts, observations, assessment results retained)
```

Duplicate membership is prevented; re-join attempt returns a clear "already a member" response.

---

### 2.5 Assigning experiments (`FR-TEA-15`–`FR-TEA-18`)

```text
Class view (owned class)
  → Select a published experiment
  → Create assignment:
      class + experiment + creating teacher
      + date assigned + optional start/due dates
  → Assignment is ACTIVE → represents required current work
  → Students in class see it on their dashboards
  → Contributes to assignment gating until complete or closed
```

Rules:

- Only published experiments are assigned in normal flow.
- No Required/Optional distinction: all active assignments are required.
- No duplicate active assignment for the same experiment in the same class.
- Creating the assignment creates no attempts.

---

### 2.6 Managing assignments (`FR-TEA-19`–`FR-TEA-24`)

From the class view, for an owned class:

- **View assignment:** details of the assignment.
- **Update dates:** teacher may update start/due dates of an active assignment. The experiment itself cannot be replaced; a different experiment requires a new assignment.
- **Assignment status:** `Not Started / In Progress / Completed` is derived from student learning state, never set manually by the teacher.
- **History:** assignments are not hard-deleted in normal management; history remains available.
- **Close/cancel:** teacher may close or cancel an active assignment. The record is preserved but no longer counts as active required work (no longer participates in gating).

---

### 2.7 Monitoring class and student progress (`FR-TEA-25`–`FR-TEA-30`)

**Class progress:**

```text
Class view → Progress
  → For each assigned experiment, counts:
      Total students / Not Started / In Progress / Completed
```

**Individual student progress** (only for students in classes the teacher owns):

```text
Class view → Select student
  → See: assignment status, steps completed,
    required observations, assessment result, completion date
  → Also: independent experiment progress for that student
    (visible because the student belongs to the teacher's class)
```

Rules:

- Teachers cannot modify student learning records (attempts, observations, answers, results, completion state). Records are generated only through the student workflow.
- Identifying students needing support uses available status signals (Not Started, In Progress, low scores, incomplete work). No predictive failure AI in the MVP.
- Class-based privacy is server-enforced: a teacher sees learning information only for students in classes they own.

---

## 3. Admin flows

Per `FR-ADM-01` and `PRODUCT.md` §3.3/§10-adjacent scope: admin functionality is intentionally minimal and focused on essential platform management.

Established constraints:

- Admin is a role (`STUDENT / TEACHER / ADMIN`); RBAC applies (`CR-01`).
- Specific administrative workflows are outside the primary MVP learning experience and must not complicate student or teacher flows.
- No admin workflows beyond platform-management operations required to operate ScienceLab are defined in the MVP.

Accordingly, no admin user journey is specified here beyond: an administrator authenticates under RBAC and performs only those platform-management operations required to operate the system. Any additional admin workflow is out of scope for this document.

---

## 4. Cross-flow rules (summary)

These rules cut across the journeys above and are enforced server-side:

1. Role determines permitted operations (`CR-01`, `CR-02`).
2. Assignment gating blocks independent starts while active incomplete assigned work exists (`FR-STU-07`).
3. One attempt per student per experiment; resume otherwise (`FR-STU-09`).
4. Sequential step progression cannot be bypassed (`FR-STU-13`).
5. Required observations required for completion; read-only after (`FR-STU-14`–`FR-STU-16`, `FR-STU-26`).
6. Assessment submitted once; no resubmission; safe retry (`FR-STU-25`, `CR-06`).
7. Completion requires required steps + required observations + submitted assessment + currently `IN_PROGRESS` (`FR-STU-26`); completed attempts immutable (`FR-STU-27`).
8. Student data isolation and teacher class isolation enforced server-side (`FR-STU-31`, `FR-TEA-30`).
9. Significant learning-state changes persisted immediately; refresh/leave/resume safe (`CR-07`).
10. AI failure never blocks the experiment workflow (`FR-STU-19`).

---

## 5. MVP journey check

Student MVP journey (per `PRODUCT.md` §6):

```text
Sign in → Explore → Open experiment → Read objectives/materials/safety
  → Start → Follow steps → Perform physical experiment
  → Record observations → Ask AI → Complete reflection
  → Complete assessment → Receive result → View progress
```

Teacher MVP journey (per `PRODUCT.md` §6):

```text
Sign in → Create class → Share class code → Students join
  → Assign experiment → View class progress → View individual progress
```

If these journeys work reliably under the rules above, the MVP is successful.
