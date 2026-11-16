import "server-only";
import { z } from "zod";
import { localToday } from "@/features/plans/constraints";
import {
  blockKinds,
  blocksInputSchema,
  dataCardSchema,
  linkDestinations,
  resolveBlocks,
  resolveCard,
} from "@/features/coach/blocks";
import { healthModel } from "@/features/progress/health";
import { readPlanningConstraints } from "@/server/plans/constraints";
import { loadHealthDays } from "@/server/progress/health";
import { defineTool } from "./define";

const resolvedSchema = z.strictObject({
  shown: z.array(z.enum(blockKinds)),
  dropped: z.array(z.enum(blockKinds)),
  card: dataCardSchema.nullable(),
  choices: z.array(z.string()),
  links: z.array(z.enum(linkDestinations)),
  replies: z.array(z.string()),
});

export const attachBlocksTool = defineTool({
  name: "attach_blocks",
  description:
    "Attach blocks to the message you just sent to the athlete: a data card for one measure (the value and the athlete's personal range come from stored data, never from you; the card is dropped when none is stored), two or three choice buttons, links to a few screens, and short replies the athlete may send next. Call it after your message, once per message, only when a block helps. Never repeat in a block what your message says. Returns what was shown and what was dropped.",
  class: "propose",
  dataClasses: ["health"],
  input: blocksInputSchema,
  output: resolvedSchema,
  run: async (context, input) => {
    let card = null;
    if (input.card) {
      const { timeZone } = await readPlanningConstraints(context);
      const today = localToday(timeZone);
      const days = await loadHealthDays(context, today);
      card = resolveCard(
        input.card,
        healthModel({ days, view: "week", today }),
      );
    }
    const { blocks, shown, dropped } = resolveBlocks(input, card);
    return { shown, dropped, ...blocks };
  },
});
