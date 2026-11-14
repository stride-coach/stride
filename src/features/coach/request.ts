import { z } from "zod";
import { coachAttachmentSchema, type AttachmentRef } from "./attachments";

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
  return `/coach?${params.toString()}`;
}

const contextRoutes: { kind: AttachmentRef["kind"]; pattern: RegExp }[] = [
  { kind: "race", pattern: /^\/races\/([^/]+)(?:\/|$)/ },
  { kind: "activity", pattern: /^\/activities\/([^/]+)\/?$/ },
  { kind: "session", pattern: /^\/plan\/sessions\/([^/]+)\/?$/ },
];

export function coachContextFromPath(
  pathname: string,
  search: string = "",
): AttachmentRef | null {
  const session = new URLSearchParams(search).get("session");
  if (session && /^\/plan(?:\/|$)/.test(pathname)) {
    const parsed = coachAttachmentSchema.safeParse({
      kind: "session",
      id: session,
    });
    return parsed.success ? parsed.data : null;
  }
  for (const { kind, pattern } of contextRoutes) {
    const match = pattern.exec(pathname);
    if (!match) continue;
    let id: string;
    try {
      id = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
    const parsed = coachAttachmentSchema.safeParse({ kind, id });
    return parsed.success ? parsed.data : null;
  }
  return null;
}

export function coachContextHref(context: AttachmentRef | null) {
  if (!context) return "/coach";
  return `/coach?${new URLSearchParams({ [context.kind]: context.id })}`;
}
