"use server";

import type { SyncRequestResult } from "@/features/garmin/sync";
import { holdsHealthConsent } from "@/server/consent/health-consent";
import { getOnboardingContext } from "@/server/onboarding/context";
import { getGarminClient } from "./session";

const reconnectCodes = new Set(["reconnect_required", "disconnected"]);

export async function requestGarminSync(): Promise<SyncRequestResult> {
  const context = await getOnboardingContext().catch(() => null);
  if (!context) return { status: "session-expired" };
  if (!(await holdsHealthConsent(context).catch(() => false)))
    return { status: "unavailable" };
  const result = await getGarminClient()
    .requestSync({ accessToken: context.accessToken })
    .catch(() => null);
  if (!result) return { status: "unavailable" };
  if (result.ok) return { status: "requested", sync: result.value };
  const { code, retryAfterSeconds } = result.failure;
  if (code === "unauthorized") return { status: "session-expired" };
  if (reconnectCodes.has(code)) return { status: "reconnect" };
  if (code === "sync_throttled")
    return {
      status: "throttled",
      availableAt: new Date(
        Date.now() + (retryAfterSeconds ?? 300) * 1000,
      ).toISOString(),
    };
  return { status: "unavailable" };
}
