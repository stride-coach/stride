import type { Metadata } from "next";
import { selectDecision } from "@/features/coach/decisions";
import { requireAthlete } from "@/server/app/session";
import { readCoachDecisions } from "@/server/plans/proposals";
import { DecisionsScreen } from "./_components/decisions-screen";

export const metadata: Metadata = { title: "Décisions · Coach" };

export default async function CoachDecisionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const view = await readCoachDecisions(context);
  const decision = typeof query.decision === "string" ? query.decision : null;
  return (
    <DecisionsScreen view={view} selected={selectDecision(view, decision)} />
  );
}
