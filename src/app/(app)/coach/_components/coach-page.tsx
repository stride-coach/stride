import { notFound, redirect } from "next/navigation";
import { localToday } from "@/features/app-shell/shell";
import { requireAthlete } from "@/server/app/session";
import {
  loadActivityOption,
  loadAttachmentOptions,
  loadRaceOption,
  loadSessionOption,
} from "@/server/coaching/attachments";
import {
  coachTimeZone,
  loadMainActivity,
  loadMainThread,
  loadTopic,
  loadTopics,
} from "@/server/coaching/threads";
import { CoachScreen } from "./coach-screen";

const planRequest = "Construis-moi un plan d’entraînement pour mon objectif.";

export async function CoachMainPage({
  request = null,
  sessionKey = null,
  raceId = null,
  activityId = null,
  text = null,
}: {
  request?: string | null;
  sessionKey?: string | null;
  raceId?: string | null;
  activityId?: string | null;
  text?: string | null;
}) {
  const context = await requireAthlete();
  const now = new Date();
  const [main, topics, attachmentOptions] = await Promise.all([
    loadMainThread(context, now),
    loadTopics(context),
    loadAttachmentOptions(context, localToday(now)),
  ]);
  const plan = request === "plan";
  const preselected = [
    ...(await loadSessionOption(context, attachmentOptions, sessionKey)),
    ...(await loadActivityOption(context, attachmentOptions, activityId)),
    ...loadRaceOption(attachmentOptions, raceId),
  ];
  return (
    <CoachScreen
      view={{ kind: "main", data: main }}
      topics={topics}
      mainActivityAt={main.lastActivityAt}
      draft={{
        mode: plan ? "plan" : "conversation",
        text: plan ? planRequest : (text ?? ""),
      }}
      now={now.toISOString()}
      timeZone={coachTimeZone}
      attachmentOptions={attachmentOptions}
      initialAttachments={preselected}
    />
  );
}

export async function CoachTopicPage({ threadId }: { threadId: string }) {
  const context = await requireAthlete();
  const now = new Date();
  const [lookup, mainActivityAt, topics, attachmentOptions] = await Promise.all(
    [
      loadTopic(context, threadId),
      loadMainActivity(context),
      loadTopics(context),
      loadAttachmentOptions(context, localToday(now)),
    ],
  );
  if (!lookup) notFound();
  if (lookup.kind === "main") redirect("/coach");
  return (
    <CoachScreen
      view={{ kind: "topic", data: lookup.topic }}
      topics={topics}
      mainActivityAt={mainActivityAt}
      draft={{ mode: lookup.topic.mode, text: "" }}
      now={now.toISOString()}
      timeZone={coachTimeZone}
      attachmentOptions={attachmentOptions}
    />
  );
}
