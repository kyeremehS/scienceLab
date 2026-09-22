CREATE TYPE "public"."question_type" AS ENUM('MULTIPLE_CHOICE', 'SHORT_ANSWER');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb,
	"expected_answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_version_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_experiment_version_id_unique" UNIQUE("experiment_version_id")
);
--> statement-breakpoint
CREATE TABLE "experiment_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_version_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "version_status" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"objectives" text NOT NULL,
	"materials" text NOT NULL,
	"safety" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_step_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"prompt" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_experiment_version_id_experiment_versions_id_fk" FOREIGN KEY ("experiment_version_id") REFERENCES "public"."experiment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_steps" ADD CONSTRAINT "experiment_steps_experiment_version_id_experiment_versions_id_fk" FOREIGN KEY ("experiment_version_id") REFERENCES "public"."experiment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_versions" ADD CONSTRAINT "experiment_versions_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_definitions" ADD CONSTRAINT "observation_definitions_experiment_step_id_experiment_steps_id_fk" FOREIGN KEY ("experiment_step_id") REFERENCES "public"."experiment_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_order_unique" ON "assessment_questions" USING btree ("assessment_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_steps_order_unique" ON "experiment_steps" USING btree ("experiment_version_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_versions_id_experiment_unique" ON "experiment_versions" USING btree ("id","experiment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_versions_number_unique" ON "experiment_versions" USING btree ("experiment_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_versions_one_published" ON "experiment_versions" USING btree ("experiment_id") WHERE "experiment_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "observation_definitions_order_unique" ON "observation_definitions" USING btree ("experiment_step_id","order");