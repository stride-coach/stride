"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useCoachRequestHref } from "@/features/coach/components/coach-context";
import {
  DataActivityLink as Link,
  useDataActivityNavigation,
} from "@/features/data-activity/components/navigation";
import { useModifierLabel } from "@/features/search/components/search-trigger";

function AskCoachLink({ href }: { href: string }) {
  const modifier = useModifierLabel();
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href} aria-keyshortcuts="Meta+J Control+J">
        Demander au coach
        <Kbd className="whitespace-nowrap max-lg:hidden">{`${modifier}J`}</Kbd>
      </Link>
    </Button>
  );
}

export function AskCoachButton({ fallback = false }: { fallback?: boolean }) {
  if (fallback) return <AskCoachLink href="/coach" />;
  return <ContextualAskCoach />;
}

function ContextualAskCoach() {
  const href = useCoachRequestHref();
  const navigate = useDataActivityNavigation();
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
      navigate(href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, href]);
  return <AskCoachLink href={href} />;
}
