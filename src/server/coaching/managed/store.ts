import "server-only";
import { z } from "zod";
import {
  itemBody,
  parseThreadItem,
  type ThreadItem,
} from "@/features/coach/items";
import type { OnboardingContext } from "@/server/onboarding/context";

export const sessionModes = ["conversation", "plan"] as const;
export const sessionStatuses = [
  "running",
  "idle",
  "awaiting_athlete",
  "budget_reached",
  "timed_out",
  "failed",
  "terminated",
] as const;

export const sessionKinds = ["main", "topic"] as const;

export type SessionMode = (typeof sessionModes)[number];
export type SessionKind = (typeof sessionKinds)[number];
export type SessionStatus = (typeof sessionStatuses)[number];

const rowSchema = z
  .object({
    id: z.uuid(),
    managed_session_id: z.string(),
    mode: z.enum(sessionModes),
    status: z.enum(sessionStatuses),
    pending_tool_use_id: z.string().nullable(),
    budget_cents: z.number().int(),
    list_cost_cents: z.number().int(),
    last_turn_at: z.string().nullable(),
    title: z.string().nullable(),
    last_activity_at: z.string(),
    read_at: z.string().nullable(),
    composing_since: z.string().nullable(),
    created_at: z.string(),
    kind: z.enum(sessionKinds),
    race_id: z.uuid().nullable(),
    closed_at: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    managedSessionId: row.managed_session_id,
    mode: row.mode,
    status: row.status,
    pendingToolUseId: row.pending_tool_use_id,
    budgetCents: row.budget_cents,
    listCostCents: row.list_cost_cents,
    lastTurnAt: row.last_turn_at,
    title: row.title,
    lastActivityAt: row.last_activity_at,
    readAt: row.read_at,
    composingSince: row.composing_since,
    createdAt: row.created_at,
    kind: row.kind,
    raceId: row.race_id,
    closedAt: row.closed_at,
  }));

export type CoachSessionRecord = z.output<typeof rowSchema>;

const columns =
  "id, managed_session_id, mode, status, pending_tool_use_id, budget_cents, list_cost_cents, last_turn_at, title, last_activity_at, read_at, composing_since, created_at, kind, race_id, closed_at";

export async function findOwnSession(
  context: OnboardingContext,
  managedSessionId: string,
): Promise<CoachSessionRecord | null> {
  const { data, error } = await context.client
    .from("coach_sessions")
    .select(columns)
    .eq("user_id", context.userId)
    .eq("managed_session_id", managedSessionId)
    .maybeSingle();
  if (error) throw new Error("Unable to read the coach session");
  return data ? rowSchema.parse(data) : null;
}

export async function recordSession(
  context: OnboardingContext,
  session: {
    managedSessionId: string;
    mode: SessionMode;
    budgetCents: number;
    title: string;
    kind: SessionKind;
    raceId: string | null;
    status?: SessionStatus;
  },
): Promise<CoachSessionRecord> {
  const { data, error } = await context.client
    .from("coach_sessions")
    .insert({
      user_id: context.userId,
      managed_session_id: session.managedSessionId,
      mode: session.mode,
      status: session.status ?? "running",
      budget_cents: session.budgetCents,
      title: session.title,
      kind: session.kind,
      race_id: session.raceId,
    })
    .select(columns)
    .single();
  if (error) throw new Error("Unable to record the coach session");
  return rowSchema.parse(data);
}

export async function updateSession(
  context: OnboardingContext,
  managedSessionId: string,
  patch: {
    status: SessionStatus;
    pendingToolUseId?: string | null;
    listCostCents?: number;
    lastTurnAt?: string;
  },
) {
  const { error } = await context.client
    .from("coach_sessions")
    .update({
      status: patch.status,
      pending_tool_use_id: patch.pendingToolUseId ?? null,
      composing_since: null,
      last_activity_at: new Date().toISOString(),
      ...(patch.listCostCents === undefined
        ? {}
        : { list_cost_cents: patch.listCostCents }),
      ...(patch.lastTurnAt === undefined
        ? {}
        : { last_turn_at: patch.lastTurnAt }),
    })
    .eq("user_id", context.userId)
    .eq("managed_session_id", managedSessionId);
  if (error) throw new Error("Unable to update the coach session");
}

export async function recordComposing(
  context: OnboardingContext,
  managedSessionId: string,
  since: string | null,
) {
  const { error } = await context.client
    .from("coach_sessions")
    .update({ composing_since: since })
    .eq("user_id", context.userId)
    .eq("managed_session_id", managedSessionId);
  if (error) throw new Error("Unable to record the coach activity");
}

export async function findOwnThread(
  context: OnboardingContext,
  threadId: string,
): Promise<CoachSessionRecord | null> {
  if (!z.uuid().safeParse(threadId).success) return null;
  const { data, error } = await context.client
    .from("coach_sessions")
    .select(columns)
    .eq("user_id", context.userId)
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error("Unable to read the coach thread");
  return data ? rowSchema.parse(data) : null;
}

export async function listOwnTopics(
  context: OnboardingContext,
  limit = 40,
): Promise<CoachSessionRecord[]> {
  const { data, error } = await context.client
    .from("coach_sessions")
    .select(columns)
    .eq("user_id", context.userId)
    .eq("kind", "topic")
    .not("title", "is", null)
    .order("last_activity_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to list the coach topics");
  return z.array(rowSchema).parse(data ?? []);
}

export async function listMainSessions(
  context: OnboardingContext,
  limit = 60,
): Promise<CoachSessionRecord[]> {
  const { data, error } = await context.client
    .from("coach_sessions")
    .select(columns)
    .eq("user_id", context.userId)
    .eq("kind", "main")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to list the main coach sessions");
  return z.array(rowSchema).parse(data ?? []);
}

export async function listAllOwnSessions(
  context: OnboardingContext,
): Promise<CoachSessionRecord[]> {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += searchPage) {
    const { data, error } = await context.client
      .from("coach_sessions")
      .select(columns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + searchPage - 1);
    if (error) throw new Error("Unable to list the coach sessions");
    rows.push(...(data ?? []));
    if ((data ?? []).length < searchPage) break;
  }
  return z.array(rowSchema).parse(rows);
}

export async function findLatestMainSession(
  context: OnboardingContext,
): Promise<CoachSessionRecord | null> {
  const [latest] = await listMainSessions(context, 1);
  return latest ?? null;
}

export async function closeOwnTopic(
  context: OnboardingContext,
  threadId: string,
  closedAt: string,
) {
  const { data, error } = await context.client
    .from("coach_sessions")
    .update({ closed_at: closedAt })
    .eq("user_id", context.userId)
    .eq("id", threadId)
    .eq("kind", "topic")
    .is("closed_at", null)
    .select("id");
  if (error) throw new Error("Unable to close the coach topic");
  return (data ?? []).length > 0;
}

export async function renameOwnTopic(
  context: OnboardingContext,
  threadId: string,
  title: string,
) {
  const { data, error } = await context.client
    .from("coach_sessions")
    .update({ title })
    .eq("user_id", context.userId)
    .eq("id", threadId)
    .eq("kind", "topic")
    .is("closed_at", null)
    .select("id");
  if (error) throw new Error("Unable to rename the coach topic");
  return (data ?? []).length > 0;
}

export async function appendThreadItem(
  context: OnboardingContext,
  coachSessionId: string,
  item: ThreadItem,
) {
  const { error } = await context.client.from("coach_thread_items").insert({
    user_id: context.userId,
    coach_session_id: coachSessionId,
    kind: item.kind,
    body: itemBody(item) as never,
  });
  if (error) throw new Error("Unable to record the coach thread item");
}

const itemRowSchema = z.object({
  id: z.union([z.number().int(), z.string().regex(/^\d+$/)]).transform(String),
  coach_session_id: z.uuid(),
  kind: z.string(),
  body: z.unknown(),
  created_at: z.string(),
});

function parseItemRows(data: unknown) {
  return z
    .array(itemRowSchema)
    .parse(data ?? [])
    .flatMap((row) => {
      const item = parseThreadItem({ ...row, id: row.id });
      return item ? [{ threadId: row.coach_session_id, item }] : [];
    });
}

export async function readThreadItems(
  context: OnboardingContext,
  coachSessionId: string,
  limit = 500,
): Promise<ThreadItem[]> {
  const rows = await readSessionsItems(context, [coachSessionId], limit);
  return rows.map((row) => row.item);
}

const itemColumns = "id, coach_session_id, kind, body, created_at";

export type ItemScope = readonly string[] | "main";

function emptyScope(scope: ItemScope) {
  return scope !== "main" && !scope.length;
}

function itemsQuery(
  context: OnboardingContext,
  scope: ItemScope | null,
  kinds?: readonly ThreadItem["kind"][],
) {
  let query = context.client
    .from("coach_thread_items")
    .select(
      scope === "main"
        ? `${itemColumns}, coach_sessions!inner(kind)`
        : itemColumns,
    )
    .eq("user_id", context.userId);
  if (scope === "main") query = query.eq("coach_sessions.kind", "main");
  else if (scope)
    query =
      scope.length === 1
        ? query.eq("coach_session_id", scope[0])
        : query.in("coach_session_id", [...scope]);
  return kinds ? query.in("kind", [...kinds]) : query;
}

export async function readSessionsItems(
  context: OnboardingContext,
  scope: ItemScope,
  limit = 500,
  kinds?: readonly ThreadItem["kind"][],
) {
  if (emptyScope(scope)) return [];
  const { data, error } = await itemsQuery(context, scope, kinds)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to read the coach thread items");
  return parseItemRows(data).reverse();
}

const searchPage = 1000;

export async function readRecentItems(
  context: OnboardingContext,
  kinds: readonly ThreadItem["kind"][],
  limit: number,
) {
  const pages: unknown[] = [];
  for (let offset = 0; offset < limit; offset += searchPage) {
    const size = Math.min(searchPage, limit - offset);
    const { data, error } = await itemsQuery(context, null, kinds)
      .order("id", { ascending: false })
      .range(offset, offset + size - 1);
    if (error) throw new Error("Unable to read the coach thread items");
    pages.push(...(data ?? []));
    if ((data ?? []).length < size) break;
  }
  return parseItemRows(pages).reverse();
}

export async function readItemsAround(
  context: OnboardingContext,
  scope: ItemScope,
  anchorId: string,
  before = 100,
  after = 400,
) {
  if (emptyScope(scope)) return [];
  const [older, newer] = await Promise.all([
    itemsQuery(context, scope)
      .lte("id", anchorId)
      .order("id", { ascending: false })
      .limit(before + 1),
    itemsQuery(context, scope)
      .gte("id", anchorId)
      .order("id", { ascending: true })
      .limit(after),
  ]);
  if (older.error || newer.error)
    throw new Error("Unable to read the coach thread items");
  const rows = [...parseItemRows(older.data).reverse()];
  const seen = new Set(rows.map((row) => row.item.id));
  for (const row of parseItemRows(newer.data))
    if (!seen.has(row.item.id)) rows.push(row);
  return rows;
}

export async function findItemInSessions(
  context: OnboardingContext,
  scope: ItemScope,
  itemId: string,
) {
  if (emptyScope(scope)) return null;
  const { data, error } = await itemsQuery(context, scope)
    .eq("id", Number(itemId))
    .limit(1);
  if (error) throw new Error("Unable to read the coach thread item");
  return parseItemRows(data)[0] ?? null;
}

export async function findFirstItemSince(
  context: OnboardingContext,
  scope: ItemScope,
  since: string,
  kinds: readonly ThreadItem["kind"][],
) {
  if (emptyScope(scope)) return null;
  const { data, error } = await itemsQuery(context, scope, kinds)
    .gte("created_at", since)
    .order("id", { ascending: true })
    .limit(1);
  if (error) throw new Error("Unable to read the coach thread item");
  return parseItemRows(data)[0] ?? null;
}

export async function markThreadsRead(
  context: OnboardingContext,
  threadIds: readonly string[],
) {
  if (!threadIds.length) return;
  const { error } = await context.client
    .from("coach_sessions")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .in("id", [...threadIds]);
  if (error) throw new Error("Unable to mark the coach threads as read");
}

const proposalStatusSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  coach_session_id: z.uuid(),
});

export async function readThreadProposalStatuses(
  context: OnboardingContext,
  coachSessionIds: readonly string[],
) {
  const statuses = new Map<string, Record<string, string>>(
    coachSessionIds.map((id) => [id, {}]),
  );
  if (!coachSessionIds.length) return statuses;
  const [plans, races] = await Promise.all([
    context.client
      .from("plan_proposals")
      .select("id, status, coach_session_id")
      .eq("user_id", context.userId)
      .in("coach_session_id", [...coachSessionIds]),
    context.client
      .from("race_proposals")
      .select("id, status, coach_session_id")
      .eq("user_id", context.userId)
      .in("coach_session_id", [...coachSessionIds]),
  ]);
  if (plans.error || races.error)
    throw new Error("Unable to read the thread proposals");
  const rows = [
    ...z.array(proposalStatusSchema).parse(plans.data ?? []),
    ...z
      .array(proposalStatusSchema)
      .parse(races.data ?? [])
      .map((row) => ({
        ...row,
        status: row.status === "accepted" ? "applied" : row.status,
      })),
  ];
  for (const row of rows) {
    const record = statuses.get(row.coach_session_id);
    if (record) record[row.id] = row.status;
  }
  return statuses;
}

export async function countCoachAttention(context: OnboardingContext) {
  const sessions = await context.client
    .from("coach_sessions")
    .select("id, status, closed_at")
    .eq("user_id", context.userId)
    .not("title", "is", null);
  if (sessions.error) return null;
  const rows = z
    .array(
      z.object({
        id: z.uuid(),
        status: z.string(),
        closed_at: z.string().nullable(),
      }),
    )
    .parse(sessions.data ?? []);
  if (!rows.length) return { questions: 0, proposals: 0 };
  const ids = rows.map((row) => row.id);
  const [plans, races] = await Promise.all(
    (["plan_proposals", "race_proposals"] as const).map((table) =>
      context.client
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("status", "ready")
        .in("coach_session_id", ids),
    ),
  );
  if (plans.error || races.error) return null;
  return {
    questions: rows.filter(
      (row) => row.status === "awaiting_athlete" && row.closed_at === null,
    ).length,
    proposals: (plans.count ?? 0) + (races.count ?? 0),
  };
}

export async function deleteOwnThread(
  context: OnboardingContext,
  threadId: string,
) {
  const { data, error } = await context.client
    .from("coach_sessions")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", threadId)
    .select("id");
  if (error) throw new Error("Unable to delete the coach thread");
  return (data ?? []).length > 0;
}
