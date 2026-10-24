import { Metric } from "@/components/stride/metric";
import { MonoLabel } from "@/components/stride/mono-label";
import { cn } from "@/lib/utils";
import { ProvenanceLabel } from "@/components/stride/provenance";
import {
  activityTitle,
  detailMetrics,
  formatActivityDate,
} from "@/features/activities/activities";
import { formatLocalDate } from "@/features/app-shell/shell";
import { formatClock } from "../charts";
import { effortStats, lapTable } from "../detail";
import type { ActivityPanelView } from "../panel";
import { ActivityData } from "./activity-data";
import { LapTableSection } from "./lap-table";
import { PlanCard } from "./plan-card";

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function HeaderMetrics({ panel }: { panel: ActivityPanelView }) {
  const { activity } = panel;
  const metrics = [
    ...detailMetrics(activity),
    ...(activity.averagePowerWatts !== null
      ? [
          {
            key: "power",
            label: "Puissance",
            value: integer.format(activity.averagePowerWatts),
            unit: "W",
          },
        ]
      : []),
  ];
  const columns = metrics.length <= 4 ? 2 : 3;
  if (metrics.length === 0)
    return (
      <p className="text-body text-muted">
        Garmin n’a transmis aucune mesure pour cette activité.
      </p>
    );
  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-[repeat(var(--metric-count),minmax(0,1fr))]",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
      style={{ "--metric-count": metrics.length } as React.CSSProperties}
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.key}
          className={cn(
            "flex min-w-0 flex-col-reverse gap-0.75 bg-surface px-3 py-2.5 sm:col-span-1",
            index === metrics.length - 1 &&
              metrics.length % columns !== 0 &&
              "col-span-2",
          )}
        >
          <MonoLabel size="nano" asChild>
            <dt>{metric.label}</dt>
          </MonoLabel>
          <dd>
            <Metric
              className="text-[22px] leading-none sm:text-[26px]"
              value={metric.value}
              unit={
                metric.unit && (
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-[13px]">
                    {metric.unit}
                  </span>
                )
              }
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ZoneTime({ panel }: { panel: ActivityPanelView }) {
  const zones = panel.view.zoneTime;
  if (!zones) return null;
  const total = zones.reduce((sum, item) => sum + item.seconds, 0);
  return (
    <section aria-labelledby="activity-zones" className="flex flex-col gap-2.5">
      <MonoLabel asChild>
        <h2 id="activity-zones">Temps dans les zones</h2>
      </MonoLabel>
      {zones.map(({ zone, seconds }) => (
        <div
          key={zone}
          className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem] items-center gap-2.5"
        >
          <MonoLabel>Z{zone}</MonoLabel>
          <span className="h-2 overflow-hidden rounded-mark bg-surface-raised">
            <span
              className="block h-full rounded-mark"
              style={{
                width: `${total > 0 ? (seconds / total) * 100 : 0}%`,
                background: `var(--zone-${zone})`,
              }}
            />
          </span>
          <span className="text-right font-metric text-[15px] font-semibold tabular-nums">
            {formatClock(seconds)}
          </span>
        </div>
      ))}
      <ProvenanceLabel source="estimate">
        {panel.zoneMethod === "karvonen"
          ? "Estimation Stride · zones selon ta réserve cardiaque"
          : "Estimation Stride · zones selon ta FC maximale"}
      </ProvenanceLabel>
    </section>
  );
}

function Effort({ panel }: { panel: ActivityPanelView }) {
  const stats = effortStats(panel.activity, panel.card.feeling);
  if (stats.length === 0) return null;
  return (
    <section
      aria-labelledby="activity-effort"
      className="flex flex-col gap-2.5"
    >
      <MonoLabel asChild>
        <h2 id="activity-effort">Effort</h2>
      </MonoLabel>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-border">
        {stats.map((stat) => (
          <div key={stat.key} className="contents">
            <dt className="border-b border-border py-2.75 text-sm">
              {stat.label}
            </dt>
            <dd className="border-b border-border py-2.75 text-right font-metric text-lg font-semibold tabular-nums">
              {stat.value}
              {stat.unit && ` ${stat.unit}`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ActivityDetail({
  panel,
  current,
  today,
  pair = null,
}: {
  panel: ActivityPanelView;
  current: boolean;
  today: string;
  pair?: React.ReactNode;
}) {
  const Heading = current ? "h1" : "h2";
  const { activity } = panel;
  const title = activityTitle(activity);
  const kicker = [
    formatActivityDate(activity.date, today),
    activity.localTime,
    activity.routeName && !title.includes(activity.routeName)
      ? activity.routeName
      : null,
  ].filter(Boolean);
  const laps = lapTable(activity, panel.segments);
  const imported = formatLocalDate(activity.detailImportedAt);
  const zones = panel.view.zoneTime !== null;
  const effort = effortStats(activity, panel.card.feeling).length > 0;
  return (
    <article className="flex w-full max-w-240 flex-col gap-5 px-5 pt-3 pb-12 sm:gap-6 sm:pt-8 lg:px-10 2xl:mx-auto 2xl:max-w-360">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <MonoLabel>{kicker.join(" · ")}</MonoLabel>
          <Heading className="min-w-0 text-[28px] leading-none font-semibold tracking-[-0.03em] text-balance break-words sm:text-[2.375rem]">
            {title}
          </Heading>
        </div>
        <HeaderMetrics panel={panel} />
        {pair}
      </header>
      <PlanCard card={panel.card} />
      {panel.view.route || panel.view.charts ? (
        <ActivityData
          key={`data:${activity.id}`}
          route={panel.view.route}
          charts={panel.view.charts}
        />
      ) : (
        <section
          aria-label="Parcours"
          className="rounded-card border border-border bg-surface px-4 py-5"
        >
          <MonoLabel>Parcours</MonoLabel>
          <p className="mt-2 text-body text-muted">
            Aucun tracé GPS n’est disponible pour cette activité.
          </p>
        </section>
      )}
      {laps && <LapTableSection table={laps} />}
      {(zones || effort) && (
        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
          <ZoneTime panel={panel} />
          <Effort panel={panel} />
        </div>
      )}
      <ProvenanceLabel source="provider">
        {imported
          ? `Garmin · détail importé le ${imported}`
          : "Garmin · données importées"}
      </ProvenanceLabel>
    </article>
  );
}
