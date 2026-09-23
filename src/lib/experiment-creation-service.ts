import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  assessmentQuestions,
  assessments,
  experimentSteps,
  experimentVersions,
  experiments,
  observationDefinitions,
} from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";
import { getRequestId, logError } from "@/lib/logger";

const MAX_STEPS = 20;
const MAX_OBSERVATIONS_PER_STEP = 10;
const MAX_QUESTIONS = 20;

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

type ValidObservation = { prompt: string; required: boolean };
type ValidStep = { title: string; instructions: string; observations: ValidObservation[] };
type ValidQuestion = {
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  questionText: string;
  options: string[] | null;
  expectedAnswer: string;
};
type ValidPackage = {
  title: string;
  description: string;
  objectives: string;
  materials: string;
  safety: string;
  durationMinutes: number;
  difficulty: string;
  topic: string;
  steps: ValidStep[];
  assessment: { title: string; instructions: string; questions: ValidQuestion[] };
};

function validatePackage(body: unknown): { ok: boolean; error?: string; pkg?: ValidPackage } {
  const p = (body ?? {}) as Record<string, unknown>;
  const title = str(p.title, 200);
  const description = str(p.description, 5000);
  const objectives = str(p.objectives, 5000);
  const materials = str(p.materials, 5000);
  const safety = str(p.safety, 5000);
  const difficulty = str(p.difficulty, 50);
  const topic = str(p.topic, 100);
  if (!title || !description || !objectives || !materials || !safety || !difficulty || !topic) {
    return { ok: false, error: "Title, description, objectives, materials, safety, difficulty, and topic are all required." };
  }
  const durationMinutes = p.durationMinutes;
  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
    return { ok: false, error: "Duration must be 1–480 minutes." };
  }

  if (!Array.isArray(p.steps) || p.steps.length < 1 || p.steps.length > MAX_STEPS) {
    return { ok: false, error: `The experiment needs 1–${MAX_STEPS} steps.` };
  }
  const steps: ValidStep[] = [];
  for (const [i, raw] of p.steps.entries()) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const stepTitle = str(s.title, 200);
    const instructions = str(s.instructions, 5000);
    if (!stepTitle || !instructions) {
      return { ok: false, error: `Step ${i + 1} needs a title and instructions.` };
    }
    const rawObs = s.observations ?? [];
    if (!Array.isArray(rawObs) || rawObs.length > MAX_OBSERVATIONS_PER_STEP) {
      return { ok: false, error: `Step ${i + 1} allows up to ${MAX_OBSERVATIONS_PER_STEP} observations.` };
    }
    const observations: ValidObservation[] = [];
    for (const r of rawObs) {
      const o = (r ?? {}) as Record<string, unknown>;
      const prompt = str(o.prompt, 1000);
      if (!prompt || typeof o.required !== "boolean") {
        return { ok: false, error: `Step ${i + 1} has an invalid observation (prompt and required flag needed).` };
      }
      observations.push({ prompt, required: o.required });
    }
    steps.push({ title: stepTitle, instructions, observations });
  }

  const rawAssessment = (p.assessment ?? {}) as Record<string, unknown>;
  const assessmentTitle = str(rawAssessment.title, 200);
  const assessmentInstructions = str(rawAssessment.instructions, 5000);
  if (!assessmentTitle || !assessmentInstructions) {
    return { ok: false, error: "The assessment needs a title and instructions." };
  }
  if (!Array.isArray(rawAssessment.questions) || rawAssessment.questions.length < 1 || rawAssessment.questions.length > MAX_QUESTIONS) {
    return { ok: false, error: `The assessment needs 1–${MAX_QUESTIONS} questions.` };
  }
  const questions: ValidQuestion[] = [];
  for (const [i, raw] of rawAssessment.questions.entries()) {
    const q = (raw ?? {}) as Record<string, unknown>;
    const questionText = str(q.questionText, 2000);
    if (!questionText || (q.type !== "MULTIPLE_CHOICE" && q.type !== "SHORT_ANSWER")) {
      return { ok: false, error: `Question ${i + 1} needs text and a valid type.` };
    }
    if (q.type === "MULTIPLE_CHOICE") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        return { ok: false, error: `Question ${i + 1} needs 2–6 options.` };
      }
      const options: string[] = [];
      for (const o of q.options) {
        const opt = str(o, 500);
        if (!opt) return { ok: false, error: `Question ${i + 1} has an empty option.` };
        options.push(opt);
      }
      const expected = str(q.expectedAnswer, 500);
      const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
      if (!expected || !options.some((o) => norm(o) === norm(expected))) {
        return { ok: false, error: `Question ${i + 1} needs a correct answer matching one option.` };
      }
      questions.push({ type: q.type, questionText, options, expectedAnswer: expected });
    } else {
      const expected = str(q.expectedAnswer, 2000);
      if (!expected) {
        return { ok: false, error: `Question ${i + 1} needs an expected answer for grading.` };
      }
      questions.push({ type: q.type, questionText, options: null, expectedAnswer: expected });
    }
  }

  return {
    ok: true,
    pkg: { title, description, objectives, materials, safety, durationMinutes, difficulty, topic, steps, assessment: { title: assessmentTitle, instructions: assessmentInstructions, questions } },
  };
}

/**
 * POST /api/experiments (FR-TEA-31). Teacher creates a complete package;
 * version 1 publishes immediately (DECISIONS.md §10), atomically.
 */
export async function handleCreateExperiment(req: Request): Promise<NextResponse> {
  const user = await getRequestSession(req);
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const validated = validatePackage(body);
  if (!validated.ok || !validated.pkg) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const pkg = validated.pkg;

  try {
    const created = await db.transaction(async (tx) => {
      const [exp] = await tx.insert(experiments).values({}).returning({ id: experiments.id });
      const [version] = await tx
        .insert(experimentVersions)
        .values({
          experimentId: exp.id,
          versionNumber: 1,
          status: "PUBLISHED",
          title: pkg.title,
          description: pkg.description,
          objectives: pkg.objectives,
          materials: pkg.materials,
          safety: pkg.safety,
          durationMinutes: pkg.durationMinutes,
          difficulty: pkg.difficulty,
          topic: pkg.topic,
        })
        .returning({ id: experimentVersions.id });
      for (const [index, step] of pkg.steps.entries()) {
        const [createdStep] = await tx
          .insert(experimentSteps)
          .values({
            experimentVersionId: version.id,
            stepOrder: index + 1,
            title: step.title,
            instructions: step.instructions,
          })
          .returning({ id: experimentSteps.id });
        for (const [oIndex, obs] of step.observations.entries()) {
          await tx.insert(observationDefinitions).values({
            experimentStepId: createdStep.id,
            displayOrder: oIndex + 1,
            prompt: obs.prompt,
            required: obs.required,
          });
        }
      }
      const [assessment] = await tx
        .insert(assessments)
        .values({
          experimentVersionId: version.id,
          title: pkg.assessment.title,
          instructions: pkg.assessment.instructions,
        })
        .returning({ id: assessments.id });
      for (const [qIndex, q] of pkg.assessment.questions.entries()) {
        await tx.insert(assessmentQuestions).values({
          assessmentId: assessment.id,
          questionOrder: qIndex + 1,
          type: q.type,
          questionText: q.questionText,
          options: q.options,
          expectedAnswer: q.expectedAnswer,
        });
      }
      return { experimentId: exp.id, versionId: version.id };
    });
    return NextResponse.json({ experiment: created }, { status: 201 });
  } catch (error) {
    logError(getRequestId(req), "Experiment creation failed", error);
    return NextResponse.json({ error: "Could not create the experiment." }, { status: 500 });
  }
}
