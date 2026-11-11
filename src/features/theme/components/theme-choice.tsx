"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  segmentChecked,
  segmentGroup,
  segmentItem,
} from "@/features/settings/components/preferences";
import { themeLabels, themePreferences } from "../model";
import { setThemePreference, useThemePreference } from "./theme-store";

export function ThemeChoice() {
  const preference = useThemePreference();
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border py-3.5 max-sm:grid-cols-1">
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="font-medium">
          Thème
        </span>
        <span id={hintId} className="text-label text-secondary-foreground">
          Système suit le réglage clair ou sombre de ton appareil.
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className={cn(segmentGroup, "max-sm:w-full")}
      >
        {themePreferences
          .toSorted((a, b) =>
            a === "system" ? -1 : b === "system" ? 1 : a === "light" ? -1 : 1,
          )
          .map((option) => (
            <label key={option} className="flex max-sm:flex-1">
              <input
                type="radio"
                name="theme"
                value={option}
                checked={preference === option}
                onChange={() => setThemePreference(option)}
                className="peer sr-only"
              />
              <span className={cn(segmentItem, segmentChecked)}>
                {themeLabels[option]}
              </span>
            </label>
          ))}
      </div>
    </div>
  );
}
