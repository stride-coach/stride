import "server-only";
import { z } from "zod";
import { activityTitle, type Activity } from "@/features/activities/activities";
import {
  attachmentRefs,
  coachAttachmentSchema,
  maxAttachments,
  type AttachmentOption,
  type AttachmentOptions,
  type AttachmentRef,
  type SentAttachment,
} from "@/features/coach/attachments";
import {
  healthMetricKeys,
  healthSeries,
  healthTopicIds,
  healthTopics,
  healthTopicSchema,
  healthWindowDays,
  type HealthObservation,
  type HealthTopicId,
} from "@/features/coach/health-attachments";
import { fileSizeLabel } from "@/features/coach/files";
import type {
  BetaManagedAgentsDocumentBlock,
  BetaManagedAgentsImageBlock,
} from "@anthropic-ai/sdk/resources/beta/sessions/events";
import { readCoachFiles } from "@/server/coaching/files";
import { addDays } from "@/features/plans/model/dates";
import { listActivities, readActivity } from "@/server/activities/activities";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadSessionDebrief } from "@/server/plans/debrief";
import { readActivePlan } from "@/server/plans/stored";
import type { DebriefView } from "@/features/plans/debrief/view";
import { listRaces } from "@/server/races/races";

export const sessionWindowDays = { past: 14, ahead: 28 } as const;
export const activityOptionCount = 20;

export class AttachmentAccessError extends Error {
  constructor() {
    super("attachment_not_found");
  }
}

const isoDate = z.iso.date();
const amount = z.number().nonnegative().optional();

const sessionContextSchema = z.strictObject({
  kind: z.literal("session"),
  id: z.string(),
  title: z.string(),
  date: isoDate,
  sport: z.string(),
  sessionKind: z.string(),
  purpose: z.string(),
  isKey: z.boolean(),
  durationMinutes: z.int().nonnegative(),
  distanceKm: amount,
  elevationGainM: amount,
  debrief: z
    .strictObject({
      activityId: z.string(),
      verdict: z.strictObject({ title: z.string(), body: z.string() }),
      stepsAligned: z.boolean(),
      note: z.string().optional(),
      steps: z
        .array(
          z.strictObject({
            name: z.string(),
            target: z.string(),
            actual: z.string(),
            detail: z.string().optional(),
            status: z.string().optional(),
          }),
        )
        .max(100),
      feeling: z
        .strictObject({
          source: z.enum(["garmin", "athlete"]),
          effort: z.int().min(1).max(10).optional(),
          feel: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const activityContextSchema = z.strictObject({
  kind: z.literal("activity"),
  id: z.string(),
  title: z.string(),
  date: isoDate,
  activityType: z.string().optional(),
  distanceKm: amount,
  durationMinutes: z.int().nonnegative().optional(),
  elevationGainM: amount,
  averageHeartRateBpm: z.int().positive().optional(),
});

const raceContextSchema = z.strictObject({
  kind: z.literal("race"),
  id: z.string(),
  title: z.string(),
  date: isoDate.nullable(),
  raceKind: z.string(),
  priority: z.string(),
  distanceKm: amount,
  elevationGainM: amount,
  targetSeconds: z.int().positive().optional(),
});

const healthContextSchema = z.strictObject({
  kind: z.literal("health"),
  id: healthTopicSchema,
  title: z.string(),
  date: isoDate,
  metrics: z
    .array(
      z.strictObject({ key: z.string(), label: z.string(), unit: z.string() }),
    )
    .max(4),
  days: z
    .array(
      z.strictObject({
        date: isoDate,
        values: z.record(z.string(), z.number()),
      }),
    )
    .max(healthWindowDays),
});

const fileContextSchema = z.strictObject({
  kind: z.literal("file"),
  id: z.string(),
  title: z.string(),
  date: isoDate,
  contentType: z.string(),
  sizeBytes: z.int().positive(),
  note: z.string(),
  gpx: z
    .strictObject({
      name: z.string().optional(),
      distanceKm: z.number().nonnegative(),
      elevationGainM: z.number().nonnegative().optional(),
      points: z.int().nonnegative(),
      waypoints: z.int().nonnegative(),
    })
    .optional(),
  image: z
    .strictObject({ width: z.int().positive(), height: z.int().positive() })
    .optional(),
  pdf: z.strictObject({ pages: z.int().positive() }).optional(),
});

const imageNote =
  "Image jointe par l’athlète, transmise avec ce message : lis son contenu.";
const pdfNote =
  "Document PDF joint par l’athlète, transmis en entier avec ce message : lis son contenu.";
const unseenImageNote =
  "Image jointe par l’athlète. Le staff ne voit pas l’image : seuls son nom, son format et ses dimensions sont transmis. Si son contenu compte, demande à l’athlète de le décrire.";
const gpxNote =
  "Trace GPX jointe par l’athlète. Le staff reçoit le résumé du parcours (distance, dénivelé positif, points), pas les coordonnées.";

export const attachmentContextSchema = z.strictObject({
  type: z.literal("athlete_attachments"),
  note: z.string(),
  attachments: z
    .array(
      z.discriminatedUnion("kind", [
        sessionContextSchema,
        activityContextSchema,
        raceContextSchema,
        healthContextSchema,
        fileContextSchema,
      ]),
    )
    .min(1)
    .max(maxAttachments),
});

export type AttachmentContext = z.output<typeof attachmentContextSchema>;
export type AttachmentMedia = { type: "image" | "pdf"; fileId: string };
export type ResolvedAttachment = AttachmentContext["attachments"][number] & {
  media?: AttachmentMedia;
};

const contextNote =
  "Éléments que l’athlète a joints à ce message. Fiches lues dans Stride pour son compte, en lecture seule.";

const rounded = (value: number | null, digits = 1) =>
  value === null || value < 0
    ? undefined
    : Math.round(value * 10 ** digits) / 10 ** digits;

function positiveInt(value: number | null) {
  const whole = value === null ? 0 : Math.round(value);
  return whole > 0 ? whole : undefined;
}

function debriefContext(debrief: DebriefView) {
  const { feeling } = debrief;
  return {
    activityId: debrief.activityId,
    verdict: { title: debrief.verdict.title, body: debrief.verdict.body },
    stepsAligned: debrief.aligned,
    ...(debrief.note && { note: debrief.note }),
    steps: debrief.steps.map((step) => ({
      name: step.name,
      target: step.target,
      actual: step.actual,
      ...(step.detail && { detail: step.detail }),
      ...(step.status && { status: step.status.label }),
    })),
    ...(feeling && {
      feeling: {
        source: feeling.source,
        ...(feeling.value.effort !== null && { effort: feeling.value.effort }),
        ...(feeling.feel && { feel: feeling.feel }),
      },
    }),
  };
}

async function resolveSessions(
  context: OnboardingContext,
  ids: string[],
): Promise<ResolvedAttachment[]> {
  if (ids.length === 0) return [];
  const [plan, debriefs] = await Promise.all([
    readActivePlan(context),
    Promise.all(
      ids.map((id) =>
        loadSessionDebrief(context, { sessionKey: id }).catch(() => null),
      ),
    ),
  ]);
  return ids.map((id, index) => {
    const session = plan?.state.sessions.find((item) => item.sessionKey === id);
    if (!session) throw new AttachmentAccessError();
    const debrief = debriefs[index];
    return {
      kind: "session",
      id,
      title: session.title,
      date: session.scheduledOn,
      sport: session.sport,
      sessionKind: session.kind,
      purpose: session.purpose,
      isKey: session.isKey,
      durationMinutes: Math.round(session.targets.durationSeconds / 60),
      distanceKm: rounded(
        session.targets.distanceMeters === null ||
          session.targets.distanceMeters === undefined
          ? null
          : session.targets.distanceMeters / 1000,
      ),
      elevationGainM: rounded(session.targets.elevationGainMeters ?? null, 0),
      ...(debrief && { debrief: debriefContext(debrief) }),
    };
  });
}

async function resolveActivities(
  context: OnboardingContext,
  ids: string[],
): Promise<ResolvedAttachment[]> {
  return Promise.all(
    ids.map(async (id) => {
      const activity = await readActivity(context, id);
      if (!activity) throw new AttachmentAccessError();
      return {
        kind: "activity" as const,
        id,
        title: activityTitle(activity),
        date: activity.date,
        activityType: activity.type ?? undefined,
        distanceKm: rounded(
          activity.distanceMeters === null
            ? null
            : activity.distanceMeters / 1000,
          2,
        ),
        durationMinutes:
          activity.durationSeconds === null
            ? undefined
            : Math.round(activity.durationSeconds / 60),
        elevationGainM: rounded(activity.elevationGainMeters, 0),
        averageHeartRateBpm: positiveInt(activity.averageHeartRate),
      };
    }),
  );
}

async function resolveRaces(
  context: OnboardingContext,
  ids: string[],
): Promise<ResolvedAttachment[]> {
  if (ids.length === 0) return [];
  const races = await listRaces(context);
  return ids.map((id) => {
    const race = races.find((item) => item.id === id);
    if (!race) throw new AttachmentAccessError();
    return {
      kind: "race",
      id,
      title: race.name,
      date: race.date,
      raceKind: race.kind,
      priority: race.priority,
      distanceKm: rounded(race.distanceKm),
      elevationGainM: rounded(race.elevationGainM, 0),
      targetSeconds: positiveInt(race.targetSeconds),
    };
  });
}

const observationSchema = z.object({
  metric: z.string(),
  observed_on: z.string(),
  value_numeric: z.union([z.number(), z.string()]).nullable(),
});

async function readHealthObservations(
  context: OnboardingContext,
  metrics: readonly string[],
): Promise<HealthObservation[]> {
  const { data, error } = await context.client
    .from("provider_observations")
    .select("metric, observed_on, value_numeric")
    .eq("user_id", context.userId)
    .in("metric", [...metrics])
    .in("availability", ["available", "partial"])
    .not("value_numeric", "is", null)
    .order("observed_on", { ascending: false })
    .limit(healthWindowDays * metrics.length);
  if (error) throw new Error("health_observations_unreadable");
  return (data ?? []).flatMap((row) => {
    const parsed = observationSchema.safeParse(row);
    const value = Number(parsed.success ? parsed.data.value_numeric : NaN);
    return parsed.success && Number.isFinite(value)
      ? [{ metric: parsed.data.metric, day: parsed.data.observed_on, value }]
      : [];
  });
}

async function resolveHealth(
  context: OnboardingContext,
  ids: HealthTopicId[],
): Promise<ResolvedAttachment[]> {
  if (ids.length === 0) return [];
  const observations = await readHealthObservations(
    context,
    ids.flatMap((id) => healthTopics[id].metrics.map((metric) => metric.key)),
  );
  return ids.map((id) => {
    const series = healthSeries(id, observations);
    if (!series.latestDay) throw new AttachmentAccessError();
    return {
      kind: "health",
      id,
      title: series.title,
      date: series.latestDay,
      metrics: healthTopics[id].metrics.map(({ key, label, unit }) => ({
        key,
        label,
        unit,
      })),
      days: series.days,
    };
  });
}

async function resolveFiles(
  context: OnboardingContext,
  ids: string[],
): Promise<ResolvedAttachment[]> {
  const rows = await readCoachFiles(context, ids);
  return ids.map((id) => {
    const row = rows.find((item) => item.id === id);
    if (!row) throw new AttachmentAccessError();
    const { summary } = row;
    const size = ` Taille : ${fileSizeLabel(row.size_bytes)}.`;
    const base = {
      kind: "file" as const,
      id,
      title: row.file_name,
      date: row.created_at.slice(0, 10),
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
    };
    if (summary.type === "gpx")
      return {
        ...base,
        note: `${gpxNote}${size}`,
        gpx: {
          ...(summary.name && { name: summary.name }),
          distanceKm: summary.distanceKm,
          ...(summary.elevationGainM !== null && {
            elevationGainM: summary.elevationGainM,
          }),
          points: summary.points,
          waypoints: summary.waypoints,
        },
      };
    const fileId = row.model_file_id;
    if (summary.type === "pdf") {
      if (!fileId) throw new AttachmentAccessError();
      return {
        ...base,
        note: `${pdfNote}${size}`,
        pdf: { pages: summary.pages },
        media: { type: "pdf", fileId },
      };
    }
    return {
      ...base,
      note: `${fileId ? imageNote : unseenImageNote}${size}`,
      image: { width: summary.width, height: summary.height },
      ...(fileId && { media: { type: "image" as const, fileId } }),
    };
  });
}

export async function resolveAttachments(
  context: OnboardingContext,
  refs: readonly AttachmentRef[],
): Promise<ResolvedAttachment[]> {
  const unique = attachmentRefs(refs);
  if (unique.length > maxAttachments) throw new AttachmentAccessError();
  const idsOf = (kind: AttachmentRef["kind"]) =>
    unique.flatMap((ref) => (ref.kind === kind ? [ref.id] : []));
  const healthIds = idsOf("health").flatMap((id) => {
    const topic = healthTopicSchema.safeParse(id);
    if (!topic.success) throw new AttachmentAccessError();
    return [topic.data];
  });
  const [sessions, activities, races, health, files] = await Promise.all([
    resolveSessions(context, idsOf("session")),
    resolveActivities(context, idsOf("activity")),
    resolveRaces(context, idsOf("race")),
    resolveHealth(context, healthIds),
    resolveFiles(context, idsOf("file")),
  ]);
  const resolved = [...sessions, ...activities, ...races, ...health, ...files];
  return unique.map((ref) =>
    resolved.find((item) => item.kind === ref.kind && item.id === ref.id)!,
  );
}

function withoutMedia(attachment: ResolvedAttachment) {
  const item = { ...attachment };
  delete item.media;
  return item;
}

export function attachmentContextText(attachments: ResolvedAttachment[]) {
  return JSON.stringify(
    attachmentContextSchema.parse({
      type: "athlete_attachments",
      note: contextNote,
      attachments: attachments.map(withoutMedia),
    }),
  );
}

export function attachmentMediaBlocks(
  attachments: ResolvedAttachment[],
): Array<BetaManagedAgentsImageBlock | BetaManagedAgentsDocumentBlock> {
  return attachments.flatMap<
    BetaManagedAgentsImageBlock | BetaManagedAgentsDocumentBlock
  >(({ media, title }) => {
    if (!media) return [];
    const source = { type: "file" as const, file_id: media.fileId };
    return media.type === "image"
      ? [{ type: "image", source }]
      : [{ type: "document", source, title }];
  });
}

export function sentAttachments(
  attachments: ResolvedAttachment[],
): SentAttachment[] {
  return attachments.map(({ kind, id, title, date }) => ({
    kind,
    id,
    title: title.slice(0, 120),
    date,
  }));
}

async function sessionOptions(
  context: OnboardingContext,
  today: string,
): Promise<AttachmentOption[]> {
  const plan = await readActivePlan(context);
  const from = addDays(today, -sessionWindowDays.past);
  const to = addDays(today, sessionWindowDays.ahead);
  return (plan?.state.sessions ?? [])
    .filter(
      (session) =>
        session.sport !== "rest" &&
        session.kind !== "rest" &&
        session.scheduledOn >= from &&
        session.scheduledOn <= to,
    )
    .map((session) => ({
      kind: "session",
      id: session.sessionKey,
      title: session.title,
      date: session.scheduledOn,
      distanceKm: null,
      elevationGainM: null,
    }));
}

export async function loadSessionOption(
  context: OnboardingContext,
  options: AttachmentOptions,
  sessionKey: string | null,
): Promise<AttachmentOption[]> {
  const ref = coachAttachmentSchema.safeParse({
    kind: "session",
    id: sessionKey,
  });
  if (!ref.success) return [];
  const listed = options.session.find((option) => option.id === ref.data.id);
  if (listed) return [listed];
  const plan = await readActivePlan(context).catch(() => null);
  const session = plan?.state.sessions.find(
    (item) => item.sessionKey === ref.data.id,
  );
  return session
    ? [
        {
          kind: "session",
          id: session.sessionKey,
          title: session.title,
          date: session.scheduledOn,
          distanceKm: null,
          elevationGainM: null,
        },
      ]
    : [];
}

function activityOption(activity: Activity): AttachmentOption {
  return {
    kind: "activity",
    id: activity.id,
    title: activityTitle(activity),
    date: activity.date,
    distanceKm:
      activity.distanceMeters === null ? null : activity.distanceMeters / 1000,
    elevationGainM: activity.elevationGainMeters,
  };
}

export async function loadActivityOption(
  context: OnboardingContext,
  options: AttachmentOptions,
  activityId: string | null,
): Promise<AttachmentOption[]> {
  const ref = coachAttachmentSchema.safeParse({
    kind: "activity",
    id: activityId,
  });
  if (!ref.success) return [];
  const listed = options.activity.find((option) => option.id === ref.data.id);
  if (listed) return [listed];
  const activity = await readActivity(context, ref.data.id).catch(() => null);
  return activity ? [activityOption(activity)] : [];
}

export function loadRaceOption(
  options: AttachmentOptions,
  raceId: string | null,
): AttachmentOption[] {
  const ref = coachAttachmentSchema.safeParse({ kind: "race", id: raceId });
  if (!ref.success) return [];
  const listed = options.race.find((option) => option.id === ref.data.id);
  return listed ? [listed] : [];
}

async function activityOptions(
  context: OnboardingContext,
): Promise<AttachmentOption[]> {
  const { activities } = await listActivities(
    context,
    "all",
    activityOptionCount,
  );
  return activities.map(activityOption);
}

async function raceOptions(
  context: OnboardingContext,
): Promise<AttachmentOption[]> {
  const races = await listRaces(context);
  return races.map((race) => ({
    kind: "race",
    id: race.id,
    title: race.name,
    date: race.date,
    distanceKm: race.distanceKm,
    elevationGainM: race.elevationGainM,
  }));
}

function orEmpty(options: Promise<AttachmentOption[]>, kind: string) {
  return options.catch((error: unknown) => {
    console.error("Coach attachment options were not read", {
      kind,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  });
}

async function healthOptions(
  context: OnboardingContext,
): Promise<AttachmentOption[]> {
  const observations = await readHealthObservations(context, healthMetricKeys);
  return healthTopicIds.flatMap((id) => {
    const series = healthSeries(id, observations);
    return series.latestDay
      ? [
          {
            kind: "health" as const,
            id,
            title: series.title,
            date: series.latestDay,
            distanceKm: null,
            elevationGainM: null,
            detail: series.latest,
          },
        ]
      : [];
  });
}

export async function loadAttachmentOptions(
  context: OnboardingContext,
  today: string,
): Promise<AttachmentOptions> {
  const [session, activity, race, health] = await Promise.all([
    orEmpty(sessionOptions(context, today), "session"),
    orEmpty(activityOptions(context), "activity"),
    orEmpty(raceOptions(context), "race"),
    orEmpty(healthOptions(context), "health"),
  ]);
  return { session, activity, race, health, file: [] };
}
