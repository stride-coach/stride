"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { SelectedDecision } from "@/features/coach/decisions";
import { DecisionResponseState } from "./decision-response";

const listHref = "/coach/decisions";

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 border-b border-border py-2 first:border-t">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Step({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const className = "size-8 max-sm:size-11";
  return href ? (
    <Button asChild variant="outline" size="icon" className={className}>
      <Link
        href={`${listHref}?decision=${href}`}
        replace
        scroll={false}
        prefetch={false}
        aria-label={label}
      >
        {children}
      </Link>
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      className={className}
      disabled
      aria-label={label}
    >
      {children}
    </Button>
  );
}

export function DecisionSheet({ selected }: { selected: SelectedDecision }) {
  const router = useRouter();
  const mobile = useIsMobile();
  const { entry } = selected;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.replace(listHref, { scroll: false });
      }}
    >
      <SheetContent
        side={mobile ? "bottom" : "right"}
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const links = document.querySelectorAll<HTMLElement>(
            `[data-decision-id="${CSS.escape(entry.id)}"]`,
          );
          [...links].find((link) => link.offsetParent !== null)?.focus();
        }}
        className={cn(
          "gap-0 overflow-hidden border-control-border bg-background text-foreground",
          mobile
            ? "data-[side=bottom]:top-14.5 data-[side=bottom]:rounded-t-2xl"
            : "rounded-2xl border shadow-float data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-125 data-[side=right]:max-w-[calc(100vw-1rem)] data-[side=right]:sm:max-w-125",
        )}
      >
        <header className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
          <span className="font-semibold whitespace-nowrap">{entry.day}</span>
          <span className="min-w-0 truncate text-secondary-foreground">
            Décision {selected.position} sur {selected.total} en{" "}
            {selected.monthLabel}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Step href={selected.previousId} label="Décision précédente">
              <ChevronLeftIcon aria-hidden="true" />
            </Step>
            <Step href={selected.nextId} label="Décision suivante">
              <ChevronRightIcon aria-hidden="true" />
            </Step>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="max-sm:h-11">
                Fermer <Kbd className="max-sm:hidden">Échap</Kbd>
              </Button>
            </SheetClose>
          </span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <SheetTitle className="text-verdict">{entry.title}</SheetTitle>
              <DecisionResponseState response={entry.response} />
            </div>
            {entry.paragraph ? (
              <SheetDescription className="max-w-105 text-body-lg text-secondary-foreground">
                {entry.paragraph}
              </SheetDescription>
            ) : (
              <SheetDescription className="sr-only">
                Détail de la décision
              </SheetDescription>
            )}
          </div>
          <dl className="flex flex-col">
            <Field label="Proposée par">{entry.proposedBy}</Field>
            <Field label="Proposée le">{entry.proposedAt}</Field>
            <Field label="Ta réponse">{entry.answer}</Field>
            {entry.change && <Field label="Changement">{entry.change}</Field>}
            {entry.version && (
              <Field label="Version du plan">{entry.version}</Field>
            )}
          </dl>
          <section
            aria-labelledby="decision-outcome"
            className="flex flex-col gap-1.5"
          >
            <h3
              id="decision-outcome"
              className="text-label font-medium text-muted-foreground"
            >
              Ce que ça a donné
            </h3>
            <p className="text-secondary-foreground">{entry.outcome}</p>
          </section>
        </div>
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {entry.exchangeHref && (
            <Button asChild variant="outline" size="md" className="max-sm:h-11">
              <Link href={entry.exchangeHref} prefetch={false}>
                Voir l’échange
              </Link>
            </Button>
          )}
          {entry.sessionHref && (
            <Button asChild variant="outline" size="md" className="max-sm:h-11">
              <Link href={entry.sessionHref} prefetch={false}>
                Voir la séance
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="ghost"
            size="md"
            className="ml-auto max-sm:h-11"
          >
            <Link href={entry.discussHref} prefetch={false}>
              En reparler au staff
            </Link>
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
