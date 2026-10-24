import { describe, expect, it } from "vitest";
import { frenchName, showFrenchNames } from "@/features/races/map";

describe("race map labels", () => {
  it("prefers French names on every named symbol layer", () => {
    const fields: Record<string, unknown> = {
      place: ["get", "name_en"],
      road: "{name}",
      shield: ["get", "ref"],
      water: undefined,
    };
    const map = {
      getStyle: () => ({
        version: 8 as const,
        sources: {},
        layers: [
          { id: "place", type: "symbol" },
          { id: "road", type: "symbol" },
          { id: "shield", type: "symbol" },
          { id: "water", type: "symbol" },
          { id: "land", type: "fill" },
        ],
      }),
      getLayoutProperty: (id: string) => fields[id],
      setLayoutProperty: (id: string, _name: string, value: unknown) => {
        fields[id] = value;
      },
    } as unknown as Parameters<typeof showFrenchNames>[0];
    showFrenchNames(map);
    expect(fields).toEqual({
      place: frenchName,
      road: frenchName,
      shield: ["get", "ref"],
      water: undefined,
    });
  });
});
