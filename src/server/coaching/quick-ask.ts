"use server";

import { z } from "zod";
import { localToday } from "@/features/app-shell/shell";
import {
  coachAttachmentSchema,
  type AttachmentOption,
  type AttachmentOptions,
} from "@/features/coach/attachments";
import { getOnboardingContext } from "@/server/onboarding/context";
import {
  loadActivityOption,
  loadAttachmentOptions,
  loadRaceOption,
  loadSessionOption,
} from "./attachments";

const inputSchema = z.strictObject({
  context: coachAttachmentSchema.nullable(),
});

export type QuickAskData = {
  today: string;
  options: AttachmentOptions;
  attached: AttachmentOption[];
};

export async function loadQuickAskData(
  input: unknown,
): Promise<QuickAskData | null> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;
  const context = await getOnboardingContext();
  if (!context) return null;
  const today = localToday(new Date());
  const options = await loadAttachmentOptions(context, today);
  const ref = parsed.data.context;
  const attached =
    ref?.kind === "session"
      ? await loadSessionOption(context, options, ref.id)
      : ref?.kind === "activity"
        ? await loadActivityOption(context, options, ref.id)
        : ref?.kind === "race"
          ? loadRaceOption(options, ref.id)
          : [];
  return { today, options, attached };
}
