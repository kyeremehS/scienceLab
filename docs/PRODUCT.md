

````md
# ScienceLab

## 1. Product Vision

ScienceLab is an interactive practical STEM learning platform that helps students learn science by actually performing experiments rather than only reading about them.

ScienceLab combines physical experimentation with a structured digital learning experience. Students use available physical materials while the platform guides them through the experiment, captures their learning activity, provides contextual assistance, and measures their understanding.

The core learning loop is:

> Learn → Perform → Observe → Reflect → Assess → Improve

Students should be able to:

1. Discover an experiment.
2. Understand what they are trying to learn.
3. Review the required materials and safety information.
4. Follow the experiment step by step.
5. Perform the physical experiment using the required materials.
6. Record their observations.
7. Ask for contextual help when they are stuck.
8. Reflect on what they observed.
9. Complete an assessment.
10. Receive feedback and results.
11. Track their learning progress.

Teachers should be able to:

1. Create classes.
2. Share a class code with students.
3. Manage class membership.
4. Assign experiments to their classes.
5. Monitor student progress.
6. Identify students who may need additional support.

ScienceLab should make practical STEM learning structured, measurable, and engaging.

---

## 2. Problem Statement

Traditional digital learning platforms often focus heavily on consuming information.

Students may read:

- explanations
- diagrams
- videos
- notes

without actually going through the process of performing an experiment.

ScienceLab focuses on connecting digital learning with practical experimentation.

Instead of:

> Read experiment → answer questions

the student experiences:

> Understand → Gather materials → Perform → Observe → Record → Get help → Reflect → Assess

The platform should provide structure around practical experimentation while giving students and teachers a record of the learning process.

---

## 3. Target Users

### 3.1 Students

Students use ScienceLab to perform experiments and learn STEM concepts.

Primary goals:

- understand concepts
- perform experiments correctly
- record observations
- get help when stuck
- reflect on what they learned
- assess their understanding
- track progress

Students can explore published experiments independently.

When a teacher assigns an experiment, it becomes teacher-directed work that the student is expected to complete.

### 3.2 Teachers

Teachers use ScienceLab to manage practical learning activities for their students.

Primary goals:

- create and manage classes
- share class access with students
- assign experiments
- monitor completion
- monitor performance
- identify students who may need support

Teachers should be able to understand class and individual progress without needing access to unrelated student data.

### 3.3 Administrators

Administrators manage the ScienceLab platform.

For the MVP, administrative functionality will be intentionally minimal and focused on essential platform management.

---

## 4. Core Value Proposition

ScienceLab transforms an experiment from static educational content into a structured practical learning experience.

The platform does not attempt to replace physical experimentation.

Instead, it acts as a digital companion that guides the student before, during, and after the experiment.

The experience should be:

> Understand → Prepare → Perform → Observe → Record → Get help → Reflect → Assess

This allows practical activities to become more structured and measurable while preserving the physical nature of the experiment.

---

## 5. Experiment Experience

ScienceLab's MVP will use a **physical experiment + digital guide** model.

Students are expected to perform experiments using the required physical materials while ScienceLab provides the digital instructions and learning workflow.

For example:

```text
Experiment
    ↓
Introduction
    ↓
Learning objectives
    ↓
Materials
    ↓
Safety
    ↓
Step-by-step guidance
    ↓
Physical experimentation
    ↓
Observations
    ↓
Troubleshooting
    ↓
Reflection
    ↓
Assessment
    ↓
Result
````

ScienceLab does not need to verify whether a student physically performed an experiment in the MVP.

Instead, the platform records the student's interaction with the digital learning workflow.

Digital simulation may be considered in the future, but it is not part of the MVP.

---

## 6. MVP Goal

The MVP must demonstrate one complete, believable practical STEM learning journey.

A student should be able to:

```text
Sign in
  ↓
Explore experiments
  ↓
Open an experiment
  ↓
Read objectives, materials, and safety information
  ↓
Start experiment
  ↓
Follow the experiment steps
  ↓
Perform the physical experiment
  ↓
Record observations
  ↓
Ask contextual AI for help
  ↓
Complete reflection
  ↓
Complete assessment
  ↓
Receive result
  ↓
View progress
```

A teacher should be able to:

```text
Sign in
  ↓
Create class
  ↓
Share class code
  ↓
Students join class
  ↓
Assign experiment
  ↓
View class progress
  ↓
View individual student progress
```

If these journeys work reliably, the MVP is successful.

---

## 7. MVP Scope

### Must Have

#### Authentication

* student registration
* teacher registration
* login
* logout
* password recovery/reset (short-lived, single-use tokens; enumeration-safe)
* secure authentication
* role-based access

Email verification is explicitly deferred from the MVP.

#### Student

* student dashboard
* experiment catalogue
* experiment details
* experiment discovery
* start experiment
* resume experiment
* step-by-step experiment flow
* observation recording
* reflection
* contextual AI assistance
* assessment
* assessment result
* progress tracking

#### Teacher

* teacher dashboard
* class creation
* class code generation
* student class joining
* class membership management
* experiment assignment
* assignment status
* class progress
* individual student progress

#### Platform

* experiment management
* relational data storage
* authorization
* API layer
* server-side validation
* error handling
* logging
* automated tests
* database migrations
* seed/demo data
* deployment

---

## 8. Experiment Access and Assignments

Published experiments are available for students to explore.

Teacher assignments represent required or teacher-directed learning activities.

This creates two distinct concepts:

### Experiment discovery

A student can:

* browse published experiments
* view experiment information
* learn about available activities

### Teacher assignment

A teacher can:

* select an experiment
* assign it to a class
* optionally define availability or a due date
* monitor student progress

An assignment does not create a learning attempt automatically.

The student begins an attempt when they start the experiment.

---

## 9. Class Membership

Teachers create classes and receive a class code.

Students can join a class using the class code.

The class workflow is:

```text
Teacher creates class
        ↓
ScienceLab generates class code
        ↓
Teacher shares code
        ↓
Student enters code
        ↓
Student joins class
```

Class membership allows teachers to assign experiments and view the relevant progress of students in their classes.

Removing a student from a class does not delete their historical learning records.

---

## 10. AI Role

AI is an assistance layer.

It is not the source of truth for application state or business rules.

The AI is responsible for:

* explanations
* hints
* contextual guidance
* troubleshooting assistance
* adapting explanations to the student's current learning context

The AI should understand the context of the student's current activity.

For example:

```text
Experiment: Simple Electrical Circuit
Current step: Connecting LED
Student level: Beginner
Materials: Battery, resistor, LED, wires
```

If the student asks:

> "My LED isn't lighting."

ScienceLab should provide guidance relevant to the current experiment and step rather than generic information about electronics.

AI should preferably guide the student toward discovering the problem rather than immediately giving the answer.

### AI and Assessments

AI may provide conceptual clarification and learning guidance during the assessment experience, but it must not:

* provide the answer to an assessment question
* generate an assessment response for the student
* determine the authoritative assessment score

The assessment system remains responsible for evaluating and recording assessment results.

---

## 11. Source of Truth

ScienceLab has clear ownership boundaries.

### Database

The database is the source of truth for application state, including:

* users
* experiments
* experiment steps
* attempts
* observations
* assignments
* assessments
* submissions
* scores
* progress

### Application Logic

Application logic is responsible for enforcing business rules.

### AI

AI is the source of truth for neither application state nor business rules.

AI output must never determine:

* whether a student completed an experiment
* whether an assessment was submitted
* whether a student can access another student's work
* whether a teacher owns a class
* the authoritative assessment score
* whether a user is authorized to perform an action

---

## 12. First Experiment

The first experiment will be:

### Building a Simple Electrical Circuit

#### Learning Objectives

By the end of the experiment, a student should be able to:

* identify the major components of a simple circuit
* explain the purpose of a battery
* explain the purpose of an LED
* explain why a resistor may be required
* distinguish between an open and closed circuit
* build a basic functioning circuit
* troubleshoot a circuit that does not work

#### Materials

* battery
* LED
* resistor
* wires
* breadboard or suitable connection method

#### Experiment Flow

```text
Introduction
    ↓
Learning objectives
    ↓
Materials
    ↓
Safety
    ↓
Step 1: Identify components
    ↓
Step 2: Connect battery
    ↓
Step 3: Connect resistor
    ↓
Step 4: Connect LED
    ↓
Step 5: Complete circuit
    ↓
Observation
    ↓
Troubleshooting
    ↓
Reflection
    ↓
Assessment
```

This experiment should demonstrate the complete student learning journey supported by the MVP.

---

## 13. Should Have

These features may be added if the core MVP becomes stable:

* experiment search
* experiment filtering
* richer progress analytics
* teacher notes
* experiment difficulty levels
* student achievement indicators
* richer AI explanations
* experiment recommendations

These features must not delay the completion of the core learning journey.

---

## 14. Could Have

Potential future features include:

* experiment image uploads
* AI analysis of experiment photos
* computer vision for physical experiments
* voice-based assistance
* interactive simulations
* curriculum-specific learning paths
* multilingual support
* offline experiment mode
* mobile application
* school administration
* parent accounts

These are intentionally outside the MVP.

---

## 15. Won't Have in MVP

The following are explicitly outside the MVP:

* payments
* subscriptions
* marketplace
* social networking
* live classes
* voice AI
* computer vision
* native mobile application
* hardware integrations
* digital experiment simulation
* complex recommendation systems
* complex analytics infrastructure
* multi-region deployment
* speculative infrastructure that is not required by the MVP

These features may become valuable later, but they do not help prove the core product at this stage.

---

## 16. Success Criteria

The MVP is successful when:

### Student

A student can complete an experiment from beginning to end without developer intervention.

### Teacher

A teacher can create a class, have students join, assign an experiment, and see meaningful progress.

### Learning Experience

The student can move through a complete practical learning cycle:

> Learn → Perform → Observe → Reflect → Assess → Improve

### Reliability

The critical student and teacher flows work consistently.

### Security

Users cannot access resources they are not authorized to access.

### Data Integrity

Invalid application states are prevented through appropriate application and database controls.

### Maintainability

Another developer can understand the project and make changes without rewriting the system.

### Presentation

The application looks and feels like a real product rather than a coding exercise.

### Engineering

The completed repository should demonstrate:

* sound application architecture
* relational database design
* database migrations
* API design
* authentication
* authorization
* validation
* testing
* error handling
* logging
* deployment
* documentation
* sensible AI integration

---

## 17. MVP Boundary

The central question throughout development is:

> Does this help us deliver a complete, reliable practical STEM learning experience?

If yes, it can be considered for the MVP.

If no, it should probably remain outside the MVP.

The goal is not to build every possible feature.

The goal is to build a focused product that convincingly demonstrates the core learning experience and strong software engineering.

---

## 18. Product Principles

### 1. Practical learning first

ScienceLab should support students in actually performing experiments rather than simply consuming educational content.

### 2. Structure the learning process

Experiments should provide a clear progression from preparation through assessment.

### 3. AI assists, not replaces learning

AI should help students understand and troubleshoot rather than simply provide answers.

### 4. Teachers need actionable visibility

Teacher features should help teachers understand who is progressing, who is struggling, and what work has been completed.

### 5. The MVP stays focused

Features that do not contribute to the core practical learning experience should remain outside the MVP.

### 6. Product behavior comes before implementation details

The product definition describes what users should be able to accomplish. Technical implementation decisions belong in the appropriate engineering documents.

---

## 19. MVP Definition

ScienceLab's MVP is a web-based practical STEM learning platform where:

1. Students can discover published experiments.
2. Students can follow structured digital guidance while performing physical experiments.
3. Students can record observations and reflections.
4. Students can receive contextual AI assistance.
5. Students can complete assessments and receive results.
6. Students can track their learning progress.
7. Teachers can create classes and manage membership through class codes.
8. Teachers can assign experiments to classes.
9. Teachers can monitor class and individual student progress.
10. The system securely manages users, learning activity, assignments, assessments, and progress.

If these capabilities work together reliably, ScienceLab has achieved its MVP.

```

**Don't add the old architecture diagram or implementation sequence back into `PRODUCT.md`.** We'll handle those when we discuss `ARCHITECTURE.md`, `ENGINEERING.md`, and `AGENTS.md`.

Once you've pasted this, **don't start coding yet**. We should move to `REQUIREMENTS.md` and make sure every requirement actually follows from this product definition.
```
