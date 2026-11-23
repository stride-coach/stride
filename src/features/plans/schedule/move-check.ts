import { validatePlanChange } from "@/features/plans/detailing/build";
import type { DeterministicPlanInput } from "@/features/plans/detailing/build";
import type { PlanState } from "@/features/plans/model/plan";
import { applyOperations } from "@/features/plans/operations/apply";
import type { PlanOperation } from "@/features/plans/operations/operations";
import { introducedRules } from "@/features/plans/review/review";
import type {
  RuleId,
  ValidationReport,
} from "@/features/plans/validation/report";
import type { MoveBlock } from "./move-block";
import type { MoveDay } from "./week-moves";

const blockRules: [MoveBlock, readonly RuleId[]][] = [
  ["health", ["H1", "H2", "H3"]],
  ["unavailable", ["C1"]],
  ["specialist", ["C3"]],
  ["duration", ["C2"]],
];

export function blockOf(rules: RuleId[]): MoveBlock | null {
  if (rules.length === 0) return null;
  for (const [block, ids] of blockRules)
    if (rules.some((rule) => ids.includes(rule))) return block;
  return "rules";
}

export function moveOperations(
  sessionKey: string,
  day: MoveDay,
): PlanOperation[] {
  return [
    ...(day.restKey
      ? [{ op: "skip_session" as const, sessionKey: day.restKey }]
      : []),
    { op: "move_session", sessionKey, toDate: day.date },
  ];
}

export function checkMove(
  input: DeterministicPlanInput,
  state: PlanState,
  before: ValidationReport,
  sessionKey: string,
  day: MoveDay,
  context: {
    today: string;
    matchedSessionKeys: ReadonlySet<string>;
    version: number;
  },
): MoveBlock | null {
  const result = applyOperations(state, moveOperations(sessionKey, day), {
    today: context.today,
    matchedSessionKeys: context.matchedSessionKeys,
  });
  if (!result.ok) return "rules";
  const after = validatePlanChange(input, state, result.state, {
    versions: { expected: context.version, current: context.version },
    matchedSessionKeys: context.matchedSessionKeys,
  });
  return blockOf(introducedRules(after, before, "block"));
}
