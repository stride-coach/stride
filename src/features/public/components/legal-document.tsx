import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
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
  return sections.map((section, index) => (
    <li key={section.id}>
      <a
        href={`#${section.id}`}
        className="flex min-h-control-touch items-center rounded-md px-2 text-secondary-foreground hover:bg-muted hover:text-foreground md:min-h-control"
      >
        {index + 1}. {section.toc ?? section.title}
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
      <main className="relative mx-auto grid max-w-300 items-start gap-8 px-4 pt-6 pb-14 md:grid-cols-[256px_minmax(0,1fr)] md:gap-16 md:px-10 md:pt-10 md:pb-24">
        <div className="flex flex-col gap-4 md:sticky md:top-20">
          <nav
            aria-label="Documents légaux"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0.5 md:px-0"
          >
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                aria-current={page.href === current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-control-touch shrink-0 items-center rounded-md px-2 whitespace-nowrap text-secondary-foreground hover:text-foreground md:min-h-control",
                  page.href === current &&
                    "bg-muted font-medium text-foreground",
                )}
              >
                <span className="md:hidden">{page.short}</span>
                <span className="hidden md:inline">{page.label}</span>
              </Link>
            ))}
          </nav>
          <nav
            aria-label="Sommaire"
            className="hidden flex-col gap-1 border-t border-border pt-4 md:flex"
          >
            <p className="px-2 text-label font-medium text-muted-foreground">
              Sommaire
            </p>
            <ol>
              <Contents sections={sections} />
            </ol>
          </nav>
        </div>

        <div className="flex max-w-170 min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-semibold text-balance">{title}</h1>
            {intro && (
              <p className="text-body-lg text-pretty text-secondary-foreground">
                {intro}
              </p>
            )}
            <p className="text-label text-muted-foreground">
              Dernière mise à jour · {legalUpdatedOn}
            </p>
          </div>
          <details className="group rounded-lg border border-control-border bg-card md:hidden">
            <summary className="flex min-h-control-touch cursor-pointer list-none items-center justify-between rounded-lg px-3.5 font-medium [&::-webkit-details-marker]:hidden">
              Sommaire
              <ChevronDownIcon
                aria-hidden="true"
                className="size-3.5 text-secondary-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <ol className="px-1.5 pb-2">
              <Contents sections={sections} />
            </ol>
          </details>
          <article className="flex flex-col gap-8">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="flex scroll-mt-20 flex-col gap-3"
              >
                <h2
                  id={`${section.id}-title`}
                  className="text-verdict font-semibold"
                >
                  {index + 1}. {section.title}
                </h2>
                <div className="flex flex-col gap-3 text-body-lg text-secondary-foreground [&_a]:text-primary [&_a]:hover:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
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
      <table className="w-full border-collapse text-body">
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="border-b border-control-border pr-3 pb-2.5 text-left text-label font-medium text-muted-foreground tabular-nums"
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
                    "border-b border-border py-3 pr-3 align-top",
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
          <dt className="text-label text-muted-foreground">{term}</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
