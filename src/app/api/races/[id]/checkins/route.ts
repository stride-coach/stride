import { z } from "zod";
import { getOnboardingContext } from "@/server/onboarding/context";
import { saveRaceCheckin } from "@/server/races/checkins";
import { json, sameOrigin } from "@/server/races/request";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/races/[id]/checkins">,
) {
  if (!sameOrigin(request)) return json({ status: "forbidden" }, 403);
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return json({ status: "missing" }, 404);
  const context = await getOnboardingContext({ writable: true }).catch(
    () => null,
  );
  if (!context) return json({ status: "session-expired" }, 401);
  const body = await request.json().catch(() => null);
  const status = await saveRaceCheckin(context, id.data, body).catch(
    () => "error" as const,
  );
  return json(
    { status },
    status === "saved" ? 200 : status === "invalid" ? 422 : 500,
  );
}
