import { describe, expect, it } from "vitest";
import {
  emptyRaceDayLocal,
  mergeCheckins,
  parseRaceDayLocal,
  pendingCheckins,
  pendingLabel,
  withCheckin,
  withDone,
  withSent,
} from "@/features/races/race-day-local";

const buc = "a0000000-0000-4000-8000-000000000001";
const meudon = "a0000000-0000-4000-8000-000000000002";

describe("race-day local store", () => {
  it("reads nothing from a missing or broken value", () => {
    expect(parseRaceDayLocal(null)).toEqual(emptyRaceDayLocal);
    expect(parseRaceDayLocal("{")).toEqual(emptyRaceDayLocal);
    expect(parseRaceDayLocal('{"checkins":"no"}')).toEqual(emptyRaceDayLocal);
  });

  it("queues a check-in until it is sent", () => {
    const local = withCheckin(emptyRaceDayLocal, {
      waypointId: buc,
      checkedAt: 1000,
    });
    expect(pendingCheckins(local)).toEqual([
      { waypointId: buc, checkedAt: 1000 },
    ]);
    expect(pendingLabel(local.pending.length)).toBe("1 pointage à envoyer");
    const sent = withSent(local, { waypointId: buc, checkedAt: 1000 });
    expect(sent.pending).toEqual([]);
    expect(parseRaceDayLocal(JSON.stringify(sent))).toEqual(sent);
  });

  it("keeps a correction queued when an older time comes back sent", () => {
    const local = withCheckin(
      withCheckin(emptyRaceDayLocal, { waypointId: buc, checkedAt: 1000 }),
      { waypointId: buc, checkedAt: 2000 },
    );
    expect(local.pending).toEqual([buc]);
    expect(
      withSent(local, { waypointId: buc, checkedAt: 1000 }).pending,
    ).toEqual([buc]);
  });

  it("lays the phone's check-ins over the saved page", () => {
    const local = withCheckin(emptyRaceDayLocal, {
      waypointId: meudon,
      checkedAt: 3000,
    });
    expect(
      mergeCheckins(
        [
          { waypointId: buc, checkedAt: 1000 },
          { waypointId: meudon, checkedAt: 2500 },
        ],
        local,
      ),
    ).toEqual([
      { waypointId: buc, checkedAt: 1000 },
      { waypointId: meudon, checkedAt: 3000 },
    ]);
  });

  it("remembers the ticked to-do items per aid station", () => {
    const ticked = withDone(emptyRaceDayLocal, buc, "Soupe", true);
    expect(ticked.done[buc]).toEqual(["Soupe"]);
    expect(withDone(ticked, buc, "Soupe", false).done[buc]).toEqual([]);
  });
});
