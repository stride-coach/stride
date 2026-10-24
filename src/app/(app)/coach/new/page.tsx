import type { Metadata } from "next";
import { parseRequestText } from "@/features/coach/request";
import { CoachPage } from "../_components/coach-page";

export const metadata: Metadata = { title: "Nouvelle conversation · Coach" };

export default async function NewCoachConversationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { request, session, race, activity, text } = await searchParams;
  return (
    <CoachPage
      current
      request={typeof request === "string" ? request : null}
      sessionKey={typeof session === "string" ? session : null}
      raceId={typeof race === "string" ? race : null}
      activityId={typeof activity === "string" ? activity : null}
      text={parseRequestText(text)}
    />
  );
}
