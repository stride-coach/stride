import { z } from "zod";

export const maximumRequestLength = 500;

const requestTextSchema = z
  .string()
  .trim()
  .min(1)
  .transform((text) => text.slice(0, maximumRequestLength).trim());

export function parseRequestText(value: unknown) {
  const parsed = requestTextSchema.safeParse(
    Array.isArray(value) ? value[0] : value,
  );
  return parsed.success ? parsed.data : null;
}

export function coachRequestHref(
  text: string | null,
  sessionKey?: string | null,
  raceId?: string | null,
) {
  const params = new URLSearchParams();
  if (text) params.set("text", text.slice(0, maximumRequestLength));
  if (sessionKey) params.set("session", sessionKey);
  if (raceId) params.set("race", raceId);
  return `/coach/new?${params.toString()}`;
}
