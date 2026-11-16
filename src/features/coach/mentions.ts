import {
  staff,
  staffAgents,
  type SpecialistAgent,
  type StaffAgent,
} from "./staff";

export const mentionHints: Record<StaffAgent, string> = {
  coach: "ta séance, ta semaine",
  medical: "récupération, douleurs",
  director: "ta saison, tes courses",
  strategist: "parcours, allures",
  nutritionist: "ravitaillement",
};

const maximumQueryLength = 24;

export type MentionQuery = { start: number; end: number; query: string };

function normalized(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function mentionOptions(query: string): StaffAgent[] {
  const wanted = normalized(query);
  return staffAgents.filter((agent) => {
    const name = normalized(staff[agent].name);
    return (
      name.startsWith(wanted) ||
      name.split(" ").some((word) => word.startsWith(wanted))
    );
  });
}

export function mentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/[\s(«"']/u.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > maximumQueryLength || /[\n@]/.test(query)) return null;
  if (query.startsWith(" ") || mentionOptions(query).length === 0) return null;
  return { start: at, end: caret, query };
}

export function stepMention(index: number, count: number, step: 1 | -1) {
  if (count === 0) return -1;
  return (index + step + count) % count;
}

export function insertMention(
  text: string,
  query: MentionQuery,
  agent: StaffAgent,
) {
  const mention = `@${staff[agent].name} `;
  const after = text.slice(query.end).replace(/^ /, "");
  return {
    text: `${text.slice(0, query.start)}${mention}${after}`,
    caret: query.start + mention.length,
  };
}

export function openMention(text: string, caret: number) {
  const before = text.slice(0, caret);
  const prefix = before === "" || /\s$/u.test(before) ? "@" : " @";
  return {
    text: `${before}${prefix}${text.slice(caret)}`,
    caret: caret + prefix.length,
  };
}

const namesByLength = [...staffAgents].sort(
  (left, right) => staff[right].name.length - staff[left].name.length,
);

export function mentionedAgent(text: string): StaffAgent | null {
  let found: { agent: StaffAgent; index: number } | null = null;
  for (const agent of namesByLength) {
    const pattern = new RegExp(
      `(^|[^\\p{L}])@${staff[agent].name}(?![\\p{L}])`,
      "gu",
    );
    for (const match of text.matchAll(pattern)) {
      const index = match.index + match[1].length;
      if (!found || index > found.index) found = { agent, index };
    }
  }
  return found?.agent ?? null;
}

export function consultOf(text: string): SpecialistAgent | null {
  const agent = mentionedAgent(text);
  return agent === null || agent === "coach" ? null : agent;
}
