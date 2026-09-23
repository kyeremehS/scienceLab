CREATE TYPE "public"."submission_status" AS ENUM('SUBMITTED');--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_text" text NOT NULL,
	"is_correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" numeric NOT NULL,
	"feedback" text,
	"status" "submission_status" DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_submissions_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
DROP INDEX "ai_interactions_student_created_idx";--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_submission_id_assessment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assessment_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_attempt_id_experiment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."experiment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_submission_question_unique" ON "assessment_answers" USING btree ("submission_id","question_id");--> statement-breakpoint
CREATE INDEX "ai_interactions_student_created_idx" ON "ai_interactions" USING btree ("student_id","created_at");--> statement-breakpoint
-- Immutability backstops (DATABASE_SCHEMA.md §24): submissions and answers
-- of a completed attempt cannot be written by any path. The shared child
-- trigger resolves the parent attempt via a join for these tables.
CREATE OR REPLACE FUNCTION "public"."reject_completed_submission_write"() RETURNS trigger AS $$
DECLARE
  parent_status "public"."attempt_status";
  sub_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN sub_id := OLD."submission_id";
  ELSE sub_id := NEW."submission_id";
  END IF;
  SELECT ea."status" INTO parent_status
    FROM "public"."experiment_attempts" ea
    JOIN "public"."assessment_submissions" s ON s."attempt_id" = ea."id"
    WHERE s."id" = sub_id;
  IF parent_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Learning records of a completed attempt are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS "assessment_submissions_immutable" ON "public"."assessment_submissions";--> statement-breakpoint
CREATE TRIGGER "assessment_submissions_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "public"."assessment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."reject_completed_attempt_child_write"();--> statement-breakpoint
DROP TRIGGER IF EXISTS "assessment_answers_immutable" ON "public"."assessment_answers";--> statement-breakpoint
CREATE TRIGGER "assessment_answers_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "public"."assessment_answers" FOR EACH ROW EXECUTE FUNCTION "public"."reject_completed_submission_write"();