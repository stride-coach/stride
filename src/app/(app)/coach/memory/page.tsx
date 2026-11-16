import type { Metadata } from "next";
import { groupFacts } from "@/features/coach/memory";
import { requireAthlete } from "@/server/app/session";
import { readFacts } from "@/server/coaching/memory";
import { coachTimeZone } from "@/server/coaching/threads";
import { MemoryScreen } from "./_components/memory-screen";

export const metadata: Metadata = { title: "Ce que je sais de toi · Coach" };

export default async function CoachMemoryPage() {
  const context = await requireAthlete();
  const facts = await readFacts(context);
  return <MemoryScreen groups={groupFacts(facts)} timeZone={coachTimeZone} />;
}
