CREATE TABLE "ai_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"experiment_step_id" uuid,
	"student_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"response_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_attempt_id_experiment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."experiment_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_experiment_step_id_experiment_steps_id_fk" FOREIGN KEY ("experiment_step_id") REFERENCES "public"."experiment_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_interactions_student_created_idx" ON "ai_interactions" USING btree ("student_id","created_at");