/**
 * MVP seed: experiment library + demo classes (PRODUCT.md §12 and Gap fixes).
 * Idempotent per title: skips experiments that already have a published
 * version, so re-running only adds what is missing.
 * Run: pnpm db:seed
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  assessments,
  assessmentQuestions,
  classes,
  experiments,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
  users,
} from "./schema";
import { hashPassword } from "../lib/passwords";
import { normalizeEmail } from "../lib/validation";

type ObservationSeed = { prompt: string; required: boolean };
type StepSeed = { title: string; instructions: string; observations: ObservationSeed[] };
type QuestionSeed = {
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  questionText: string;
  options: string[] | null;
  expectedAnswer: string | null;
};
type ExperimentSeed = {
  title: string;
  description: string;
  objectives: string[];
  materials: string[];
  safety: string[];
  durationMinutes: number;
  difficulty: string;
  topic: string;
  steps: StepSeed[];
  questions: QuestionSeed[];
};

const EXPERIMENTS: ExperimentSeed[] = [
  {
    title: "Building a Simple Electrical Circuit",
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
    ],
    materials: ["battery", "LED", "resistor", "wires", "breadboard or suitable connection method"],
    safety: [
      "Never short-circuit the battery terminals directly.",
      "Disconnect the battery before rearranging components.",
      "Do not use mains electricity; batteries only.",
      "Ask a teacher if any component becomes hot.",
    ],
    durationMinutes: 45,
    difficulty: "Beginner",
    topic: "Physics",
    steps: [
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
    ],
    questions: [
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
        expectedAnswer: "LED polarity and complete connections",
      },
    ],
  },
  {
    title: "Ohm's Law with a Variable Resistor",
    description:
      "Vary resistance in a live circuit, measure current, and discover the relationship between voltage, current, and resistance.",
    objectives: [
      "state Ohm's law in words and symbols",
      "measure current with a multimeter",
      "record paired readings in a table",
      "describe how current changes with resistance",
    ],
    materials: ["battery pack", "variable resistor", "multimeter", "bulb", "wires"],
    safety: [
      "Keep voltages at battery level only.",
      "Disconnect power before changing connections.",
      "Do not dismantle the multimeter.",
    ],
    durationMinutes: 50,
    difficulty: "Intermediate",
    topic: "Physics",
    steps: [
      {
        title: "Build the test circuit",
        instructions:
          "Connect the battery pack, variable resistor, and bulb in series. Set the variable resistor to its midpoint before powering on.",
        observations: [
          { prompt: "Describe the brightness of the bulb at the midpoint setting.", required: true },
        ],
      },
      {
        title: "Vary the resistance",
        instructions:
          "Turn the variable resistor from minimum to maximum in four roughly equal moves. At each position, record the multimeter current reading.",
        observations: [
          { prompt: "Record your four current readings with their dial positions.", required: true },
        ],
      },
      {
        title: "Relate current and resistance",
        instructions:
          "Compare your readings. Describe the pattern you see as resistance increases.",
        observations: [
          { prompt: "In your own words, what happens to current when resistance rises?", required: true },
        ],
      },
    ],
    questions: [
      {
        order: 1,
        type: "MULTIPLE_CHOICE",
        questionText: "Ohm's law states that current equals…",
        options: ["voltage times resistance", "voltage divided by resistance", "resistance divided by voltage", "voltage plus resistance"],
        expectedAnswer: "voltage divided by resistance",
      },
      {
        order: 2,
        type: "SHORT_ANSWER",
        questionText: "Why take readings at several dial positions instead of just one?",
        options: null,
        expectedAnswer: "pattern across readings",
      },
    ],
  },
  {
    title: "Titration of Acids and Bases",
    description:
      "Neutralize an acid with a measured base drop by drop, using an indicator to find the exact endpoint.",
    objectives: [
      "explain neutralization in words",
      "use a burette safely and accurately",
      "recognize the indicator endpoint",
      "record volumes to one decimal place",
    ],
    materials: ["dilute hydrochloric acid", "dilute sodium hydroxide", "phenolphthalein", "burette", "conical flask", "white tile"],
    safety: [
      "Wear eye protection at all times.",
      "Wipe spills immediately and wash hands after.",
      "Never pipette by mouth; use a filler.",
      "Report broken glassware to a teacher at once.",
    ],
    durationMinutes: 60,
    difficulty: "Intermediate",
    topic: "Chemistry",
    steps: [
      {
        title: "Prepare the flask",
        instructions:
          "Measure 25ml of acid into the conical flask, add two drops of phenolphthalein, and place the flask on the white tile.",
        observations: [
          { prompt: "What colour is the solution before any base is added?", required: true },
        ],
      },
      {
        title: "Titrate to the endpoint",
        instructions:
          "Add base from the burette slowly, swirling constantly. Stop at the first permanent pale pink colour and record the volume used.",
        observations: [
          { prompt: "Record your endpoint volume and describe the exact colour change.", required: true },
        ],
      },
      {
        title: "Repeat and compare",
        instructions:
          "Repeat the titration twice more and compare your three endpoint volumes.",
        observations: [
          { prompt: "Are your three volumes within 0.2ml of each other? What does that tell you?", required: true },
        ],
      },
    ],
    questions: [
      {
        order: 1,
        type: "MULTIPLE_CHOICE",
        questionText: "The endpoint of this titration is shown by…",
        options: ["a permanent pale pink colour", "vigorous bubbling", "a white precipitate", "the flask feeling hot"],
        expectedAnswer: "a permanent pale pink colour",
      },
      {
        order: 2,
        type: "SHORT_ANSWER",
        questionText: "Why repeat the titration instead of trusting one reading?",
        options: null,
        expectedAnswer: "check repeatability",
      },
    ],
  },
  {
    title: "Germination and Plant Growth",
    description:
      "Germinate bean seeds under different conditions and track which factors seedlings actually need.",
    objectives: [
      "set up a fair test with a control",
      "measure seedling growth daily",
      "explain the roles of water, warmth, and light",
    ],
    materials: ["bean seeds", "cotton wool", "three transparent cups", "water dropper", "ruler", "labels"],
    safety: [
      "Wash hands after handling soil or seeds.",
      "Wipe up spilled water to avoid slips.",
      "Do not eat any experiment materials.",
    ],
    durationMinutes: 30,
    difficulty: "Beginner",
    topic: "Biology",
    steps: [
      {
        title: "Set up three cups",
        instructions:
          "Label three cups: water only, water plus light, dry plus light. Place three seeds on damp cotton in the first two and dry cotton in the third.",
        observations: [
          { prompt: "Predict which cup will germinate first and explain your reasoning.", required: true },
        ],
      },
      {
        title: "Observe over days",
        instructions:
          "Keep the damp cups moist and place the light cups on a windowsill. Measure any shoots daily for five days.",
        observations: [
          { prompt: "Record shoot lengths per cup after five days.", required: true },
        ],
      },
      {
        title: "Conclude",
        instructions:
          "Compare the three cups against your prediction and decide what seeds need to germinate.",
        observations: [
          { prompt: "Was your prediction correct? What do seeds need, based on your evidence?", required: true },
        ],
      },
    ],
    questions: [
      {
        order: 1,
        type: "MULTIPLE_CHOICE",
        questionText: "Why include a dry cup with no water?",
        options: ["As decoration", "As a control to isolate the effect of water", "To grow a different plant", "To use up spare seeds"],
        expectedAnswer: "As a control to isolate the effect of water",
      },
      {
        order: 2,
        type: "SHORT_ANSWER",
        questionText: "Name two conditions your results suggest seeds need.",
        options: null,
        expectedAnswer: "water and warmth",
      },
    ],
  },
  {
    title: "Density of Regular and Irregular Solids",
    description:
      "Find densities two ways: geometry for regular blocks, water displacement for irregular stones.",
    objectives: [
      "calculate density from mass and volume",
      "use displacement for irregular shapes",
      "record measurements with units",
    ],
    materials: ["balance", "ruler", "measuring cylinder", "water", "metal block", "small stone", "tweezers"],
    safety: [
      "Lower stones gently to avoid splashes and cracks.",
      "Dry electrical balances before use near water.",
      "Wipe spills immediately.",
    ],
    durationMinutes: 40,
    difficulty: "Beginner",
    topic: "Chemistry",
    steps: [
      {
        title: "Regular block by geometry",
        instructions:
          "Weigh the metal block, measure its sides, compute volume, then density as mass over volume.",
        observations: [
          { prompt: "Record mass, sides, volume, and your density with units.", required: true },
        ],
      },
      {
        title: "Stone by displacement",
        instructions:
          "Half-fill the cylinder, note the level, lower the stone with tweezers, and note the new level. The difference is the stone's volume.",
        observations: [
          { prompt: "Record both water levels and the stone's volume.", required: true },
        ],
      },
      {
        title: "Compare",
        instructions:
          "Weigh the stone and compute its density. Compare the two methods and their likely errors.",
        observations: [
          { prompt: "Which method do you trust more, and what could skew each result?", required: true },
        ],
      },
    ],
    questions: [
      {
        order: 1,
        type: "MULTIPLE_CHOICE",
        questionText: "Density is defined as…",
        options: ["mass times volume", "mass divided by volume", "volume divided by mass", "mass plus volume"],
        expectedAnswer: "mass divided by volume",
      },
      {
        order: 2,
        type: "SHORT_ANSWER",
        questionText: "Why can't you use a ruler for the stone's volume?",
        options: null,
        expectedAnswer: "irregular shape",
      },
    ],
  },
  {
    title: "Newton's Second Law with a Cart",
    description:
      "Pull a dynamics cart with known forces and measure how acceleration responds to force and mass.",
    objectives: [
      "state Newton's second law",
      "measure time over a fixed distance",
      "explain how mass changes acceleration",
    ],
    materials: ["dynamics cart", "runway", "pulley", "string", "slotted masses", "stopwatch", "metre rule"],
    safety: [
      "Keep feet clear of the runway end; use a stop block.",
      "Catch the cart before it hits the pulley.",
      "Do not stand on carts or runways.",
    ],
    durationMinutes: 55,
    difficulty: "Intermediate",
    topic: "Physics",
    steps: [
      {
        title: "Constant mass, varying force",
        instructions:
          "Keep total mass fixed while moving masses from cart to hanger. Time the cart over two metres for three different pulling forces.",
        observations: [
          { prompt: "Record your three force and time pairs.", required: true },
        ],
      },
      {
        title: "Constant force, varying mass",
        instructions:
          "Keep the pulling force fixed and add masses to the cart. Time three runs with increasing total mass.",
        observations: [
          { prompt: "Record your three mass and time pairs.", required: true },
        ],
      },
      {
        title: "Conclude",
        instructions:
          "Describe how acceleration responded to force and to mass in your own words.",
        observations: [
          { prompt: "State the force-acceleration and mass-acceleration patterns you found.", required: true },
        ],
      },
    ],
    questions: [
      {
        order: 1,
        type: "MULTIPLE_CHOICE",
        questionText: "Doubling the force on a fixed mass…",
        options: ["halves acceleration", "doubles acceleration", "leaves acceleration unchanged", "stops the cart"],
        expectedAnswer: "doubles acceleration",
      },
      {
        order: 2,
        type: "SHORT_ANSWER",
        questionText: "Why keep total mass fixed in the first set of runs?",
        options: null,
        expectedAnswer: "fair test force",
      },
    ],
  },
];

const DEMO_TEACHER = { name: "Demo Teacher", email: "demo-teacher@sciencelab.local", password: "password123" };
const DEMO_CLASSES = [
  { name: "Physics", description: "Mechanics and circuits", code: "SCE001" },
  { name: "Chemistry", description: "Reactions and measurement", code: "SCE002" },
  { name: "Biology", description: "Life and growth", code: "SCE003" },
];

async function seedExperiment(def: ExperimentSeed): Promise<"created" | "skipped"> {
  const existing = await db
    .select({ id: experimentVersions.id })
    .from(experimentVersions)
    .where(and(eq(experimentVersions.status, "PUBLISHED"), eq(experimentVersions.title, def.title)))
    .limit(1);
  if (existing.length > 0) return "skipped";

  const [experiment] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: experiment.id,
      versionNumber: 1,
      status: "PUBLISHED",
      title: def.title,
      description: def.description,
      objectives: def.objectives.join("\n"),
      materials: def.materials.join("\n"),
      safety: def.safety.join("\n"),
      durationMinutes: def.durationMinutes,
      difficulty: def.difficulty,
      topic: def.topic,
    })
    .returning({ id: experimentVersions.id });

  for (const [index, step] of def.steps.entries()) {
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
      title: `${def.title} — Assessment`,
      instructions: "Answer all questions. Multiple-choice questions are graded automatically.",
    })
    .returning({ id: assessments.id });

  for (const [qIndex, q] of def.questions.entries()) {
    await db.insert(assessmentQuestions).values({
      assessmentId: assessment.id,
      questionOrder: qIndex + 1,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      expectedAnswer: q.expectedAnswer,
    });
  }
  return "created";
}

async function seedDemoClasses(): Promise<void> {
  const email = normalizeEmail(DEMO_TEACHER.email);
  let teacher = (
    await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  )[0];
  if (!teacher) {
    const [created] = await db
      .insert(users)
      .values({ name: DEMO_TEACHER.name, email, passwordHash: await hashPassword(DEMO_TEACHER.password), role: "TEACHER" })
      .returning({ id: users.id });
    teacher = created;
    console.log(`Seeded demo teacher ${email} (password: ${DEMO_TEACHER.password}).`);
  }
  for (const c of DEMO_CLASSES) {
    const found = await db.select({ id: classes.id }).from(classes).where(eq(classes.code, c.code)).limit(1);
    if (found.length === 0) {
      await db.insert(classes).values({
        teacherId: teacher.id,
        name: c.name,
        description: c.description,
        code: c.code,
      });
      console.log(`Seeded class "${c.name}" — join with code ${c.code}.`);
    }
  }
}

async function main() {
  for (const def of EXPERIMENTS) {
    const result = await seedExperiment(def);
    console.log(result === "created" ? `Seeded "${def.title}" (version 1, PUBLISHED).` : `Seed skipped (already published): "${def.title}".`);
  }
  await seedDemoClasses();
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
