"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
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
        className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5 max-sm:w-full"
      >
        {themePreferences
          .toSorted((a, b) =>
            a === "system" ? -1 : b === "system" ? 1 : a === "light" ? -1 : 1,
          )
          .map((option) => {
            const checked = preference === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setThemePreference(option)}
                className={cn(
                  "flex min-h-control-touch items-center justify-center rounded-md px-2.5 whitespace-nowrap transition-colors duration-150 ease-stride max-sm:flex-1 md:min-h-6",
                  checked
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {themeLabels[option]}
              </button>
            );
          })}
      </div>
    </div>
  );
}
