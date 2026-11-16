import "server-only";
import { z } from "zod";
import { stepReportSchema } from "@/features/coach/steps";
import { defineTool } from "./define";
import { toolError } from "./errors";

export const reportStepTool = defineTool({
  name: "report_step",
  description:
    "Tell the athlete which step of a long write you are on, shown as « Étape N sur M : label » while they wait. Use it only before a long write such as a full plan or a rewritten range, with a fixed total of two to eight steps, and call it again as you reach each next step. Skip it for short answers.",
  class: "record",
  dataClasses: [],
  input: stepReportSchema,
  output: z.strictObject({ step: z.number(), total: z.number() }),
  run: async (context, input) => {
    if (!context.coachSessionId) throw toolError("tool_unavailable");
    const { error } = await context.client
      .from("coach_sessions")
      .update({ writing_step: input })
      .eq("user_id", context.userId)
      .eq("id", context.coachSessionId);
    if (error) throw toolError("tool_unavailable");
    return { step: input.step, total: input.total };
  },
});
