import { PlusIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import type { RaceProgram } from "@/features/plans/view/program";

function programHref(program: RaceProgram, primary: boolean) {
  return primary || !program.raceId ? "/plan" : `/plan?race=${program.raceId}`;
}

export function ProgramTabs({
  programs,
  active,
}: {
  programs: RaceProgram[];
  active: RaceProgram;
}) {
  const tabs = programs.filter((program) => program.tab !== null);
  if (tabs.length === 0) return null;
  return (
    <nav
      aria-label="Programmes"
      className="flex min-w-0 gap-1.5 overflow-x-auto"
    >
      {tabs.map((program, index) => {
        const tab = program.tab!;
        const current = program === active;
        return (
          <Link
            key={program.raceId ?? "plan"}
            href={programHref(program, index === 0)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-control-auto shrink-0 items-center gap-2 rounded-md border px-2.5 transition-colors duration-150 ease-stride",
              current
                ? "border-transparent bg-muted"
                : "border-control-border hover:border-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4.5 shrink-0 place-items-center rounded-sm text-micro font-bold tabular-nums",
                tab.primary
                  ? "bg-primary text-primary-foreground"
                  : "border-[1.5px] border-muted-foreground text-secondary-foreground",
              )}
            >
              {tab.letter}
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span
                className={cn(
                  "font-medium whitespace-nowrap",
                  current ? "text-foreground" : "text-secondary-foreground",
                )}
              >
                <span className="sr-only">Course {tab.letter} · </span>
                {tab.name}
              </span>
              {tab.when && (
                <span className="text-label whitespace-nowrap text-muted-foreground">
                  {tab.when}
                </span>
              )}
            </span>
            {tab.detail && (
              <span
                className={cn(
                  "text-label whitespace-nowrap max-lg:hidden",
                  current
                    ? "text-secondary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {tab.detail}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href="/races"
        aria-label="Nouveau programme"
        className="grid size-control-auto shrink-0 place-items-center rounded-md border border-dashed border-control-border text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </Link>
    </nav>
  );
}

export function ProgramHeader({
  program,
  eyebrow = program.eyebrow,
}: {
  program: RaceProgram;
  eyebrow?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-label font-medium text-muted-foreground">
          {eyebrow}
        </span>
        <p className="text-title font-semibold text-balance">{program.title}</p>
        {program.summary && (
          <p className="text-secondary-foreground">{program.summary}</p>
        )}
      </div>
      <dl className="flex flex-col">
        {program.kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5"
          >
            <dt className="text-muted-foreground">{kpi.label}</dt>
            <dd className="font-semibold tabular-nums">{kpi.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
