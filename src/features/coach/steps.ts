import { z } from "zod";

export const maxWritingSteps = 8;
export const stepLabelLimit = 60;

export const stepReportSchema = z
  .strictObject({
    step: z
      .number()
      .int()
      .min(1)
      .max(maxWritingSteps)
      .describe("Number of the step you are on, starting at 1."),
    total: z
      .number()
      .int()
      .min(2)
      .max(maxWritingSteps)
      .describe("Total number of steps of this long write."),
    label: z
      .string()
      .trim()
      .min(1)
      .max(stepLabelLimit)
      .describe(
        "What this step covers, in French, as a short noun phrase without final punctuation.",
      ),
  })
  .refine(({ step, total }) => step <= total, {
    path: ["step"],
    message: "step cannot exceed total",
  });

export type StepReport = z.output<typeof stepReportSchema>;

const storedStepSchema = z.object({
  step: z.number().int().min(1).max(maxWritingSteps),
  total: z.number().int().min(2).max(maxWritingSteps),
  label: z
    .string()
    .trim()
    .min(1)
    .transform((label) => label.slice(0, stepLabelLimit)),
});

export function parseStoredStep(value: unknown): StepReport | null {
  const parsed = storedStepSchema.safeParse(value);
  if (!parsed.success || parsed.data.step > parsed.data.total) return null;
  return parsed.data;
}

export function stepLine(step: StepReport) {
  return `Étape ${step.step} sur ${step.total} : ${step.label}`;
}
