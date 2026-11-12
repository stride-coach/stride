import "server-only";
import { randomBytes } from "node:crypto";
import {
  crewLinkTokenSchema,
  crewPage,
  crewSnapshotSchema,
} from "@/features/races/crew-link";
import { parseSiteUrl } from "@/server/auth/environment";
import type { OnboardingContext } from "@/server/onboarding/context";
import { createSupabaseServerClient } from "@/server/supabase/client";

export function newCrewToken() {
  return randomBytes(24).toString("base64url");
}

export function siteOrigin() {
  try {
    return parseSiteUrl(process.env.SITE_URL);
  } catch {
    return null;
  }
}

export async function readCrewLink(context: OnboardingContext, raceId: string) {
  const { data, error } = await context.client
    .from("race_crew_links")
    .select("token, enabled")
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .maybeSingle();
  if (error || !data) return null;
  return { token: data.token, enabled: data.enabled };
}

export async function readCrewPage(token: string) {
  if (!crewLinkTokenSchema.safeParse(token).success) return null;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("crew_link_view", {
    p_token: token,
  });
  if (error || !data) return null;
  const snapshot = crewSnapshotSchema.safeParse(data);
  return snapshot.success ? crewPage(snapshot.data) : null;
}
