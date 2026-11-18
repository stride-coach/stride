import "server-only";
import { z } from "zod";
import {
  factBasisLimit,
  factCategories,
  factOrigins,
  factStatus,
  factTextLimit,
  staffFactSchema,
} from "@/features/coach/memory";
import { recordStaffFact } from "../memory";
import { defineTool } from "./define";
import { toolError } from "./errors";

const factOutput = z.strictObject({
  id: z.uuid(),
  category: z.enum(factCategories),
  text: z.string(),
  startsOn: z.iso.date().optional(),
  endsOn: z.iso.date().optional(),
  status: z.enum(["said", "observed", "confirmed"]),
});

export const recordAthleteFactTool = defineTool({
  name: "record_athlete_fact",
  description:
    "Keep one fact about the athlete in « Ce que je sais de toi », the page where the athlete reads, confirms, corrects or forgets what the staff knows. Use source said for what the athlete wrote or told you in this conversation, including a « Ce n'est pas juste » correction of one of your messages turned into the fact it states. Use source observed only for something you deduced from stored data (a habit, a recovery pattern, a usual range) and give a short French basis such as « 6 semaines de données »; an observation stays a hypothesis until the athlete confirms it. Never record a guess as said, a severity or a diagnosis (use record_condition_report for pain, illness or fatigue), or anything the athlete did not state or the data does not show. Write the text in French, in the second person, as one short sentence. Read knownFacts in read_athlete_context first: recording the same sentence in the same category returns the existing fact instead of a duplicate, and a fact the athlete forgot must not be recorded again unless they say it again. Use category upcoming with startsOn and endsOn for a dated period such as a trip. Returns the stored fact and whether it was created.",
  class: "record",
  dataClasses: ["health"],
  input: z
    .strictObject({
      category: z
        .enum(factCategories)
        .describe(
          "goal: objectives; body: how the athlete's body behaves; habit: routines and constraints; upcoming: a dated period.",
        ),
      text: z
        .string()
        .trim()
        .min(1)
        .max(factTextLimit)
        .describe("One short French sentence, second person."),
      startsOn: z.iso
        .date()
        .nullable()
        .optional()
        .describe("First day, upcoming only."),
      endsOn: z.iso
        .date()
        .nullable()
        .optional()
        .describe("Last day, upcoming only."),
      source: z.enum(factOrigins),
      basis: z
        .string()
        .trim()
        .min(1)
        .max(factBasisLimit)
        .nullable()
        .optional()
        .describe(
          "Required for observed, forbidden for said. For example « 5 semaines de données ».",
        ),
    })
    .transform((input) => ({
      ...input,
      startsOn: input.startsOn ?? null,
      endsOn: input.endsOn ?? null,
      basis: input.basis ?? null,
    })),
  output: z.strictObject({
    created: z.boolean(),
    fact: factOutput,
  }),
  run: async (context, input) => {
    const parsed = staffFactSchema.safeParse(input);
    if (!parsed.success)
      throw toolError(
        "invalid_input",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    const result = await recordStaffFact(context, parsed.data);
    if (result.outcome === "limit")
      throw toolError("invalid_input", [
        {
          path: "text",
          message:
            "L’athlète a atteint la limite de 100 informations. Ne l’ajoute pas.",
        },
      ]);
    const { fact } = result;
    return {
      created: result.outcome === "created",
      fact: {
        id: fact.id,
        category: fact.category,
        text: fact.text,
        ...(fact.startsOn ? { startsOn: fact.startsOn } : {}),
        ...(fact.endsOn ? { endsOn: fact.endsOn } : {}),
        status: factStatus(fact),
      },
    };
  },
});
