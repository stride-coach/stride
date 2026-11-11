"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clampItem } from "@/features/coach/items";
import {
  mainThreadTitle,
  topicDecisions,
  topicLead,
  topicMessageCount,
  topicTitleSchema,
} from "@/features/coach/topics";
import { summarizeTopic } from "@/server/ai/skills/topic-summary";
import { countUnreadInThreads } from "@/server/notifications/feed";
import { getOnboardingContext } from "@/server/onboarding/context";
import type { OnboardingContext } from "@/server/onboarding/context";
import { managedClient } from "./managed/resources";
import { createCoachSession } from "./managed/session";
import {
  appendThreadItem,
  closeOwnTopic,
  deleteOwnThread,
  findLatestMainSession,
  findOwnThread,
  markThreadsRead,
  readThreadItems,
  readThreadProposalStatuses,
  renameOwnTopic,
  type CoachSessionRecord,
} from "./managed/store";
import { turnAccessToken, turnTimeoutMs } from "./managed/token";
import { syncAthleteVault } from "./managed/vault";

const inputSchema = z.strictObject({ threadId: z.uuid() });
const readSchema = z.strictObject({
  threadIds: z.array(z.uuid()).min(1).max(60),
});

export async function markCoachThreadsRead(input: unknown) {
  const parsed = readSchema.safeParse(input);
  if (!parsed.success) return { ok: false } as const;
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { ok: false } as const;
  const unread = await countUnreadInThreads(
    context,
    parsed.data.threadIds,
  ).catch(() => 0);
  await markThreadsRead(context, parsed.data.threadIds).catch(() => undefined);
  if (unread > 0) revalidatePath("/coach", "layout");
  return { ok: true } as const;
}

function turnRunning(thread: CoachSessionRecord) {
  return (
    thread.status === "running" &&
    thread.lastTurnAt !== null &&
    Date.now() - Date.parse(thread.lastTurnAt) < turnTimeoutMs
  );
}

export type DeleteThreadResult = {
  status:
    | "deleted"
    | "closed"
    | "turn_in_progress"
    | "not-found"
    | "session-expired"
    | "error";
};

async function archiveManagedSession(managedSessionId: string) {
  try {
    await managedClient().beta.sessions.archive(managedSessionId, null, {
      timeout: 5_000,
      maxRetries: 0,
    });
  } catch (error) {
    console.error("Managed Agents session was not archived", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function deleteCoachThread(
  input: unknown,
): Promise<DeleteThreadResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "not-found" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  try {
    const thread = await findOwnThread(context, parsed.data.threadId);
    if (!thread || thread.kind !== "topic") return { status: "not-found" };
    if (thread.closedAt !== null) return { status: "closed" };
    if (turnRunning(thread)) return { status: "turn_in_progress" };
    if (!(await deleteOwnThread(context, thread.id)))
      return { status: "not-found" };
    await archiveManagedSession(thread.managedSessionId);
  } catch {
    return { status: "error" };
  }
  revalidatePath("/coach", "layout");
  return { status: "deleted" };
}

export type TopicActionResult = {
  status:
    | "done"
    | "closed"
    | "turn_in_progress"
    | "invalid"
    | "not-found"
    | "session-expired"
    | "error";
};

const renameSchema = z.strictObject({
  threadId: z.uuid(),
  title: topicTitleSchema,
});

export async function renameCoachTopic(
  input: unknown,
): Promise<TopicActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  try {
    const thread = await findOwnThread(context, parsed.data.threadId);
    if (!thread || thread.kind !== "topic") return { status: "not-found" };
    if (thread.closedAt !== null) return { status: "closed" };
    if (!(await renameOwnTopic(context, thread.id, parsed.data.title)))
      return { status: "closed" };
  } catch {
    return { status: "error" };
  }
  revalidatePath("/coach", "layout");
  return { status: "done" };
}

async function mainSessionFor(context: OnboardingContext) {
  const latest = await findLatestMainSession(context);
  if (latest) return latest;
  const vaultId = await syncAthleteVault(
    context.userId,
    await turnAccessToken(context),
  );
  return createCoachSession(
    context,
    {
      kind: "main",
      mode: "conversation",
      title: mainThreadTitle,
      raceId: null,
      status: "idle",
    },
    vaultId,
  );
}

export async function closeCoachTopic(
  input: unknown,
): Promise<TopicActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "not-found" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  try {
    const thread = await findOwnThread(context, parsed.data.threadId);
    if (!thread || thread.kind !== "topic") return { status: "not-found" };
    if (thread.closedAt !== null) return { status: "closed" };
    if (turnRunning(thread)) return { status: "turn_in_progress" };
    const [items, statuses] = await Promise.all([
      readThreadItems(context, thread.id),
      readThreadProposalStatuses(context, [thread.id]),
    ]);
    const title = thread.title ?? "Sujet";
    const summary = await summarizeTopic({ title, items });
    const closedAt = new Date().toISOString();
    if (!(await closeOwnTopic(context, thread.id, closedAt)))
      return { status: "closed" };
    try {
      const main = await mainSessionFor(context);
      await appendThreadItem(
        context,
        main.id,
        clampItem({
          kind: "topic_summary",
          at: closedAt,
          topicId: thread.id,
          title,
          openedAt: thread.createdAt,
          closedAt,
          lead: topicLead(items),
          messages: topicMessageCount(items),
          decisions: topicDecisions(items, statuses.get(thread.id) ?? {}).slice(
            0,
            20,
          ),
          summary,
        }),
      );
    } catch (error) {
      console.error("Coach topic summary card was not recorded", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  } catch {
    return { status: "error" };
  }
  revalidatePath("/coach", "layout");
  return { status: "done" };
}
