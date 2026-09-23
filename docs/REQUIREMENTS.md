
````
# ScienceLab Requirements

## 1. Purpose

This document defines the functional and cross-cutting requirements for the ScienceLab MVP.

Every requirement describes observable system behavior or a system-level constraint.

The requirements are organized around:

- Student functionality
- Teacher functionality
- Administrative responsibilities
- Cross-cutting system requirements

The database schema, API design, and implementation details are intentionally defined in later engineering documents.

---

# 2. Actors

ScienceLab has three actors:

| Actor | Purpose |
|---|---|
| Student | Performs experiments and learns |
| Teacher | Assigns experiments and monitors students |
| Admin | Manages the platform |

For the MVP, Student and Teacher receive most of the product attention.

---

# 3. Student Requirements

## 3.1 Authentication

### FR-STU-01 — Student registration

A student can create an account.

Required registration information:

- Name
- Email
- Password

Acceptance criteria:

- System validates the submitted information.
- System prevents duplicate email accounts.
- System securely handles the password.
- System creates the student account.
- Student is authenticated after successful registration.

Email verification is not required for the MVP.

---

### FR-STU-02 — Student login

A registered student can log into ScienceLab.

Acceptance criteria:

- Student submits valid credentials.
- System authenticates the student.
- System creates an authenticated session.
- Student is directed to the student experience.
- Invalid credentials produce a safe error.

---

### FR-STU-03 — Student logout

A student can terminate their authenticated session.

---

### FR-AUTH-01 — Password recovery request

A user who forgot their password can request a password reset using their account email.

Acceptance criteria:

- User submits an email address.
- The response is identical whether or not an account exists for that email (no account enumeration).
- If an account exists, the system creates a short-lived, single-use reset token and sends a reset link through the configured mail channel.
- Request rate is limited to prevent abuse.

---

### FR-AUTH-02 — Password reset

A user with a valid reset token can set a new password.

Acceptance criteria:

- System validates the token: it exists, has not expired, and has not been used.
- System validates the new password under the same rules as registration.
- On success the password is replaced, the token is marked used and cannot be reused.
- Invalid, expired, or reused tokens produce a safe error without revealing account information.
- The user can log in with the new password.

Email verification is not required for the MVP and is explicitly deferred (see `ROADMAP.md`).

---

### FR-AUTH-03 — Change password while logged in

An authenticated user can change their password by providing the current password and a new password.

Acceptance criteria:

- System re-verifies the current password; a wrong current password produces a safe error.
- System validates the new password under the same rules as registration.
- On success the password is replaced; the current session continues.

---

# 4. Student Dashboard

### FR-STU-04 — View dashboard

A student can view their learning dashboard.

The dashboard provides useful information including:

- Assigned experiments
- Experiments in progress
- Recently completed experiments
- Overall progress

The dashboard is a starting point for learning, not a complex analytics system.

Assigned experiments and independently available experiments are presented as separate areas.

---

# 5. Experiment Discovery and Access

### FR-STU-05 — View published experiments

A student can discover published experiments independently.

Each experiment provides enough information for the student to understand what it involves.

At minimum:

- Title
- Description
- Difficulty
- Estimated duration
- Relevant STEM topic

---

### FR-STU-06 — View experiment details

A student can open an experiment and view:

- Learning objectives
- Description
- Materials
- Safety instructions
- Estimated duration
- Experiment step overview

The student should understand what they are about to do before starting.

---

### FR-STU-07 — Enforce assigned-work gating

Teacher assignments represent the student's required current learning work.

If a student belongs to one or more active classes and has incomplete experiments assigned through those classes, the student must complete those assigned experiments before independently starting another experiment.

This rule applies across all active classes.

Example:

```text
Class A
  └── Experiment 1 → Incomplete

Class B
  └── Experiment 2 → Not Started

Independent Experiment
  └── Start → NOT ALLOWED
````

Independent experimentation becomes available when the student has no incomplete required assignments from any active class.

The server must enforce this rule.

The frontend must not be the only enforcement mechanism.

---

# 6. Starting an Experiment

### FR-STU-08 — Start experiment

A student can start an experiment when they are permitted to do so.

When the student starts:

1. The system creates an experiment attempt.
2. The attempt belongs to the student.
3. The attempt references the experiment.
4. The system records when the attempt started.
5. The student enters the experiment workflow.

Assignments do not create attempts.

A student starting an assigned experiment creates the attempt.

---

### FR-STU-09 — One attempt per experiment

For the MVP, a student can have only one experiment attempt for a given experiment.

The system does not support retakes, restarts, or additional attempts in the MVP.

If an existing incomplete attempt exists, the student resumes that attempt.

---

# 7. Experiment Progress

### FR-STU-10 — Complete experiment steps

A student can progress through an experiment step by step.

The system maintains:

* Current step
* Completed steps
* Required steps
* Step completion state

---

### FR-STU-11 — Resume experiment

If a student leaves an experiment before completing it, they can return later and continue the same attempt.

The student resumes from the appropriate current step.

Refreshing the page or temporarily leaving the application must not reset the attempt's persisted progress.

---

### FR-STU-12 — Review completed steps

A student can move backward to review previously completed steps.

Backward navigation must not allow the student to bypass required progression.

---

### FR-STU-13 — Prevent invalid progression

The system prevents a student from completing required steps in an invalid order when the experiment requires sequential progression.

Progression rules are enforced server-side.

A student must not be able to bypass these rules by directly calling an API.

---

# 8. Observations

### FR-STU-14 — Record observations

During an active experiment, a student can record observations.

Each required observation is defined by the experiment.

An observation is associated with:

* Student
* Experiment attempt
* Relevant experiment step

---

### FR-STU-15 — Edit observations

A student can modify observations while the experiment is in progress.

---

### FR-STU-16 — Protect completed observations

Once an experiment is completed, its observations become read-only.

Completed observations remain available for review but cannot be modified.

---

# 9. AI Assistance

### FR-STU-17 — Request contextual AI assistance

A student can request AI assistance while performing an experiment.

The AI request uses relevant context including:

* Experiment
* Current step
* Authoritative experiment instructions
* Relevant materials
* Student question

The AI is not a generic chatbot.

---

### FR-STU-18 — Use authoritative experiment content

AI assistance must use the experiment's authoritative content when providing experiment guidance.

The AI must remain contextual to the experiment and current learning step.

---

### FR-STU-19 — AI failure handling

If the AI service is unavailable, the system provides a helpful fallback response.

AI failure must not prevent the student from continuing the experiment.

AI is an assistance layer and is not a dependency for the core experiment workflow.

---

### FR-STU-20 — AI behavior during assessment

During an assessment, AI may:

* Clarify concepts
* Explain terminology
* Provide general guidance

AI must not:

* Provide the direct answer to an assessment question
* Generate the student's assessment response
* Determine the authoritative assessment score

The authoritative assessment result comes from the assessment rules defined by the system and experiment content.

---

# 10. Assessment

### FR-STU-21 — Complete assessment

A student can complete an assessment associated with an experiment.

MVP question types:

* Multiple choice
* Short answer

---

### FR-STU-22 — Submit assessment

A student can submit an assessment once all required assessment information has been provided.

When submitted, the system:

1. Validates the submission.
2. Evaluates applicable questions.
3. Calculates the result.
4. Stores the result.
5. Records that the assessment has been submitted.

---

### FR-STU-23 — Evaluate multiple choice questions

Multiple choice questions are automatically evaluated by normalized exact match against their defined correct answers.

---

### FR-STU-24 — Evaluate short-answer questions

Short-answer questions use teacher/content-defined expected answers and simple evaluation rules:

* Significant words (length 4 or more, excluding common stopwords) are extracted from the expected answer.
* The response is correct when it contains at least half of those key terms (rounded up).
* An expected answer with no key terms falls back to normalized exact match.

AI is not the authoritative grader for short-answer questions.

Content authors should keep expected answers to core terms so paraphrased student responses can pass (see `DECISIONS.md` §12).

---

### FR-STU-25 — Prevent duplicate assessment submission

A student can submit an assessment only once for an experiment attempt.

After submission:

* The assessment cannot be resubmitted.
* The assessment result cannot be replaced through another submission.

Retakes are outside the MVP.

The submission operation must be safe against duplicate requests.

---

# 11. Experiment Completion

### FR-STU-26 — Complete experiment

An experiment attempt can become `COMPLETED` only when all required completion conditions have been satisfied.

Required conditions:

1. All required experiment steps are completed.
2. All required observations have been recorded.
3. The assessment has been submitted.
4. The attempt is currently `IN_PROGRESS`.

Conceptually:

```text
Required steps complete
          +
Required observations recorded
          +
Assessment submitted
          ↓
   Experiment completed
```

---

### FR-STU-27 — Protect completed attempts

Once an experiment attempt becomes completed:

* It cannot return to `IN_PROGRESS`.
* Observations cannot be edited.
* Assessment cannot be resubmitted.
* Learning records cannot be modified through normal student operations.

Completed attempts remain available for review.

---

# 12. Results

### FR-STU-28 — View experiment result

After completing an experiment, the student can view:

* Completion status
* Assessment result
* Feedback
* Relevant observations
* Experiment summary

---

### FR-STU-29 — Review completed experiment

A student can review their completed experiment and observations.

Completed learning records are read-only.

---

# 13. Student Progress

### FR-STU-30 — View learning progress

A student can view simple learning progress.

Progress can include:

* Experiments completed
* Experiments in progress
* Assessment performance
* Assigned experiment progress
* Independent experiment progress
* Overall progress

The MVP does not require a complex learning analytics engine.

---

# 14. Student Authorization

### FR-STU-31 — Student data isolation

A student can only access their own private learning records.

Private records include:

* Experiment attempts
* Observations
* Assessment answers
* Assessment results
* AI interaction history

The server must enforce this isolation.

Frontend visibility controls are not sufficient.

---

### FR-STU-32 — Class information visibility

A student can see:

* Classes they belong to
* Their class name
* Their teacher's name

A student cannot access another student's private information or learning progress.

---

### FR-STU-33 — Leave class

A student can leave a class they previously joined.

Acceptance criteria:

* The membership ends but the student's learning history is preserved.
* Leaving does not delete attempts, observations, assessment results, or AI history.
* The student may rejoin the same class later with its code.

---

# 15. Teacher Requirements

## 15.1 Teacher Authentication

### FR-TEA-01 — Teacher registration

A teacher can create an account.

Required information:

* Name
* Email
* Password

Email verification is not required for the MVP.

Teacher self-registration is allowed for the MVP.

The server determines the account role and must not trust a client-provided role.

---

### FR-TEA-02 — Teacher login

A registered teacher can log into ScienceLab.

Acceptance criteria:

* Teacher submits valid credentials.
* System authenticates the teacher.
* System creates an authenticated session.
* Teacher is directed to the teacher experience.
* Invalid credentials produce a safe error.

---

### FR-TEA-03 — Teacher logout

A teacher can terminate their authenticated session.

---

# 16. Teacher Dashboard

### FR-TEA-04 — View teacher dashboard

A teacher can view a dashboard containing high-level information such as:

* Classes
* Active assignments
* Class activity
* Quick actions

The dashboard does not provide complex analytics.

Individual student performance is viewed within the relevant class.

---

# 17. Classes

### FR-TEA-05 — Create class

A teacher can create a class.

Required information:

* Class name

Optional information:

* Description

The class belongs to the teacher who created it.

The system generates a unique class code.

---

### FR-TEA-06 — Create multiple classes

A teacher can create multiple classes.

The MVP does not impose an artificial class limit.

---

### FR-TEA-07 — View teacher's classes

A teacher can view classes they own.

Class information includes:

* Class name
* Description
* Number of students
* Active assignments

A teacher can only manage classes they own.

Authorization is enforced server-side.

---

### FR-TEA-08 — View class

A teacher can view a class they own.

The class view provides:

* Class information
* Members
* Assigned experiments
* Assignment status
* Class progress

---

# 18. Class Membership

### FR-TEA-09 — Generate class code

When a teacher creates a class, the system generates a unique class code.

The code:

* Is unique among active classes.
* Is generated by the system.
* Is suitable for sharing with students.

Teachers do not manually choose the class code.

---

### FR-TEA-10 — Share class code

A teacher can view and share the class code with students.

---

### FR-TEA-11 — Join class

A student can enter a valid class code to join a class.

The system:

* Validates the code.
* Adds the student to the class.
* Records when the student joined.

---

### FR-TEA-12 — Prevent duplicate membership

A student cannot join the same class more than once.

If the student is already a member, the system provides a clear response indicating that they are already a member.

---

### FR-TEA-13 — View class members

A teacher can view members of a class they own.

Member information includes:

* Student name
* Date joined
* Current assigned-work status

Detailed learning progress is available through the student's progress view.

---

### FR-TEA-14 — Remove student from class

A teacher can remove a student from a class they own.

Removing a student from a class does not delete the student's previous learning history.

Historical attempts, observations, assessment results, and other learning records remain preserved.

---

# 19. Assignments

### FR-TEA-15 — Assign experiment

A teacher can assign a published experiment to a class they own.

An assignment records information including:

* Class
* Experiment
* Teacher who created the assignment
* Date assigned
* Optional start date
* Optional due date

---

### FR-TEA-16 — Assignment represents required work

A class assignment represents the class's required current learning work.

There is no Required versus Optional assignment distinction in the MVP.

Incomplete assignments contribute to the student's assignment-gating rule.

---

### FR-TEA-17 — Prevent duplicate active assignment

A class cannot have more than one active assignment for the same experiment in the MVP.

---

### FR-TEA-18 — Assignment does not create an attempt

Creating an assignment does not create an experiment attempt for students.

A student creates an attempt only when they start the experiment.

---

# 20. Assignment Management

### FR-TEA-19 — View assignment

A teacher can view the details of an assignment for a class they own.

---

### FR-TEA-20 — Update assignment dates

A teacher can update the start date or due date of an active assignment.

---

### FR-TEA-21 — Prevent experiment replacement

A teacher cannot replace the experiment associated with an existing assignment.

If a different experiment is required, the teacher creates a new assignment.

---

### FR-TEA-22 — View assignment status

Teacher-visible assignment statuses are derived from student learning state.

Statuses include:

* Not Started
* In Progress
* Completed

Teachers do not manually set these statuses.

---

### FR-TEA-23 — Preserve assignment history

Assignment history remains available.

Assignments are not hard-deleted during normal teacher management.

---

### FR-TEA-24 — Close or cancel assignment

A teacher can close or cancel an active assignment.

Closing or cancelling an assignment preserves its historical record.

The assignment no longer functions as an active assignment.

---

# 21. Teacher Progress Monitoring

### FR-TEA-25 — View class progress

A teacher can view progress for a class they own.

For an assigned experiment, the teacher can see counts such as:

```text
Total students
Not Started
In Progress
Completed
```

---

### FR-TEA-26 — View individual student progress

A teacher can view the progress of a student who belongs to one of their classes.

The teacher can view:

* Assignment status
* Steps completed
* Required observations
* Assessment result
* Completion date

---

### FR-TEA-27 — View independent experiment progress

A teacher can view a student's independent experiment progress when that student belongs to one of the teacher's classes.

The teacher's access remains limited to students in their own classes.

---

### FR-TEA-28 — Teacher cannot modify student learning records

Teachers can monitor student learning records but cannot directly modify:

* Student experiment attempts
* Student observations
* Student assessment answers
* Student assessment results
* Student completion state

Learning records are generated through the appropriate student workflow.

---

### FR-TEA-29 — Identify students needing support

A teacher can identify students who may need support based on available information such as:

* Not Started status
* In Progress status
* Low assessment results
* Incomplete work

The MVP does not provide predictive AI that determines which students are likely to fail.

---

### FR-TEA-30 — Teacher class-based privacy

A teacher can only access student learning information for students who belong to a class owned by that teacher.

The server enforces this authorization boundary.

---

### FR-TEA-31 — Create experiment

A teacher can create an experiment as a complete content package in a single operation.

The package contains:

* Title, description, objectives, materials, safety instructions
* Estimated duration, difficulty, STEM topic
* Ordered steps, each with title and instructions
* Observation definitions (prompt, required flag), each attached to a step
* One assessment with a title, instructions, and ordered questions
  (multiple-choice with options and a defined correct answer;
  short-answer with a defined expected answer)

Acceptance criteria:

* The server validates the complete package and rejects incomplete or malformed content with safe, understandable errors.
* On success the system creates the experiment identity with version 1 as `PUBLISHED`, including steps, observation definitions, assessment, and questions, atomically.
* Teacher-created experiments are immediately discoverable and assignable like any published experiment.
* Draft/edit-as-new-version workflows remain admin scope and are outside this requirement.

---

# 22. Admin Requirements

Admin functionality is intentionally minimal for the MVP.

### FR-ADM-01 — Platform administration

An administrator can perform platform-management operations required to operate ScienceLab.

Specific administrative workflows are outside the primary MVP learning experience and should not introduce unnecessary complexity into the student or teacher workflows.

---

# 23. Cross-Cutting Requirements

## 23.1 Role-Based Access Control

### CR-01 — RBAC

The system shall enforce role-based access control for:

* Student
* Teacher
* Admin

Users must only access operations permitted for their role.

---

## 23.2 Server-Side Authorization

### CR-02 — Server-side authorization

Authorization must be enforced on the server.

The system must not rely on:

* Hidden frontend controls
* Client-provided roles
* Client-side ownership checks
* Client-side assignment-gating checks

---

## 23.3 Input Validation

### CR-03 — Input validation

All externally supplied input must be validated on the server.

Invalid input must be rejected with safe, understandable errors.

---

## 23.4 Server-Enforced Business Rules

### CR-04 — Business rule enforcement

Important business rules must be enforced server-side.

This includes:

* Assignment gating
* Class ownership
* Student data isolation
* One attempt per experiment
* Sequential step progression
* Required observation completion
* Assessment submission rules
* Experiment completion conditions
* Completed-attempt immutability

---

# 24. Data Integrity

### CR-05 — Protect data integrity

ScienceLab shall enforce data integrity through both:

1. Database constraints
2. Server-side business logic

The system must prevent structurally invalid relationships and invalid state transitions.

Examples include:

* An attempt must belong to an existing student and experiment.
* An observation must belong to the correct attempt and step.
* An assessment submission must belong to the correct attempt.
* A teacher can only create or manage assignments for classes they own.
* A student cannot have duplicate membership in the same class.
* A student cannot have multiple attempts for the same experiment in the MVP.
* Completed attempts cannot be modified.
* Removing a student from a class must not delete historical learning records.

---

# 25. Failure Handling

### CR-06 — Safe failure handling

The system shall handle expected failures without corrupting learning state.

Examples:

* Database failure produces a controlled error.
* Invalid experiment, step, assignment, or attempt requests are rejected.
* Duplicate operations are handled safely.
* Failed operations do not leave partially updated learning state.
* AI failure does not prevent the experiment workflow.
* Assessment submission failures can be retried safely.
* Retried requests must not unintentionally create duplicate records.

Operations involving multiple related state changes should use database transactions where appropriate.

Idempotency should be used where duplicate requests could create harmful side effects.

---

# 26. Reliability

### CR-07 — Persist learning state

Significant learning-state changes must be persisted server-side immediately.

The system must not rely on client-side state as the authoritative record of learning progress.

A student should be able to:

* Refresh the page without losing persisted progress.
* Leave an experiment and return later.
* Resume an incomplete attempt.
* Continue after temporary network interruption where the relevant state was successfully persisted.

Completed attempts remain stable and immutable.

External AI failure must not prevent core experiment functionality.

Unexpected server errors must return controlled responses without exposing internal implementation details.

---

# 27. Performance

### CR-08 — MVP performance target

The MVP shall be designed and tested for approximately:

> **100 concurrent active users**

The system should:

* Keep normal interactions responsive.
* Use appropriate database indexes.
* Avoid unnecessary database queries.
* Avoid loading unnecessarily large datasets.
* Keep AI requests separate from critical experiment navigation.
* Prevent slow AI responses from blocking ordinary experiment navigation.

The MVP does not require distributed systems or complex scaling infrastructure.

Scaling beyond the MVP target is a future concern unless real usage demonstrates the need.

---

# 28. Testability

### CR-09 — Automated testing

Critical business rules and API behavior must have automated tests.

Critical test areas include:

* Assignment gating across multiple classes
* One-attempt-per-experiment enforcement
* Experiment step progression
* Required observation enforcement
* Assessment submission
* Duplicate submission protection
* Completion conditions
* Completed-attempt immutability
* Class-based authorization
* Student data isolation
* AI failure fallback
* Transactional state changes

The MVP does not require exhaustive automated coverage of every UI component or an arbitrary coverage percentage.

---

# 29. Observability

### CR-10 — System observability

The system shall provide sufficient logging to diagnose important failures and system behavior.

The system should:

* Log unexpected server errors.
* Log important database failures.
* Log important external-service failures.
* Include useful request/context information in server logs.
* Support tracing of important operations through request IDs or correlation IDs.

The system must not unnecessarily log:

* Passwords
* Password hashes
* Authentication tokens
* Sensitive student information

Expected validation and authorization failures should be distinguishable from unexpected server errors.

---

# 30. Accessibility

### CR-11 — Accessible experience

The MVP should provide an accessible web experience.

The interface should:

* Support keyboard navigation.
* Provide appropriate labels for interactive controls.
* Maintain readable text and clear information hierarchy.
* Provide understandable validation and error messages.
* Avoid relying solely on color to communicate important state.
* Provide accessible feedback for important actions.

Accessibility should be considered throughout the UI rather than treated as a final-stage addition.

---

# 31. Deployability

### CR-12 — Deployable application

The MVP shall be structured so that the application can be deployed as a complete working system.

Deployment must account for:

* Application configuration
* Database configuration
* Environment variables
* Database migrations
* Secure handling of secrets
* Production error handling
* External AI service configuration

Development-only configuration must not be required for production operation.

---

# 32. Core Student Journey

The requirements produce the following primary student journey:

```text
                         LOGIN
                           │
                           ▼
                      DASHBOARD
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ASSIGNED WORK             INDEPENDENT
        EXPERIMENTS               EXPERIMENTS
              │                         │
              │                  Assignment gate
              │                         │
              └────────────┬────────────┘
                           ▼
                   EXPERIMENT DETAILS
                           │
                           ▼
                    ACCESS CHECK
                           │
                           ▼
                    START EXPERIMENT
                           │
                           ▼
                     CREATE ATTEMPT
                           │
                           ▼
                  ┌─────────────────┐
                  │ EXPERIMENT LOOP │
                  │                 │
                  │ Step            │
                  │ Observation     │
                  │ AI Assistance   │
                  │ Next Step       │
                  └────────┬────────┘
                           │
                           ▼
                      ASSESSMENT
                           │
                           ▼
                        SUBMIT
                           │
                           ▼
                        RESULT
                           │
                           ▼
                       COMPLETION
                           │
                           ▼
                        PROGRESS
```

---

# 33. Core Teacher Journey

```text
                         LOGIN
                           │
                           ▼
                   TEACHER DASHBOARD
                           │
                           ▼
                      CREATE CLASS
                           │
                           ▼
                    CLASS CODE
                           │
                           ▼
                  STUDENTS JOIN CLASS
                           │
                           ▼
                   VIEW CLASS MEMBERS
                           │
                           ▼
                  ASSIGN EXPERIMENT
                           │
                           ▼
                 MONITOR CLASS PROGRESS
                           │
                           ▼
               INSPECT STUDENT PROGRESS
```

---

# 34. Experiment Lifecycle

An experiment attempt follows this lifecycle:

```text
NOT_STARTED
     │
     │ Student starts
     ▼
IN_PROGRESS
     │
     │ Required steps complete
     │ Required observations recorded
     │ Assessment submitted
     ▼
COMPLETED
```

The MVP does not support returning a completed attempt to `IN_PROGRESS`.

---

# 35. MVP Boundary

The following are outside the MVP:

* Payments
* Subscriptions
* Marketplace functionality
* Social features
* Live classes
* Voice AI
* Computer vision
* Native mobile applications
* Hardware integrations
* Digital experiment simulation
* Physical action verification
* Complex recommendation systems
* Predictive student-failure models
* Complex analytics infrastructure
* Multi-region infrastructure
* Speculative scaling infrastructure

The MVP focuses on:

```text
Learn
  ↓
Perform
  ↓
Observe
  ↓
Reflect
  ↓
Assess
  ↓
Improve
```

The physical experiment and digital experiment guide are the core MVP experience.

AI assists the learning process but is not the source of truth for experiment content, learning state, or authoritative assessment results.

The database is the authoritative source for persisted application state, while server-side application logic enforces business rules.

---

# 36. Requirements Completion

The requirements phase is complete when:

* Student requirements are defined.
* Teacher requirements are defined.
* Admin scope is bounded.
* Cross-cutting requirements are defined.
* Assignment gating rules are defined.
* Experiment lifecycle rules are defined.
* Authorization boundaries are defined.
* Assessment behavior is defined.
* AI boundaries are defined.
* Reliability and failure behavior are defined.
* MVP performance boundaries are defined.
* Testing expectations are defined.
* MVP exclusions are defined.

The next engineering phase is domain modeling.

The requirements should not be expanded into database tables until the domain model has been reviewed and agreed upon.

```

**This is the version I would now treat as the requirements baseline.**

One important correction from the old file: the previous `FR-STU-19` said the completion rules would be finalized later. They are now explicitly locked: **required steps + required observations + assessment submission + attempt is `IN_PROGRESS`**. The previous draft also stopped before Teacher requirements, whereas this version incorporates the Teacher decisions we made. :contentReference[oaicite:1]{index=1}


```
