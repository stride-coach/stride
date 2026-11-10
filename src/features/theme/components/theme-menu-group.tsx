"use client";

import { useId } from "react";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { parseThemePreference, themeLabels, themePreferences } from "../model";
import { setThemePreference, useThemePreference } from "./theme-store";

export function ThemeMenuGroup() {
  const preference = useThemePreference();
  const labelId = useId();
  return (
    <div className="flex items-center gap-2 px-2.5 py-1">
      <span id={labelId}>Thème</span>
      <DropdownMenuRadioGroup
        aria-labelledby={labelId}
        value={preference}
        onValueChange={(value) =>
          setThemePreference(parseThemePreference(value))
        }
        className="ml-auto flex items-center gap-0.5 rounded-lg border border-border p-0.5"
      >
        {themePreferences.map((option) => (
          <DropdownMenuRadioItem
            key={option}
            value={option}
            className="min-h-6 rounded-md px-2 py-0 font-medium text-muted-foreground focus:bg-muted data-[state=checked]:bg-muted data-[state=checked]:text-foreground [&>span:first-child]:hidden"
          >
            {themeLabels[option]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </div>
  );
}
