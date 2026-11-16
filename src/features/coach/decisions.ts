import {
  monthKey,
  monthLabel,
  proposalChange,
  proposalVersion,
} from "@/features/plans/review/history";
import {
  coach,
  consultedStaff,
  formatStampDay,
  formatStampTime,
  type ProposalRecord,
} from "@/features/plans/review/proposal";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import { coachRequestHref } from "./request";

export const decisionWindowDays = 30;

export type DecisionResponseKind =
  "pending" | "accepted" | "rejected" | "unanswered";

export type DecisionResponse = {
  kind: DecisionResponseKind;
  label: string;
};

export type DecisionEntry = {
  id: string;
  title: string;
  day: string;
  role: string;
  reason: string | null;
  response: DecisionResponse;
  answer: string;
  outcome: string;
  proposedBy: string;
  proposedAt: string;
  paragraph: string | null;
  change: string | null;
  version: string | null;
  exchangeHref: string | null;
  sessionHref: string | null;
  discussHref: string;
};

export type DecisionMonth = {
  key: string;
  label: string;
  count: number;
  entries: DecisionEntry[];
};

export type DecisionSummary = {
  proposals: number;
  accepted: number;
  rejected: number;
};

export type DecisionsView = {
  months: DecisionMonth[];
  summary: DecisionSummary;
  empty: boolean;
};

export type DecisionsInput = {
  proposals: ProposalRecord[];
  timeZone: string;
  now: Date;
};

export type SelectedDecision = {
  entry: DecisionEntry;
  position: number;
  total: number;
  monthLabel: string;
  previousId: string | null;
  nextId: string | null;
};

const responseLabels: Record<DecisionResponseKind, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
  unanswered: "Sans réponse",
};

function athleteDecision(proposal: ProposalRecord) {
  return proposal.decisions.find(
    (decision) =>
      decision.actor === "athlete" &&
      (decision.decision === "accepted" || decision.decision === "rejected"),
  );
}

export function decisionResponse(proposal: ProposalRecord): DecisionResponse {
  const given = athleteDecision(proposal)?.decision;
  const kind: DecisionResponseKind =
    given === "accepted"
      ? "accepted"
      : given === "rejected" || proposal.status === "rejected"
        ? "rejected"
        : proposal.status === "ready"
          ? "pending"
          : proposal.status === "applied" || proposal.status === "accepted"
            ? "accepted"
            : "unanswered";
  return { kind, label: responseLabels[kind] };
}

export function decisionOutcome(proposal: ProposalRecord) {
  switch (proposal.status) {
    case "ready":
      return "Tu peux encore répondre";
    case "accepted":
      return "Acceptée, application en attente";
    case "applied": {
      const version = proposalVersion(proposal);
      return version
        ? `Appliquée à ton plan (${version})`
        : "Appliquée à ton plan";
    }
    case "reverted":
      return "Annulée ensuite : l’ancienne version du plan est rétablie";
    case "rejected":
      return "Rien n’a changé dans ton plan";
    case "stale":
      return "Le plan avait changé : rien n’a été appliqué";
    case "invalid":
      return "Elle ne respectait plus les règles de Stride : rien n’a été appliqué";
    case "superseded":
      return "Remplacée par une proposition plus récente";
    case "expired":
      return "Expirée avant ta réponse";
    default:
      return "";
  }
}

function answerLine(proposal: ProposalRecord, timeZone: string) {
  const response = decisionResponse(proposal);
  const given = athleteDecision(proposal);
  if (response.kind === "pending") return "En attente de ta réponse";
  if (!given) return "Pas de réponse de ta part";
  const sameDay =
    formatStampDay(given.createdAt, timeZone) ===
    formatStampDay(proposal.createdAt, timeZone);
  const time = formatStampTime(given.createdAt, timeZone);
  return sameDay
    ? `${response.label} à ${time}`
    : `${response.label} le ${formatStampDay(given.createdAt, timeZone)} à ${time}`;
}

function sessionKeyOf(proposal: ProposalRecord) {
  for (const operation of proposal.operations) {
    if (
      operation &&
      typeof operation === "object" &&
      "sessionKey" in operation &&
      typeof operation.sessionKey === "string" &&
      operation.sessionKey
    )
      return operation.sessionKey;
  }
  return null;
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();

function dayLabel(iso: string, timeZone: string) {
  let format = dayFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("fr-FR", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    dayFormats.set(timeZone, format);
  }
  const text = format.format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function stamp(iso: string, timeZone: string) {
  return `${dayLabel(iso, timeZone).toLowerCase()} · ${formatStampTime(iso, timeZone)}`;
}

function proposedBy(proposal: ProposalRecord) {
  const consulted = consultedStaff(proposal).map((member) => member.name);
  return consulted.length
    ? `${coach.name}, avec l’avis de ${consulted.join(" et ")}`
    : coach.name;
}

function entryOf(proposal: ProposalRecord, timeZone: string): DecisionEntry {
  const sessionKey = sessionKeyOf(proposal);
  const reason = proposal.summary ?? proposal.rationale;
  const paragraph = proposal.rationale ?? proposal.summary;
  return {
    id: proposal.id,
    title: proposal.title,
    day: dayLabel(proposal.createdAt, timeZone),
    role: "Coach",
    reason,
    response: decisionResponse(proposal),
    answer: answerLine(proposal, timeZone),
    outcome: decisionOutcome(proposal),
    proposedBy: proposedBy(proposal),
    proposedAt: stamp(proposal.createdAt, timeZone),
    paragraph,
    change:
      proposalChange(proposal) ??
      (proposal.rationale ? proposal.summary : null),
    version: proposalVersion(proposal),
    exchangeHref: proposal.coachSessionId
      ? `/coach/${proposal.coachSessionId}`
      : null,
    sessionHref: sessionKey ? sessionPanelHref(sessionKey) : null,
    discussHref: coachRequestHref(
      `Je voudrais en reparler : « ${proposal.title} ».`,
      sessionKey,
    ),
  };
}

export function monthCountLabel(count: number) {
  return `${count} proposition${count > 1 ? "s" : ""}`;
}

export function buildCoachDecisions(input: DecisionsInput): DecisionsView {
  const proposals = input.proposals
    .filter((proposal) => proposal.status !== "draft")
    .sort(
      (first, second) =>
        second.createdAt.localeCompare(first.createdAt) ||
        second.id.localeCompare(first.id),
    );
  const months: DecisionMonth[] = [];
  for (const proposal of proposals) {
    const key = monthKey(proposal.createdAt, input.timeZone);
    let month = months.at(-1);
    if (!month || month.key !== key) {
      month = { key, label: monthLabel(key), count: 0, entries: [] };
      months.push(month);
    }
    month.entries.push(entryOf(proposal, input.timeZone));
    month.count += 1;
  }
  const since = input.now.getTime() - decisionWindowDays * 86_400_000;
  const recent = proposals.filter(
    (proposal) => new Date(proposal.createdAt).getTime() >= since,
  );
  const answered = (kind: DecisionResponseKind) =>
    recent.filter((proposal) => decisionResponse(proposal).kind === kind)
      .length;
  return {
    months,
    summary: {
      proposals: recent.length,
      accepted: answered("accepted"),
      rejected: answered("rejected"),
    },
    empty: proposals.length === 0,
  };
}

export function selectDecision(
  view: DecisionsView,
  id: string | null,
): SelectedDecision | null {
  if (!id) return null;
  for (const month of view.months) {
    const index = month.entries.findIndex((entry) => entry.id === id);
    if (index === -1) continue;
    return {
      entry: month.entries[index],
      position: index + 1,
      total: month.entries.length,
      monthLabel: month.label.toLowerCase(),
      previousId: month.entries[index - 1]?.id ?? null,
      nextId: month.entries[index + 1]?.id ?? null,
    };
  }
  return null;
}
