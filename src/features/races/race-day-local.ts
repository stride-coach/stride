import { z } from "zod";
import { raceDayCheckinSchema, type RaceDayCheckin } from "./race-day";

export const raceDayCache = "stride-race-day-v1";
export const raceDayExpiryPath = "/__race-day/expires";
export const raceDayStoragePrefix = "stride:race-day:";
export const raceDayKeepMs = 2 * 86_400_000;

const localSchema = z.object({
  checkins: z.array(raceDayCheckinSchema).catch([]),
  pending: z.array(z.uuid()).catch([]),
  done: z.record(z.string(), z.array(z.string())).catch({}),
});

export type RaceDayLocal = z.infer<typeof localSchema>;

export const emptyRaceDayLocal: RaceDayLocal = {
  checkins: [],
  pending: [],
  done: {},
};

export function raceDayStorageKey(raceId: string) {
  return `${raceDayStoragePrefix}${raceId}`;
}

export function parseRaceDayLocal(raw: string | null): RaceDayLocal {
  if (!raw) return emptyRaceDayLocal;
  try {
    const parsed = localSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyRaceDayLocal;
  } catch {
    return emptyRaceDayLocal;
  }
}

export function withCheckin(
  local: RaceDayLocal,
  checkin: RaceDayCheckin,
): RaceDayLocal {
  return {
    ...local,
    checkins: [
      ...local.checkins.filter(
        (item) => item.waypointId !== checkin.waypointId,
      ),
      checkin,
    ],
    pending: [
      ...local.pending.filter((id) => id !== checkin.waypointId),
      checkin.waypointId,
    ],
  };
}

export function withSent(
  local: RaceDayLocal,
  sent: RaceDayCheckin,
): RaceDayLocal {
  const current = local.checkins.find(
    (item) => item.waypointId === sent.waypointId,
  );
  if (current && current.checkedAt !== sent.checkedAt) return local;
  return {
    ...local,
    pending: local.pending.filter((id) => id !== sent.waypointId),
  };
}

export function withDone(
  local: RaceDayLocal,
  waypointId: string,
  item: string,
  checked: boolean,
): RaceDayLocal {
  const items = (local.done[waypointId] ?? []).filter(
    (value) => value !== item,
  );
  return {
    ...local,
    done: { ...local.done, [waypointId]: checked ? [...items, item] : items },
  };
}

export function pendingCheckins(local: RaceDayLocal) {
  return local.pending.flatMap((id) => {
    const checkin = local.checkins.find((item) => item.waypointId === id);
    return checkin ? [checkin] : [];
  });
}

export function mergeCheckins(
  server: readonly RaceDayCheckin[],
  local: RaceDayLocal,
): RaceDayCheckin[] {
  const merged = new Map(server.map((item) => [item.waypointId, item]));
  for (const item of local.checkins) merged.set(item.waypointId, item);
  return [...merged.values()];
}

export function pendingLabel(count: number) {
  if (count === 0) return null;
  return count === 1 ? "1 pointage à envoyer" : `${count} pointages à envoyer`;
}
