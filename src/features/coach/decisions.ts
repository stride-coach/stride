import {
  monthKey,
  monthLabel,
  proposalChange,
  proposalVersion,
} from "@/features/plans/review/history";
import { localToday } from "@/features/plans/constraints";
import {
  coach,
  consultedStaff,
  formatStampDay,
  formatStampTime,
  staffMember,
  type ProposalRecord,
} from "@/features/plans/review/proposal";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import {
  recoveryLine,
  recoveryOutcome,
  recoverySummary,
  sessionConformity,
  type OutcomeMatch,
  type RecoveryCase,
  type RecoverySummary,
  type WellnessDay,
} from "./decision-outcomes";
import { coachRequestHref } from "./request";
import type { StaffAgent } from "./staff";

export const decisionWindowDays = 30;

export type DecisionResponseKind =
  "pending" | "accepted" | "modified" | "rejected" | "unanswered";

export type DecisionResponse = {
  kind: DecisionResponseKind;
  label: string;
};

export type DecisionEntry = {
  id: string;
  title: string;
  day: string;
  role: string;
  agent: StaffAgent;
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
  modified: number;
  rejected: number;
};

export type DecisionsView = {
  months: DecisionMonth[];
  summary: DecisionSummary;
  recovery: RecoverySummary | null;
  empty: boolean;
};

export type RaceDecisionRecord = {
  id: string;
  raceId: string;
  kind: "strategy" | "nutrition";
  title: string;
  summary: string | null;
  status: "ready" | "accepted" | "rejected" | "superseded" | "stale";
  createdAt: string;
  decidedAt: string | null;
  coachSessionId: string | null;
};

export type DecisionSignals = {
  wellness: WellnessDay[];
  matches: OutcomeMatch[];
};

export type DecisionsInput = {
  proposals: ProposalRecord[];
  raceProposals?: RaceDecisionRecord[];
  signals?: DecisionSignals;
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
  modified: "Modifiée",
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
        : proposal.status === "superseded" &&
            proposal.successorStatus === "applied"
          ? "modified"
          : proposal.status === "ready"
            ? "pending"
            : proposal.status === "applied" || proposal.status === "accepted"
              ? "accepted"
              : "unanswered";
  return { kind, label: responseLabels[kind] };
}

export function decisionOutcome(proposal: ProposalRecord) {
  if (decisionResponse(proposal).kind === "modified")
    return "Modifiée ensuite : la version retenue a été appliquée";
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

function answerLine(
  response: DecisionResponse,
  answeredAt: string | null,
  createdAt: string,
  timeZone: string,
) {
  if (response.kind === "pending") return "En attente de ta réponse";
  if (!answeredAt) return "Pas de réponse de ta part";
  const sameDay =
    formatStampDay(answeredAt, timeZone) ===
    formatStampDay(createdAt, timeZone);
  const time = formatStampTime(answeredAt, timeZone);
  return sameDay
    ? `${response.label} à ${time}`
    : `${response.label} le ${formatStampDay(answeredAt, timeZone)} à ${time}`;
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

function dayOf(iso: string, timeZone: string) {
  return localToday(timeZone, new Date(iso));
}

type Row = {
  id: string;
  createdAt: string;
  entry: DecisionEntry;
  recovery: { response: "accepted" | "rejected"; days: number } | null;
};

function planOutcome(
  proposal: ProposalRecord,
  response: DecisionResponse,
  sessionKey: string | null,
  signals: DecisionSignals | undefined,
  timeZone: string,
  now: Date,
) {
  const lines: string[] = [];
  let recovery: Row["recovery"] = null;
  if (response.kind !== "pending" && signals) {
    if (proposal.status === "applied" && sessionKey) {
      const conformity = sessionConformity(signals.matches, sessionKey);
      if (conformity !== null) lines.push(`Séance conforme à ${conformity} %`);
    }
    if (proposal.origin === "recovery") {
      const outcome = recoveryOutcome(
        signals.wellness,
        dayOf(proposal.createdAt, timeZone),
        localToday(timeZone, now),
      );
      if (outcome) {
        lines.push(recoveryLine(outcome));
        if (
          outcome.state === "back" &&
          (response.kind === "accepted" || response.kind === "rejected")
        )
          recovery = { response: response.kind, days: outcome.days };
      }
    }
  }
  return {
    outcome: lines.length ? lines.join(" · ") : decisionOutcome(proposal),
    recovery,
  };
}

function planRow(
  proposal: ProposalRecord,
  signals: DecisionSignals | undefined,
  timeZone: string,
  now: Date,
): Row {
  const sessionKey = sessionKeyOf(proposal);
  const reason = proposal.summary ?? proposal.rationale;
  const paragraph = proposal.rationale ?? proposal.summary;
  const response = decisionResponse(proposal);
  const { outcome, recovery } = planOutcome(
    proposal,
    response,
    sessionKey,
    signals,
    timeZone,
    now,
  );
  return {
    id: proposal.id,
    createdAt: proposal.createdAt,
    recovery,
    entry: {
      id: proposal.id,
      title: proposal.title,
      day: dayLabel(proposal.createdAt, timeZone),
      role: coach.name,
      agent: "coach",
      reason,
      response,
      answer: answerLine(
        response,
        athleteDecision(proposal)?.createdAt ?? null,
        proposal.createdAt,
        timeZone,
      ),
      outcome,
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
    },
  };
}

const raceResponses: Record<
  RaceDecisionRecord["status"],
  DecisionResponseKind
> = {
  ready: "pending",
  accepted: "accepted",
  rejected: "rejected",
  superseded: "unanswered",
  stale: "unanswered",
};

const raceOutcomes: Record<RaceDecisionRecord["status"], string> = {
  ready: "Tu peux encore répondre",
  accepted: "Appliquée à ta course",
  rejected: "Rien n’a changé dans ta course",
  superseded: "Remplacée par une proposition plus récente",
  stale: "La course avait changé : rien n’a été appliqué",
};

const raceAgents: Record<RaceDecisionRecord["kind"], StaffAgent> = {
  strategy: "strategist",
  nutrition: "nutritionist",
};

function raceRow(record: RaceDecisionRecord, timeZone: string): Row {
  const member = staffMember(raceAgents[record.kind]);
  const kind = raceResponses[record.status];
  const response = { kind, label: responseLabels[kind] };
  return {
    id: record.id,
    createdAt: record.createdAt,
    recovery: null,
    entry: {
      id: record.id,
      title: record.title,
      day: dayLabel(record.createdAt, timeZone),
      role: member.name,
      agent: raceAgents[record.kind],
      reason: record.summary,
      response,
      answer: answerLine(
        response,
        kind === "accepted" || kind === "rejected" ? record.decidedAt : null,
        record.createdAt,
        timeZone,
      ),
      outcome: raceOutcomes[record.status],
      proposedBy: member.name,
      proposedAt: stamp(record.createdAt, timeZone),
      paragraph: record.summary,
      change: null,
      version: null,
      exchangeHref: record.coachSessionId
        ? `/coach/${record.coachSessionId}`
        : null,
      sessionHref: null,
      discussHref: coachRequestHref(
        `Je voudrais en reparler : « ${record.title} ».`,
        null,
        record.raceId,
      ),
    },
  };
}

export function monthCountLabel(count: number) {
  return `${count} proposition${count > 1 ? "s" : ""}`;
}

export function buildCoachDecisions(input: DecisionsInput): DecisionsView {
  const rows = [
    ...input.proposals
      .filter((proposal) => proposal.status !== "draft")
      .map((proposal) =>
        planRow(proposal, input.signals, input.timeZone, input.now),
      ),
    ...(input.raceProposals ?? []).map((record) =>
      raceRow(record, input.timeZone),
    ),
  ].sort(
    (first, second) =>
      second.createdAt.localeCompare(first.createdAt) ||
      second.id.localeCompare(first.id),
  );
  const months: DecisionMonth[] = [];
  for (const row of rows) {
    const key = monthKey(row.createdAt, input.timeZone);
    let month = months.at(-1);
    if (!month || month.key !== key) {
      month = { key, label: monthLabel(key), count: 0, entries: [] };
      months.push(month);
    }
    month.entries.push(row.entry);
    month.count += 1;
  }
  const since = input.now.getTime() - decisionWindowDays * 86_400_000;
  const recent = rows.filter(
    (row) => new Date(row.createdAt).getTime() >= since,
  );
  const answered = (kind: DecisionResponseKind) =>
    recent.filter((row) => row.entry.response.kind === kind).length;
  const cases: RecoveryCase[] = rows.flatMap((row) =>
    row.recovery ? [row.recovery] : [],
  );
  return {
    months,
    summary: {
      proposals: recent.length,
      accepted: answered("accepted"),
      modified: answered("modified"),
      rejected: answered("rejected"),
    },
    recovery: recoverySummary(cases),
    empty: rows.length === 0,
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
