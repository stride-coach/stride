import { describe, expect, it } from "vitest";
import { settingChanges } from "@/features/races/settings-history";

describe("race settings history", () => {
  it("reads each change with its label, values and the value to restore", () => {
    expect(
      settingChanges([
        {
          id: "c2",
          setting: "aid_stop",
          previous_value: 300,
          value: 360,
          created_at: "2026-11-12T17:02:00Z",
        },
        {
          id: "c1",
          setting: "target",
          previous_value: null,
          value: 66_600,
          created_at: "2026-11-11T08:15:00Z",
        },
        {
          id: "c0",
          setting: "heart_rate",
          previous_value: 150,
          value: 145,
          created_at: "2026-11-10T08:15:00Z",
        },
      ]),
    ).toEqual([
      {
        id: "c2",
        setting: "aidStop",
        label: "Arrêt par ravito",
        when: "12 nov. · 18:02",
        from: "5 min",
        to: "6 min",
        restore: 300,
      },
      {
        id: "c1",
        setting: "target",
        label: "Objectif",
        when: "11 nov. · 09:15",
        from: null,
        to: "18h30",
        restore: null,
      },
    ]);
  });
});
