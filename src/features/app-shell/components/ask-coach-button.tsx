"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useCoachRequestHref } from "@/features/coach/components/coach-context";
import { opensQuickAsk } from "@/features/coach/quick-ask";
import {
  DataActivityLink as Link,
  useDataActivityNavigation,
} from "@/features/data-activity/components/navigation";
import { useModifierLabel } from "@/features/search/components/search-trigger";
import { useRequestQuickAsk } from "./quick-ask";

const shortcuts = "Meta+J Control+J";

function Shortcut() {
  const modifier = useModifierLabel();
  return (
    <Kbd className="whitespace-nowrap max-lg:hidden">{`${modifier}J`}</Kbd>
  );
}

function AskCoachLink({ href }: { href: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href} aria-keyshortcuts={shortcuts}>
        Demander au coach
        <Shortcut />
      </Link>
    </Button>
  );
}

export function AskCoachButton({ fallback = false }: { fallback?: boolean }) {
  if (fallback) return <AskCoachLink href="/coach" />;
  return <ContextualAskCoach />;
}

const subscribeNothing = () => () => {};

function ContextualAskCoach() {
  const contextualHref = useCoachRequestHref();
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const href = hydrated ? contextualHref : "/coach";
  const navigate = useDataActivityNavigation();
  const pathname = usePathname();
  const request = useRequestQuickAsk();
  const inPlace = request !== null && opensQuickAsk(pathname);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey ||
        event.key.toLowerCase() !== "j"
      )
        return;
      event.preventDefault();
      if (inPlace) request();
      else navigate(href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, href, inPlace, request]);
  if (!inPlace) return <AskCoachLink href={href} />;
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-keyshortcuts={shortcuts}
      aria-haspopup="dialog"
      onClick={request}
    >
      Demander au coach
      <Shortcut />
    </Button>
  );
}
