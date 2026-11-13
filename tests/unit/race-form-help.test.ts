import { describe, expect, it } from "vitest";
import {
  formatRaceDateField,
  gpxSummary,
  priorityComment,
  tailoredTests,
} from "@/features/races/race-form-help";

function gpx() {
  const points = Array.from({ length: 21 }, (_, index) => {
    const lat = 48.7 + index * 0.009;
    return `<trkpt lat="${lat}" lon="2.05"><ele>${100 + (index % 2) * 40}</ele></trkpt>`;
  });
  return `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Trail de Chevreuse 45K</name></metadata><wpt lat="48.75" lon="2.05"><name>Ravito de Saint-Rémy</name></wpt><wpt lat="48.8" lon="2.05"><name>Point d’eau</name></wpt><wpt lat="48.82" lon="2.05"><name>Col</name></wpt><trk><trkseg>${points.join("")}</trkseg></trk></gpx>`;
}

describe("race form help", () => {
  it("measures a GPX and counts its aid stations", () => {
    const summary = gpxSummary(gpx())!;
    expect(summary.distanceM).toBeGreaterThan(19_000);
    expect(summary.distanceM).toBeLessThan(21_000);
    expect(summary.elevationGainM).toBeGreaterThan(0);
    expect(summary.aidStations).toBe(2);
    expect(gpxSummary("<html></html>")).toBeNull();
  });

  it("shows the race date as on the artboard", () => {
    expect(formatRaceDateField("2027-01-24")).toBe("24 janv. 2027");
  });

  it("tailors the things to test to the main goal", () => {
    const base = ["Alimentation de course"];
    expect(
      tailoredTests(
        "trail",
        { name: "EcoTrail Paris 120K", kind: "trail" },
        base,
      ),
    ).toContain("Allure EcoTrail Paris sur le plat");
    expect(
      tailoredTests("road", { name: "Marathon de Paris", kind: "road" }, base),
    ).toContain("Allure Marathon de Paris");
    expect(
      tailoredTests(
        "road",
        { name: "EcoTrail Paris 120K", kind: "trail" },
        base,
      ),
    ).toBe(base);
    expect(tailoredTests("trail", null, base)).toBe(base);
  });

  it("comments the chosen priority", () => {
    expect(priorityComment("B", "EcoTrail Paris 120K")).toBe(
      "Bon choix pour une B : 2 à 3 jours plus légers avant, une récupération après, et une vraie répétition avant EcoTrail Paris.",
    );
    expect(priorityComment("C", null)).toMatch(/^Une C se court/);
  });
});
