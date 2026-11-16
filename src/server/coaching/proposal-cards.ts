import "server-only";
import { z } from "zod";
import type { ThreadItem } from "@/features/coach/items";
import {
  proposalDecision,
  type ProposalCard,
} from "@/features/coach/proposal-card";
import { proposalPreview } from "@/features/coach/proposal-preview";
import { localToday } from "@/features/plans/constraints";
import { sessionKeyDate } from "@/features/plans/model/keys";
import { readDecisions } from "@/server/coaching/tools/plan-history";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readSessionMatches } from "@/server/plans/matches";
import { readActivePlan } from "@/server/plans/stored";

const cardRowSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  scope: z.string(),
  title: z.string(),
  operations: z.unknown(),
  plan_id: z.uuid().nullable(),
  applied_version: z.int().nullable(),
  superseded_by: z.uuid().nullable(),
  target_keys: z.array(z.string()).catch([]),
});

function planProposalIds(items: readonly ThreadItem[]) {
  return [
    ...new Set(
      items.flatMap((item) =>
        item.kind === "proposal" && item.scope === "session"
          ? [item.proposalId]
          : [],
      ),
    ),
  ];
}

async function readCardRows(context: OnboardingContext, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await context.client
    .from("plan_proposals")
    .select(
      "id, status, scope, title, operations, plan_id, applied_version, superseded_by, target_keys",
    )
    .eq("user_id", context.userId)
    .in("id", ids);
  if (error) throw new Error("Unable to read the thread proposals");
  return z.array(cardRowSchema).parse(data ?? []);
}

const sessionKeyOf = (target: string) => target.slice(target.indexOf(":") + 1);

export async function readProposalCards(
  context: OnboardingContext,
  items: readonly ThreadItem[],
): Promise<Record<string, ProposalCard>> {
  const ids = planProposalIds(items);
  if (!ids.length) return {};
  const [rows, active] = await Promise.all([
    readCardRows(context, ids),
    readActivePlan(context),
  ]);
  const successorIds = [
    ...new Set(rows.flatMap((row) => row.superseded_by ?? [])),
  ];
  const [successors, decisions, matches] = await Promise.all([
    readCardRows(context, successorIds),
    readDecisions(context, [...rows.map((row) => row.id), ...successorIds]),
    active ? readSessionMatches(context, active.planId) : [],
  ]);
  const today = localToday(active?.state.plan.timeZone ?? "Europe/Paris");
  const matched = new Set(matches.map((match) => match.sessionKey));
  const decisionsOf = (id: string) =>
    decisions
      .filter((decision) => decision.proposal_id === id)
      .sort((first, second) =>
        first.created_at.localeCompare(second.created_at),
      )
      .map((decision) => ({
        decision: decision.decision,
        createdAt: decision.created_at,
      }));
  const successorById = new Map(successors.map((row) => [row.id, row]));
  return Object.fromEntries(
    rows.map((row) => {
      const preview =
        active && row.plan_id === active.planId
          ? proposalPreview(row.operations, {
              state: active.state,
              applied: row.status === "applied",
              today,
            })
          : null;
      const sessionKeys = row.target_keys.map(sessionKeyOf);
      const successor = row.superseded_by
        ? (successorById.get(row.superseded_by) ?? null)
        : null;
      const successorDecisions = successor ? decisionsOf(successor.id) : [];
      const card: ProposalCard = {
        scope: row.scope,
        preview,
        successorTitle: successor?.title ?? null,
        decision: proposalDecision(
          {
            status: row.status,
            scope: row.scope,
            decisions: decisionsOf(row.id),
            appliedVersion: row.applied_version,
            activeVersion:
              active && row.plan_id === active.planId
                ? active.activeVersion
                : null,
            sessionDate:
              preview?.sessionDate ??
              sessionKeys
                .flatMap((key) => sessionKeyDate(key) ?? [])
                .sort()[0] ??
              null,
            sessionMatched: sessionKeys.some((key) => matched.has(key)),
            successor: successor
              ? {
                  status: successor.status,
                  title: successor.title,
                  decidedAt:
                    successorDecisions.find(
                      (decision) => decision.decision === "accepted",
                    )?.createdAt ??
                    successorDecisions.at(-1)?.createdAt ??
                    null,
                }
              : null,
          },
          today,
        ),
      };
      return [row.id, card];
    }),
  );
}
