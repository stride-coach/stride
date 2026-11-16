import { z } from "zod";
import { maxAttachments, sentAttachmentSchema } from "./attachments";
import { specialistAgents } from "./staff";

export const outboxCapacity = 20;

const outboxMessageSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(2000),
  consult: z.enum(specialistAgents).nullable().catch(null),
  attachments: z.array(sentAttachmentSchema).max(maxAttachments).catch([]),
});

export type OutboxMessage = z.output<typeof outboxMessageSchema>;

export type Outbox = readonly OutboxMessage[];

export function outboxStorageKey(conversation: string) {
  return `stride:coach-outbox:${conversation}`;
}

export function parseOutbox(raw: string | null): Outbox {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      const parsed = outboxMessageSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, outboxCapacity);
}

export function serializeOutbox(outbox: Outbox) {
  return outbox.length ? JSON.stringify(outbox) : null;
}

export function enqueueMessage(outbox: Outbox, message: OutboxMessage): Outbox {
  if (outbox.length >= outboxCapacity) return outbox;
  return [...outbox, message];
}

export function removeMessage(outbox: Outbox, id: string): Outbox {
  return outbox.filter((message) => message.id !== id);
}

export type ComposerConditions = {
  online: boolean;
  working: boolean;
};

export function sendsNow({ online, working }: ComposerConditions) {
  return online && !working;
}

export type OutboxStep =
  | { kind: "idle" }
  | { kind: "wait" }
  | { kind: "send"; message: OutboxMessage }
  | { kind: "restore"; message: OutboxMessage };

export function outboxStep(
  outbox: Outbox,
  state: ComposerConditions & { sending: boolean; questionPending: boolean },
): OutboxStep {
  const message = outbox[0];
  if (!message) return { kind: "idle" };
  if (state.sending || !sendsNow(state)) return { kind: "wait" };
  if (state.questionPending) return { kind: "restore", message };
  return { kind: "send", message };
}

export function outboxNotice(
  count: number,
  online: boolean,
): { offline: boolean; text: string } | null {
  if (!online)
    return {
      offline: true,
      text:
        count > 1
          ? "Tes messages partiront au retour du réseau."
          : "Ton message partira au retour du réseau.",
    };
  if (count === 0) return null;
  return {
    offline: false,
    text:
      count > 1
        ? `Tes ${count} messages partiront après la réponse du staff.`
        : "Ton message partira après la réponse du staff.",
  };
}
