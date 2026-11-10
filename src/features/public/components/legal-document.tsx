import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { MonoLabel } from "@/components/stride/mono-label";
import {
  legalPages,
  legalUpdatedOn,
  type LegalHref,
} from "@/features/public/publisher";
import { cn } from "@/lib/utils";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export type LegalSection = {
  id: string;
  title: string;
  toc?: string;
  content: ReactNode;
};

function Contents({ sections }: { sections: readonly LegalSection[] }) {
  return sections.map((section) => (
    <li key={section.id}>
      <a
        href={`#${section.id}`}
        className="block border-l border-border py-1.75 pl-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
      >
        {section.toc ?? section.title}
      </a>
    </li>
  ));
}

export function LegalDocument({
  current,
  title,
  intro,
  sections,
}: {
  current: LegalHref;
  title: string;
  intro?: string;
  sections: readonly LegalSection[];
}) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex max-w-300 flex-col gap-7 px-4 pt-6 pb-14 md:gap-12 md:px-10 md:pt-14 md:pb-28">
        <div className="flex flex-col gap-4 md:gap-5.5 md:border-b md:border-border-subtle md:pb-9">
          <nav
            aria-label="Documents légaux"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
          >
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                aria-current={page.href === current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-lg px-3 text-sm whitespace-nowrap text-secondary-foreground hover:text-foreground md:px-3.5",
                  page.href === current && "bg-muted text-foreground",
                )}
              >
                <span className="md:hidden">{page.short}</span>
                <span className="hidden md:inline">{page.label}</span>
              </Link>
            ))}
          </nav>
          <h1 className="text-4xl leading-none font-semibold tracking-[-0.035em] md:text-[clamp(36px,4.2vw,56px)]">
            {title}
          </h1>
          {intro && (
            <p className="hidden max-w-180 text-lead leading-relaxed text-secondary-foreground md:block">
              {intro}
            </p>
          )}
          <MonoLabel>Dernière mise à jour · {legalUpdatedOn}</MonoLabel>
          <details className="group rounded-lg border border-border-strong bg-card md:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-lg px-3.5 text-[15px] [&::-webkit-details-marker]:hidden">
              Sommaire
              <ChevronDownIcon
                aria-hidden="true"
                className="size-3.5 text-secondary-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <ol className="px-3.5 pb-3">
              <Contents sections={sections} />
            </ol>
          </details>
        </div>

        <div className="grid items-start gap-16 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label="Sommaire"
            className="sticky top-25 hidden flex-col gap-2.5 md:flex"
          >
            <MonoLabel>Sommaire</MonoLabel>
            <ol>
              <Contents sections={sections} />
            </ol>
          </nav>
          <article className="flex max-w-180 flex-col gap-7 md:gap-11">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="flex scroll-mt-20 flex-col gap-3 md:scroll-mt-24 md:gap-3.5"
              >
                <h2
                  id={`${section.id}-title`}
                  className="flex items-baseline gap-3 text-[19px] font-semibold tracking-[-0.015em] md:gap-3.5 md:text-title"
                >
                  <span className="w-5.5 flex-none font-metric text-lg font-semibold text-muted-foreground md:w-7 md:text-xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-secondary-foreground md:text-base md:leading-[1.65] [&_a]:text-primary [&_a]:hover:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

export function LegalTable({
  head,
  rows,
}: {
  head: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="border-b border-border-strong pr-3 pb-2.5 text-left font-mono text-micro font-medium text-muted-foreground uppercase"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "border-b border-border py-3 pr-3 align-top leading-normal",
                    cellIndex === 0 && "text-foreground",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalFacts({
  facts,
}: {
  facts: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <dl className="flex flex-col border-t border-border">
      {facts.map(([term, value]) => (
        <div
          key={term}
          className="flex flex-col gap-0.5 border-b border-border py-2.5 md:grid md:grid-cols-[200px_1fr] md:gap-4"
        >
          <MonoLabel asChild size="micro">
            <dt>{term}</dt>
          </MonoLabel>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
