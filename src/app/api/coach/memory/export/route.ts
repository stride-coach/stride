import { memoryExport } from "@/features/coach/memory";
import { readFacts } from "@/server/coaching/memory";
import { getOnboardingContext } from "@/server/onboarding/context";
import { json } from "@/server/races/request";

export async function GET() {
  const context = await getOnboardingContext().catch(() => null);
  if (!context) return json({ status: "session-expired" }, 401);
  const facts = await readFacts(context).catch(() => null);
  if (!facts) return json({ status: "unavailable" }, 500);
  const now = new Date();
  return new Response(JSON.stringify(memoryExport(facts, now), null, 2), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="stride-memoire-${now.toISOString().slice(0, 10)}.json"`,
    },
  });
}
