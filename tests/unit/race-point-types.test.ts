import { describe, expect, it } from "vitest";
import {
  onSiteLabel,
  onSiteOf,
  pointTypeOf,
  storedPoint,
  type Service,
  type WaypointKind,
} from "@/features/races/waypoints";

function point(
  kind: WaypointKind,
  services: Service[] = [],
  cutoffMinutes: number | null = null,
) {
  return { kind, services, cutoffMinutes };
}

describe("point types of the artboard", () => {
  it("reads every stored kind as one of the five types", () => {
    expect(
      [
        point("aid", ["water", "sweet"]),
        point("water", ["water"]),
        point("base", ["water", "hot"]),
        point("caution"),
        point("summit"),
        point("instruction", [], 930),
        point("instruction", ["assistance"]),
        point("instruction"),
        point("start"),
      ].map(pointTypeOf),
    ).toEqual([
      "supply",
      "supply",
      "supply",
      "caution",
      "landmark",
      "cutoff",
      "crew",
      "landmark",
      null,
    ]);
  });

  it("reads the services on site, the drop bag coming from a base", () => {
    expect([...onSiteOf(point("base", ["water", "salty", "hot"]))]).toEqual([
      "water",
      "solid",
      "hot",
      "dropBag",
    ]);
    expect(onSiteLabel(point("base", ["water", "salty", "hot"]))).toBe(
      "Eau, solide, chaud, sac",
    );
    expect(onSiteLabel(point("aid", ["water", "assistance"]))).toBe(
      "Eau, assistance",
    );
  });

  it("keeps the stored kind unless the services change its meaning", () => {
    const aid = point("aid", ["water", "sweet", "toilets"]);
    expect(
      storedPoint(aid, "supply", new Set(["water", "solid", "dropBag"])),
    ).toEqual({ kind: "base", services: ["water", "sweet", "toilets"] });
    expect(storedPoint(aid, "supply", new Set(["water"]))).toEqual({
      kind: "aid",
      services: ["water", "toilets"],
    });
    expect(
      storedPoint(point("base", ["water"]), "supply", new Set(["water"])),
    ).toEqual({ kind: "water", services: ["water"] });
    expect(
      storedPoint(
        point("water", ["water"]),
        "supply",
        new Set(["water", "solid"]),
      ),
    ).toEqual({
      kind: "aid",
      services: ["water", "sweet", "salty"],
    });
  });

  it("keeps a landmark kind for cutoff, crew and landmark points", () => {
    expect(storedPoint(point("summit"), "cutoff", new Set())).toEqual({
      kind: "summit",
      services: [],
    });
    expect(storedPoint(point("aid", ["water"]), "crew", new Set())).toEqual({
      kind: "instruction",
      services: ["assistance"],
    });
    expect(storedPoint(point("aid"), "caution", new Set())).toEqual({
      kind: "caution",
      services: [],
    });
  });
});
