import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "TEACHER",
  "ADMIN",
]);

export const versionStatusEnum = pgEnum("version_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "MULTIPLE_CHOICE",
  "SHORT_ANSWER",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "IN_PROGRESS",
  "COMPLETED",
]);

export const stepProgressStatusEnum = pgEnum("step_progress_status", [
  "CURRENT",
  "COMPLETED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }).notNull(),
  usedAt: timestamp("used_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const classMemberships = pgTable(
  "class_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    active: boolean("active").notNull().default(true),
    leftAt: timestamp("left_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    // One active membership per student per class; history rows preserved.
    uniqueIndex("class_memberships_active_unique")
      .on(t.studentId, t.classId)
      .where(sql`${t.active} = true`),
  ],
);

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const experimentVersions = pgTable(
  "experiment_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id),
    versionNumber: integer("version_number").notNull(),
    status: versionStatusEnum("status").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    objectives: text("objectives").notNull(),
    materials: text("materials").notNull(),
    safety: text("safety").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    difficulty: text("difficulty").notNull(),
    topic: text("topic").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("experiment_versions_id_experiment_unique").on(t.id, t.experimentId),
    uniqueIndex("experiment_versions_number_unique").on(t.experimentId, t.versionNumber),
    // At most one published version per experiment.
    uniqueIndex("experiment_versions_one_published")
      .on(t.experimentId)
      .where(sql`${t.status} = 'PUBLISHED'`),
  ],
);

export const experimentSteps = pgTable(
  "experiment_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentVersionId: uuid("experiment_version_id")
      .notNull()
      .references(() => experimentVersions.id),
    stepOrder: integer("order").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("experiment_steps_order_unique").on(t.experimentVersionId, t.stepOrder),
  ],
);

export const observationDefinitions = pgTable(
  "observation_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentStepId: uuid("experiment_step_id")
      .notNull()
      .references(() => experimentSteps.id),
    displayOrder: integer("order").notNull(),
    prompt: text("prompt").notNull(),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("observation_definitions_order_unique").on(t.experimentStepId, t.displayOrder),
  ],
);

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  experimentVersionId: uuid("experiment_version_id")
    .notNull()
    .references(() => experimentVersions.id)
    .unique(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    questionOrder: integer("order").notNull(),
    type: questionTypeEnum("type").notNull(),
    questionText: text("question_text").notNull(),
    options: jsonb("options"),
    expectedAnswer: text("expected_answer"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("assessment_questions_order_unique").on(t.assessmentId, t.questionOrder),
  ],
);

/**
 * Teacher assignment of an experiment version to a class (DATABASE_SCHEMA.md §12).
 * Version locked at creation; table is persistence-only in Phase 4 — teacher
 * assignment endpoints arrive with Phase 7 (FR-TEA-15–FR-TEA-24).
 */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id),
    experimentVersionId: uuid("experiment_version_id")
      .notNull()
      .references(() => experimentVersions.id),
    status: assignmentStatusEnum("status").notNull().default("ACTIVE"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // One active assignment per class/experiment (FR-TEA-17).
    uniqueIndex("assignments_one_active_per_class_experiment")
      .on(t.classId, t.experimentId)
      .where(sql`${t.status} = 'ACTIVE'`),
    // Version integrity: (version, experiment) must belong together (§21).
    foreignKey({
      columns: [t.experimentVersionId, t.experimentId],
      foreignColumns: [experimentVersions.id, experimentVersions.experimentId],
      name: "assignments_version_experiment_fk",
    }),
  ],
);

/**
 * One student's live run of an experiment (DATABASE_SCHEMA.md §13).
 * Nullable assignment_id: NULL = independent start.
 */
export const experimentAttempts = pgTable(
  "experiment_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id),
    experimentVersionId: uuid("experiment_version_id")
      .notNull()
      .references(() => experimentVersions.id),
    assignmentId: uuid("assignment_id").references(() => assignments.id),
    status: attemptStatusEnum("status").notNull().default("IN_PROGRESS"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // One attempt per student per experiment in the MVP (FR-STU-09).
    uniqueIndex("experiment_attempts_student_experiment_unique").on(t.studentId, t.experimentId),
    // Version integrity: (version, experiment) must belong together (§21).
    foreignKey({
      columns: [t.experimentVersionId, t.experimentId],
      foreignColumns: [experimentVersions.id, experimentVersions.experimentId],
      name: "experiment_attempts_version_experiment_fk",
    }),
  ],
);

/**
 * Per-step progress within an attempt (DATABASE_SCHEMA.md §14).
 * No row for (attempt, step) = NOT_STARTED.
 */
export const stepProgress = pgTable(
  "step_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => experimentAttempts.id),
    experimentStepId: uuid("experiment_step_id")
      .notNull()
      .references(() => experimentSteps.id),
    status: stepProgressStatusEnum("status").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("step_progress_attempt_step_unique").on(t.attemptId, t.experimentStepId),
  ],
);

/**
 * Student-recorded observations within an attempt (DATABASE_SCHEMA.md §15).
 * Edit while IN_PROGRESS = update row; unique pair prevents duplicates.
 */
export const observations = pgTable(
  "observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => experimentAttempts.id),
    observationDefinitionId: uuid("observation_definition_id")
      .notNull()
      .references(() => observationDefinitions.id),
    responseText: text("response_text").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("observations_attempt_definition_unique").on(t.attemptId, t.observationDefinitionId),
  ],
);