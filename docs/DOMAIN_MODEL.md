

# `DOMAIN_MODEL.md`

````md
# ScienceLab Domain Model

## 1. Purpose

This document defines the conceptual domain model for ScienceLab.

The domain model describes the important concepts in the ScienceLab system, their responsibilities, relationships, and important business rules.

This document intentionally focuses on the domain rather than database implementation.

Database tables, columns, indexes, constraints, and ORM-specific decisions belong in `DATABASE_SCHEMA.md`.

---

# 2. Domain Overview

ScienceLab is a practical STEM learning platform where students learn by performing experiments, recording observations, completing assessments, and reviewing their results.

The core learning loop is:

Learn → Perform → Observe → Reflect → Assess → Improve

The domain can be understood through three major areas:

### Content

Defines what students are expected to learn and do.

- Experiment
- Experiment Step
- Observation Definition
- Assessment
- Assessment Question

### Learning State

Represents what students actually do.

- Assignment
- Experiment Attempt
- Step Progress
- Observation
- Assessment Submission
- Assessment Answer
- Assessment Result

### Platform and Supporting Concepts

Supports identity, class organization, and assistance.

- User
- Class
- Class Membership
- AI Interaction

---

# 3. Core Domain Concepts

## 3.1 User

Represents an authenticated person using ScienceLab.

A user has one primary role:

- STUDENT
- TEACHER
- ADMIN

### Responsibilities

A User:

- has an identity
- authenticates with the system
- has a role that determines authorization
- participates in the platform according to that role

### Important Rule

Students, teachers, and administrators are not separate identity concepts in the MVP.

They are Users with different roles.

Authorization determines what each role is allowed to do.

---

# 3.2 Class

Represents a teacher-managed learning group.

A Class:

- belongs to one teacher
- has a name
- may have a description
- has a system-generated joining code
- contains student memberships

### Responsibilities

A Class provides the boundary within which a teacher:

- manages students
- creates assignments
- monitors learning activity

A teacher can manage only classes they own.

---

# 3.3 Class Membership

Represents the relationship between a Student and a Class.

Membership is modeled separately from User and Class because a student can belong to multiple classes and a class can contain multiple students.

### Responsibilities

A membership records:

- which student belongs to the class
- which class the student belongs to
- when the student joined
- whether the membership is currently active

### Important Rules

- A student cannot create duplicate active membership in the same class.
- A teacher can remove a student from their class.
- Membership history is preserved.
- Students can join a class using its joining code.

---

# 3.4 Experiment

Represents a practical STEM learning activity.

An Experiment defines the authoritative content and requirements for performing that activity.

An Experiment may contain:

- title
- description
- objectives
- materials
- safety information
- duration
- ordered steps
- observation definitions
- assessment

### Lifecycle

An experiment has a publication state.

At minimum:

- DRAFT
- PUBLISHED
- ARCHIVED

### Important Rules

- Students normally discover published experiments.
- Teachers can assign published experiments.
- Draft experiments are not available for normal student learning.
- Archived experiments are retained as historical content but are not normally available for new learning activity.

The Experiment is content.

It does not represent a student's progress.

---

# 3.5 Experiment Step

Represents one ordered action or stage within an experiment.

An Experiment contains one or more ordered steps.

For example:

Experiment:
Build a Simple Electrical Circuit

Steps:

1. Gather the materials.
2. Connect the battery.
3. Connect the bulb.
4. Test the circuit.

### Responsibilities

An Experiment Step defines:

- what the student is expected to do
- where the step occurs in the experiment sequence
- any step-specific instructions

The step itself does not contain student-specific progress.

---

# 3.6 Observation Definition

Represents an observation that an experiment expects the student to record.

An Observation Definition belongs to an Experiment and may be associated with a particular Experiment Step.

Example:

> Did the bulb light when the circuit was completed?

This is part of the experiment's authoritative content.

### Responsibilities

An Observation Definition defines:

- what the student should observe
- where the observation is relevant
- whether recording the observation is required

### Important Distinction

Observation Definition:

> What ScienceLab asks the student to observe.

Observation:

> What the student actually records.

These must remain separate concepts.

---

# 3.7 Assignment

Represents a teacher requiring a class to perform an experiment.

An Assignment connects:

- a Teacher
- a Class
- an Experiment

An assignment may also contain:

- date assigned
- optional start date
- optional due date
- assignment status

### Important Rules

An Assignment represents required current learning work.

Creating an assignment does not create an Experiment Attempt.

A student creates an Attempt only when they actually start the experiment.

### Assignment Lifecycle

An assignment may be:

- ACTIVE
- CLOSED

A closed assignment remains available as historical information but no longer represents current required work.

### Important Rule

Only active incomplete assignments participate in the student's independent experiment gate.

---

# 3.8 Experiment Attempt

Represents one student's actual performance of an experiment.

An Attempt connects:

- one Student
- one Experiment

An Attempt records the student's learning state while performing the experiment.

### Responsibilities

An Attempt tracks:

- when the student started
- the overall attempt status
- the student's progress through the experiment
- observations
- assessment activity
- AI interactions

### Attempt Lifecycle

At minimum:

- IN_PROGRESS
- COMPLETED

An attempt becomes completed only when all required completion conditions are satisfied.

### Important Rules

- An assignment does not create an attempt.
- Starting an experiment creates the attempt.
- The MVP allows one attempt per student per experiment.
- A student cannot create a second attempt for the same experiment.
- A completed attempt is immutable.

---

# 3.9 Step Progress

Represents a student's progress through one Experiment Step within one Experiment Attempt.

Step Progress is an explicit domain concept because ScienceLab must know what has actually been completed at the individual step level.

### Example

For an attempt:

- Step 1 → COMPLETED
- Step 2 → COMPLETED
- Step 3 → IN_PROGRESS
- Step 4 → NOT_STARTED

### Responsibilities

Step Progress tracks:

- the attempt
- the experiment step
- the progress state
- completion information

### Important Distinction

The current step and completed steps are not the same concept.

A student may move backward to review a previous step without making that step incomplete.

Therefore the system must distinguish:

- current location in the experiment
- completion state of each step

### Important Rule

Students cannot bypass required step progression.

This rule must be enforced by the server.

---

# 3.10 Observation

Represents an observation actually recorded by a student during an Experiment Attempt.

An Observation belongs to:

- a Student's Attempt
- an Observation Definition
- where applicable, the relevant Experiment Step

### Example

Observation Definition:

> Did the bulb light?

Student Observation:

> Yes, the bulb lit when the circuit was completed.

### Responsibilities

An Observation stores the student's actual recorded observation.

### Important Rules

- Required observations must be recorded before an attempt can be completed.
- Observations can be edited while an attempt is active.
- Observations become read-only after attempt completion.
- Observations belong to the student's attempt, not the Experiment Definition.

---

# 3.11 Assessment

Represents the assessment associated with an Experiment.

An Assessment defines how the student's understanding is evaluated after performing the experiment.

An Assessment contains one or more Assessment Questions.

The MVP supports:

- multiple-choice questions
- short-answer questions

The assessment definition is part of the authoritative experiment content.

---

# 3.12 Assessment Question

Represents one question within an Assessment.

A question defines:

- the question content
- the question type
- the possible choices when applicable
- the expected answer or grading rules where applicable

### Important Rule

The authoritative assessment definition comes from the application's experiment content.

AI does not replace the assessment definition.

---

# 3.13 Assessment Submission

Represents a student's submitted response to an Assessment.

A submission belongs to one Experiment Attempt and one Assessment.

A submission contains the student's answers.

### Important Rules

- A student submits the assessment once in the MVP.
- Submission occurs as part of completing the experiment.
- Once submitted, the submission cannot be changed.

---

# 3.14 Assessment Answer

Represents the student's answer to one Assessment Question within an Assessment Submission.

For example:

Question:

> What happens when the circuit is completed?

Student answer:

> The bulb lights.

The answer belongs to the submission rather than the question itself.

### Important Distinction

Assessment Question:

> What was asked?

Assessment Answer:

> What did this student submit?

---

# 3.15 Assessment Result

Represents the evaluation produced from an Assessment Submission.

A result may contain:

- score
- feedback
- evaluation information

### Important Distinction

Assessment Submission represents:

> What the student submitted.

Assessment Result represents:

> What the system determined from that submission.

### Grading Rules

- Multiple-choice questions can be automatically graded.
- Short-answer questions use teacher/content-defined expected answers or simple grading rules.
- AI may provide assistance during assessment.
- AI is not the authoritative grader.
- AI cannot independently determine the authoritative assessment score.

---

# 3.16 AI Interaction

Represents an interaction between a student and the ScienceLab AI assistance layer.

An AI Interaction may be associated with:

- a Student
- an Experiment Attempt
- an Experiment
- an Experiment Step

### Responsibilities

AI Interaction records contextual assistance provided during learning.

The AI should operate using relevant authoritative context such as:

- experiment instructions
- materials
- current step
- observation requirements
- student question

### Important Rule

AI is an assistance layer, not a source of truth.

AI must not determine authoritative:

- experiment instructions
- required observations
- step completion
- assessment scores
- attempt completion

If AI is unavailable, the core learning workflow must continue.

---

# 4. Relationships

## User → Class

A Teacher can own multiple Classes.

```text
Teacher
   │
   ├── Class
   ├── Class
   └── Class
````

A Class belongs to one Teacher.

---

## User ↔ Class

Students participate in Classes through Class Membership.

```text
Student
   │
   ├── Membership → Class A
   ├── Membership → Class B
   └── Membership → Class C
```

A Class can have multiple student memberships.

---

## Class → Assignment

A Teacher creates Assignments for a Class.

```text
Teacher
   ↓
Class
   ↓
Assignment
```

An Assignment references one Experiment.

---

## Experiment → Steps

An Experiment contains ordered Experiment Steps.

```text
Experiment
   ├── Step 1
   ├── Step 2
   ├── Step 3
   └── Step 4
```

---

## Experiment → Observation Definitions

An Experiment defines the observations students are expected to record.

```text
Experiment
   ├── Observation Definition 1
   ├── Observation Definition 2
   └── Observation Definition 3
```

---

## Experiment → Assessment

An Experiment may have an Assessment.

```text
Experiment
   ↓
Assessment
   ├── Question 1
   ├── Question 2
   └── Question 3
```

---

## Student → Attempt

A Student can perform experiments through Experiment Attempts.

```text
Student
   ├── Attempt → Experiment A
   ├── Attempt → Experiment B
   └── Attempt → Experiment C
```

The MVP allows one attempt per student per experiment.

---

## Attempt → Step Progress

Each Attempt tracks progress through its Experiment Steps.

```text
Attempt
   ├── Step Progress → Step 1
   ├── Step Progress → Step 2
   ├── Step Progress → Step 3
   └── Step Progress → Step 4
```

---

## Attempt → Observations

An Attempt contains the student's actual observations.

```text
Attempt
   ├── Observation
   ├── Observation
   └── Observation
```

Each Observation corresponds to an Observation Definition.

---

## Attempt → Assessment Submission

An Attempt can contain one Assessment Submission.

```text
Attempt
   ↓
Assessment Submission
   ├── Answer
   ├── Answer
   └── Answer
```

The submission produces an Assessment Result.

---

## Attempt → AI Interaction

AI interactions are associated with the student's learning context.

```text
Attempt
   ├── AI Interaction
   ├── AI Interaction
   └── AI Interaction
```

AI interactions support the learning experience but do not control authoritative state.

---

# 5. Important Domain Distinctions

The following distinctions must remain explicit throughout implementation.

## Assignment ≠ Attempt

Assignment:

> A teacher requires a class to perform an experiment.

Attempt:

> A student actually starts performing that experiment.

---

## Experiment Step ≠ Step Progress

Experiment Step:

> What the student is supposed to do.

Step Progress:

> What this student has done with that step.

---

## Observation Definition ≠ Observation

Observation Definition:

> What the experiment asks the student to observe.

Observation:

> What the student actually recorded.

---

## Assessment Question ≠ Assessment Answer

Assessment Question:

> What ScienceLab asks.

Assessment Answer:

> What the student submits.

---

## Assessment Submission ≠ Assessment Result

Assessment Submission:

> Student input.

Assessment Result:

> Evaluation of that input.

---

## AI Interaction ≠ Authoritative Learning State

AI Interaction:

> Assistance provided to the student.

Authoritative learning state:

> State determined by application rules and persisted system data.

AI cannot override authoritative state.

---

# 6. Core Domain Invariants

The following rules are fundamental to the domain.

1. A teacher can manage only classes they own.

2. A teacher can create assignments only for their own classes.

3. Only published experiments can be normally discovered or assigned.

4. An assignment does not create an attempt.

5. Starting an experiment creates an attempt.

6. A student has at most one attempt for a given experiment in the MVP.

7. Students cannot bypass required experiment steps.

8. Required observations must be recorded before an attempt can be completed.

9. An assessment must be submitted before an attempt can be completed.

10. A completed attempt cannot be modified.

11. AI cannot determine authoritative experiment content.

12. AI cannot determine authoritative assessment scores.

13. AI failure must not prevent the core experiment workflow.

14. Students can access only their own learning records.

15. Teachers can monitor learning activity only within classes they own.

16. Closed assignments do not count as current required work.

17. Active incomplete assignments participate in the independent experiment gate.

---

# 7. Domain Ownership

The following ownership rules describe where concepts belong.

### Experiment owns

* Experiment Steps
* Observation Definitions
* Assessment
* Assessment Questions

These represent authoritative learning content.

### Attempt owns

* Step Progress
* Observations
* Assessment Submission
* Assessment Result
* AI Interactions

These represent the student's activity and learning state.

### Teacher owns

* Classes
* Assignments created for those classes

### Student owns

* Their experiment attempts
* Their observations
* Their assessment submissions
* Their assessment answers
* Their learning history

---

# 8. Domain Model Boundary

The MVP intentionally does not model:

* payments
* subscriptions
* marketplace functionality
* social features
* live classes
* voice AI
* computer vision
* hardware integrations
* physical experiment verification
* digital experiment simulation
* complex recommendation systems
* predictive student-failure models
* multi-region infrastructure

These may become future domains if the product requires them.

They are not part of the MVP domain model.

---

# 9. Design Principles

## Separate Definition from State

Shared experiment content should not contain student-specific learning state.

## Model Real Business Concepts

A concept should exist in the domain model when it represents meaningful business state, behavior, or relationships.

## Avoid Premature Complexity

The MVP should not introduce domain concepts merely because they may become useful in a hypothetical future.

## Server Is Authoritative

Important domain rules must be enforced by the server rather than trusted to the client.

## AI Is an Assistance Layer

AI improves the learning experience but does not become the authoritative source of learning state or assessment truth.

## Preserve Historical Learning State

Completed learning activity should remain trustworthy and should not be silently changed by later modifications.

---

# 10. Summary

The ScienceLab domain can be summarized as:

```text
USER
 │
 ├── TEACHER
 │     │
 │     ├── CLASS
 │     │     └── MEMBERSHIP
 │     │
 │     └── ASSIGNMENT
 │              │
 │              └── EXPERIMENT
 │
 └── STUDENT
        │
        └── ATTEMPT
              │
              ├── STEP PROGRESS
              ├── OBSERVATIONS
              ├── ASSESSMENT SUBMISSION
              │       └── ANSWERS
              │
              ├── ASSESSMENT RESULT
              │
              └── AI INTERACTIONS


EXPERIMENT
 │
 ├── EXPERIMENT STEPS
 ├── OBSERVATION DEFINITIONS
 └── ASSESSMENT
       └── QUESTIONS
```

