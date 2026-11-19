import { ChevronRightIcon } from "lucide-react";
import { SeasonBadge } from "@/features/app-shell/components/season-menu";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import type {
  ProgramKpi,
  ProgramSeasonLink,
  SeasonProgram,
} from "@/features/plans/view/program";

export function ProgramHeader({
  program,
  compact = false,
}: {
  program: SeasonProgram;
  compact?: boolean;
}) {
  const { position } = program;
  if (compact)
    return (
      <section className="flex flex-col gap-1.5">
        <p className="font-semibold">{program.title}</p>
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5 tabular-nums">
          {program.kpis.map((kpi) => (
            <div key={kpi.key} className="flex items-baseline gap-1.5">
              <dd className="font-semibold">{kpi.value}</dd>
              <dt className="text-label text-muted-foreground">
                {kpi.detail ?? kpi.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>
    );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-label font-medium text-muted-foreground">
          {position
            ? program.letter
              ? `Programme · objectif ${program.letter}`
              : "Programme"
            : program.eyebrow}
        </span>
        <p className="text-title font-semibold text-balance">{program.title}</p>
      </div>
      <dl className="flex flex-col">
        {program.kpis.slice(0, 1).map((kpi) => (
          <KpiRow key={kpi.key} kpi={kpi} />
        ))}
        {position && (
          <>
            <RailRow label="Phase">
              <span className="min-w-0 truncate font-semibold">
                {position.phase.name}
              </span>
              <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                {position.phase.detail}
              </span>
            </RailRow>
            <RailRow label="Avancement">
              <span className="font-semibold">S{position.step.number}</span>
              <span className="text-muted-foreground">
                / {position.step.total}
              </span>
              <span
                aria-hidden="true"
                className="h-1 min-w-0 flex-1 overflow-hidden rounded-mark bg-border"
              >
                <span
                  className="block h-full bg-primary"
                  style={{ width: `${position.step.pct}%` }}
                />
              </span>
            </RailRow>
          </>
        )}
        {program.kpis.slice(1).map((kpi) => (
          <KpiRow key={kpi.key} kpi={kpi} />
        ))}
      </dl>
    </section>
  );
}

function RailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-baseline gap-2 tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function KpiRow({ kpi }: { kpi: ProgramKpi }) {
  return (
    <RailRow label={kpi.label}>
      <span className="font-semibold">{kpi.value}</span>
      {kpi.detail && (
        <span className="truncate text-muted-foreground">{kpi.detail}</span>
      )}
    </RailRow>
  );
}

export function NextSeason({ season }: { season: ProgramSeasonLink }) {
  return (
    <section aria-labelledby="next-season" className="flex flex-col gap-2">
      <h2
        id="next-season"
        className="text-label font-medium text-muted-foreground"
      >
        Saison suivante
      </h2>
      <Link
        href={season.href}
        className="flex min-h-11 items-center gap-2.5 rounded-lg border border-control-border bg-card p-2.5 transition-colors duration-150 ease-stride hover:border-muted-foreground"
      >
        <SeasonBadge season={season} />
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-medium">{season.name}</span>
          <span className="truncate text-label text-muted-foreground tabular-nums">
            {season.detail}
          </span>
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className="ml-auto size-3.5 shrink-0 text-muted-foreground"
        />
      </Link>
    </section>
  );
}
