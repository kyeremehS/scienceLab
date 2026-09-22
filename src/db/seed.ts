/**
 * MVP seed: Building a Simple Electrical Circuit (PRODUCT.md §12).
 * Idempotent: skips when a published version already exists.
 * Run: pnpm db:seed
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  assessments,
  assessmentQuestions,
  experiments,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
} from "./schema";

const TITLE = "Building a Simple Electrical Circuit";

const STEPS: { title: string; instructions: string; observations: { prompt: string; required: boolean }[] }[] = [
  {
    title: "Identify components",
    instructions:
      "Lay out the battery, LED, resistor, wires, and breadboard. Identify each component and note what you think its purpose is before connecting anything.",
    observations: [
      { prompt: "List each component and what you believe its purpose is.", required: true },
    ],
  },
  {
    title: "Connect battery",
    instructions:
      "Connect the battery to the breadboard power rails. Double-check polarity: connect the positive terminal to the positive rail and the negative terminal to the negative rail.",
    observations: [],
  },
  {
    title: "Connect resistor",
    instructions:
      "Connect the resistor in series between the power rail and the row where the LED will sit. The resistor limits current so the LED is not damaged.",
    observations: [
      { prompt: "Why is the resistor needed in this circuit?", required: true },
    ],
  },
  {
    title: "Connect LED",
    instructions:
      "Connect the LED with its longer leg (anode) toward the resistor side and the shorter leg (cathode) toward the negative rail. LEDs only allow current in one direction.",
    observations: [],
  },
  {
    title: "Complete circuit",
    instructions:
      "Close the circuit by completing the final wire connection. Observe what happens the moment the circuit is completed.",
    observations: [
      { prompt: "Did the LED light when the circuit was completed? Describe exactly what you observed.", required: true },
      { prompt: "If the LED did not light, describe what you checked first.", required: false },
    ],
  },
];

const QUESTIONS: {
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  questionText: string;
  options: string[] | null;
  expectedAnswer: string | null;
}[] = [
  {
    order: 1,
    type: "MULTIPLE_CHOICE",
    questionText: "What is the purpose of the resistor in this circuit?",
    options: [
      "To store electrical charge",
      "To limit current so the LED is not damaged",
      "To increase the battery voltage",
      "To change direct current into alternating current",
    ],
    expectedAnswer: "To limit current so the LED is not damaged",
  },
  {
    order: 2,
    type: "MULTIPLE_CHOICE",
    questionText: "Which statement best describes a closed circuit?",
    options: [
      "A circuit with a gap so no current flows",
      "A complete loop that allows current to flow",
      "A circuit connected to two batteries",
      "A circuit with no resistor",
    ],
    expectedAnswer: "A complete loop that allows current to flow",
  },
  {
    order: 3,
    type: "SHORT_ANSWER",
    questionText: "Your LED does not light when the circuit is completed. Name two things you would check, and why.",
    options: null,
    expectedAnswer: "LED polarity (longer leg to positive) and complete connections / closed loop",
  },
];

async function main() {
  const existing = await db
    .select({ id: experimentVersions.id })
    .from(experimentVersions)
    .where(eq(experimentVersions.status, "PUBLISHED"))
    .limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: a published experiment version already exists.");
    process.exit(0);
  }

  const [experiment] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: experiment.id,
      versionNumber: 1,
      status: "PUBLISHED",
      title: TITLE,
      description:
        "Build a working circuit from a battery, resistor, and LED, and learn how current, polarity, and resistance work in practice.",
      objectives: [
        "identify the major components of a simple circuit",
        "explain the purpose of a battery",
        "explain the purpose of an LED",
        "explain why a resistor may be required",
        "distinguish between an open and closed circuit",
        "build a basic functioning circuit",
        "troubleshoot a circuit that does not work",
      ].join("\n"),
      materials: ["battery", "LED", "resistor", "wires", "breadboard or suitable connection method"].join("\n"),
      safety: [
        "Never short-circuit the battery terminals directly.",
        "Disconnect the battery before rearranging components.",
        "Do not use mains electricity; batteries only.",
        "Ask a teacher if any component becomes hot.",
      ].join("\n"),
      durationMinutes: 45,
      difficulty: "Beginner",
      topic: "Physics",
    })
    .returning({ id: experimentVersions.id });

  for (const [index, step] of STEPS.entries()) {
    const [created] = await db
      .insert(experimentSteps)
      .values({
        experimentVersionId: version.id,
        stepOrder: index + 1,
        title: step.title,
        instructions: step.instructions,
      })
      .returning({ id: experimentSteps.id });
    for (const [oIndex, obs] of step.observations.entries()) {
      await db.insert(observationDefinitions).values({
        experimentStepId: created.id,
        displayOrder: oIndex + 1,
        prompt: obs.prompt,
        required: obs.required,
      });
    }
  }

  const [assessment] = await db
    .insert(assessments)
    .values({
      experimentVersionId: version.id,
      title: `${TITLE} — Assessment`,
      instructions: "Answer all questions. Multiple-choice questions are graded automatically.",
    })
    .returning({ id: assessments.id });

  for (const q of QUESTIONS) {
    await db.insert(assessmentQuestions).values({
      assessmentId: assessment.id,
      questionOrder: q.order,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      expectedAnswer: q.expectedAnswer,
    });
  }

  console.log(`Seeded "${TITLE}" (version 1, PUBLISHED).`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
