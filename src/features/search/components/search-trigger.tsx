"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export const openSearchEvent = "stride:open-search";

export function openSearch() {
  window.dispatchEvent(new Event(openSearchEvent));
}

function subscribe() {
  return () => {};
}

export function useModifierLabel() {
  return React.useSyncExternalStore(
    subscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  const modifier = useModifierLabel();
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "flex h-7.5 w-85 items-center gap-2 rounded-lg border border-control-border bg-background px-2.5 text-body text-muted-foreground transition-colors duration-150 ease-stride hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <SearchIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">Rechercher une séance, une course…</span>
      <Kbd className="ml-auto whitespace-nowrap">{`${modifier}K`}</Kbd>
    </button>
  );
}

export function MobileSearchButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openSearch}
      aria-haspopup="dialog"
      aria-label="Rechercher dans Stride"
      className="size-10 text-secondary-foreground"
    >
      <SearchIcon className="size-4.5" />
    </Button>
  );
}
