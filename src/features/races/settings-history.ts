import { z } from "zod";
import { settingValue, type SimulationSetting } from "./simulation-settings";

export const storedSettings = {
  target: "target",
  walkGrade: "walk_grade",
  aidStop: "aid_stop",
} as const satisfies Record<SimulationSetting, string>;

const fromStored = Object.fromEntries(
  Object.entries(storedSettings).map(([key, value]) => [value, key]),
) as Record<string, SimulationSetting>;

const settingLabels: Record<SimulationSetting, string> = {
  target: "Objectif",
  walkGrade: "Marcher dès",
  aidStop: "Arrêt par ravito",
};

export const settingChangeColumns =
  "id, setting, previous_value, value, created_at";

const rowSchema = z.object({
  id: z.string(),
  setting: z.string(),
  previous_value: z.number().nullable(),
  value: z.number(),
  created_at: z.string(),
});

export type SettingChange = {
  id: string;
  setting: SimulationSetting;
  label: string;
  when: string;
  from: string | null;
  to: string;
  restore: number | null;
};

const when = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export function settingChanges(rows: unknown[]): SettingChange[] {
  return rows.flatMap((row) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) return [];
    const setting = fromStored[parsed.data.setting];
    if (!setting) return [];
    return [
      {
        id: parsed.data.id,
        setting,
        label: settingLabels[setting],
        when: when.format(new Date(parsed.data.created_at)).replace(",", " ·"),
        from:
          parsed.data.previous_value === null
            ? null
            : settingValue(setting, parsed.data.previous_value),
        to: settingValue(setting, parsed.data.value),
        restore: parsed.data.previous_value,
      },
    ];
  });
}
