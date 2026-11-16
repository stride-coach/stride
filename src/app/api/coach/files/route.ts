import { fileErrors, maxFileBytes } from "@/features/coach/files";
import { storeCoachFile } from "@/server/coaching/files";
import { getOnboardingContext } from "@/server/onboarding/context";
import { json, sameOrigin } from "@/server/races/request";

const envelopeBytes = 64 * 1024;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ code: "forbidden" }, 403);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxFileBytes + envelopeBytes)
    return json({ error: fileErrors.tooLarge }, 413);
  const context = await getOnboardingContext({ writable: true }).catch(
    () => null,
  );
  if (!context) return json({ code: "session-expired" }, 401);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: fileErrors.missing }, 400);
  const stored = await storeCoachFile(context, file).catch(() => ({
    error: fileErrors.failed,
  }));
  if ("error" in stored)
    return json(
      { error: stored.error },
      stored.error === fileErrors.failed ? 502 : 400,
    );
  return json(stored, 200);
}
