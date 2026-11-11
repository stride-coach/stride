import type { Metadata } from "next";
import { parseRequestText } from "@/features/coach/request";
import { CoachMainPage } from "../_components/coach-page";

export const metadata: Metadata = { title: "Fil principal · Coach" };

export default async function CoachMainThreadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { request, session, race, activity, text } = await searchParams;
  return (
    <CoachMainPage
      request={typeof request === "string" ? request : null}
      sessionKey={typeof session === "string" ? session : null}
      raceId={typeof race === "string" ? race : null}
      activityId={typeof activity === "string" ? activity : null}
      text={parseRequestText(text)}
    />
  );
}
