CREATE TYPE "public"."assignment_status" AS ENUM('ACTIVE', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."step_progress_status" AS ENUM('CURRENT', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"experiment_version_id" uuid NOT NULL,
	"status" "assignment_status" DEFAULT 'ACTIVE' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"start_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"experiment_id" uuid NOT NULL,
	"experiment_version_id" uuid NOT NULL,
	"assignment_id" uuid,
	"status" "attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"observation_definition_id" uuid NOT NULL,
	"response_text" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"experiment_step_id" uuid NOT NULL,
	"status" "step_progress_status" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_experiment_version_id_experiment_versions_id_fk" FOREIGN KEY ("experiment_version_id") REFERENCES "public"."experiment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_version_experiment_fk" FOREIGN KEY ("experiment_version_id","experiment_id") REFERENCES "public"."experiment_versions"("id","experiment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_attempts" ADD CONSTRAINT "experiment_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_attempts" ADD CONSTRAINT "experiment_attempts_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_attempts" ADD CONSTRAINT "experiment_attempts_experiment_version_id_experiment_versions_id_fk" FOREIGN KEY ("experiment_version_id") REFERENCES "public"."experiment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_attempts" ADD CONSTRAINT "experiment_attempts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_attempts" ADD CONSTRAINT "experiment_attempts_version_experiment_fk" FOREIGN KEY ("experiment_version_id","experiment_id") REFERENCES "public"."experiment_versions"("id","experiment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_attempt_id_experiment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."experiment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_observation_definition_id_observation_definitions_id_fk" FOREIGN KEY ("observation_definition_id") REFERENCES "public"."observation_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_attempt_id_experiment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."experiment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_experiment_step_id_experiment_steps_id_fk" FOREIGN KEY ("experiment_step_id") REFERENCES "public"."experiment_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_one_active_per_class_experiment" ON "assignments" USING btree ("class_id","experiment_id") WHERE "assignments"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_attempts_student_experiment_unique" ON "experiment_attempts" USING btree ("student_id","experiment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "observations_attempt_definition_unique" ON "observations" USING btree ("attempt_id","observation_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "step_progress_attempt_step_unique" ON "step_progress" USING btree ("attempt_id","experiment_step_id");--> statement-breakpoint
-- Immutability backstops (DATABASE_SCHEMA.md §24). Application logic refuses
-- these writes first; triggers block any path that bypasses the service layer.
CREATE OR REPLACE FUNCTION "public"."reject_completed_attempt_write"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed attempts are immutable';
  END IF;
  -- NEW is null in DELETE triggers (returning it would silently skip the
  -- delete); OLD is the correct pass-through for DELETE, NEW for UPDATE.
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."reject_completed_attempt_child_write"() RETURNS trigger AS $$
DECLARE
  parent_status "public"."attempt_status";
BEGIN
  SELECT "status" INTO parent_status FROM "public"."experiment_attempts" WHERE "id" = COALESCE(NEW."attempt_id", OLD."attempt_id");
  IF parent_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Learning records of a completed attempt are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "experiment_attempts_immutable" ON "public"."experiment_attempts";--> statement-breakpoint
CREATE TRIGGER "experiment_attempts_immutable" BEFORE UPDATE OR DELETE ON "public"."experiment_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."reject_completed_attempt_write"();--> statement-breakpoint
DROP TRIGGER IF EXISTS "step_progress_immutable" ON "public"."step_progress";--> statement-breakpoint
CREATE TRIGGER "step_progress_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "public"."step_progress" FOR EACH ROW EXECUTE FUNCTION "public"."reject_completed_attempt_child_write"();--> statement-breakpoint
DROP TRIGGER IF EXISTS "observations_immutable" ON "public"."observations";--> statement-breakpoint
CREATE TRIGGER "observations_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "public"."observations" FOR EACH ROW EXECUTE FUNCTION "public"."reject_completed_attempt_child_write"();