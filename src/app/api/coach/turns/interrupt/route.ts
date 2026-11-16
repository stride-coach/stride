import { z } from "zod";
import {
  interruptCoachTurn,
  SessionAccessError,
  SessionStateError,
} from "@/server/coaching/managed/session";
import { getOnboardingContext } from "@/server/onboarding/context";

const requestSchema = z.strictObject({ threadId: z.uuid() });

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const context = await getOnboardingContext({ writable: true });
  if (!context)
    return Response.json({ code: "session-expired" }, { status: 401, headers });
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ code: "invalid-request" }, { status: 400, headers });
  try {
    await interruptCoachTurn(context, parsed.data.threadId);
  } catch (error) {
    if (error instanceof SessionAccessError)
      return Response.json({ code: "not-found" }, { status: 404, headers });
    if (error instanceof SessionStateError)
      return Response.json({ code: error.code }, { status: 409, headers });
    throw error;
  }
  return Response.json({ status: "interrupting" }, { status: 202, headers });
}
