import { Chip } from "@/components/stride/chip";
import { Widget } from "@/components/stride/widget";
import { cn } from "@/lib/utils";
import { ProvenanceLabel } from "@/components/stride/provenance";
import {
  activityTitle,
  detailMetrics,
  formatActivityDate,
  formatDuration,
} from "@/features/activities/activities";
import { formatLocalDate } from "@/features/app-shell/shell";
import {
  curveHeight,
  curveWidth,
  formatClock,
  type HeartRateCurve,
} from "../charts";
import { effortStats, lapTable } from "../detail";
import type { ActivityPanelView } from "../panel";
import { ActivityData } from "./activity-data";
import { LapTableSection } from "./lap-table";
import { SplitsSection } from "./splits-section";
import { PlanCard } from "./plan-card";

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function strengthMetrics(activity: ActivityPanelView["activity"]) {
  const items: { key: string; label: string; value: string; unit?: string }[] =
    [];
  if (activity.durationSeconds)
    items.push({
      key: "duration",
      label: "Durée",
      value: formatDuration(activity.durationSeconds),
    });
  if (activity.averageHeartRate)
    items.push({
      key: "heartRate",
      label: "FC moy.",
      value: integer.format(activity.averageHeartRate),
      unit: "bpm",
    });
  if (activity.maxHeartRate)
    items.push({
      key: "maxHeartRate",
      label: "FC max",
      value: integer.format(activity.maxHeartRate),
      unit: "bpm",
    });
  if (activity.calories)
    items.push({
      key: "calories",
      label: "Calories",
      value: integer.format(activity.calories),
      unit: "kcal",
    });
  return items;
}

function HeaderMetrics({ panel }: { panel: ActivityPanelView }) {
  const { activity } = panel;
  const metrics = panel.card.strength
    ? strengthMetrics(activity)
    : [
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
  if (metrics.length === 0)
    return (
      <p className="text-body text-secondary-foreground">
        Garmin n’a transmis aucune mesure pour cette activité.
      </p>
    );
  return (
    <dl
      className="grid grid-cols-3 gap-x-4 gap-y-3 border-y border-border py-3.5 sm:grid-cols-[repeat(var(--metric-count),minmax(0,1fr))]"
      style={{ "--metric-count": metrics.length } as React.CSSProperties}
    >
      {metrics.map((metric) => (
        <div key={metric.key} className="flex min-w-0 flex-col-reverse gap-0.5">
          <dt className="text-label text-secondary-foreground">
            {metric.label}
          </dt>
          <dd>
            <span
              data-slot="metric"
              className="text-title font-semibold whitespace-nowrap tabular-nums"
            >
              {metric.value}
              {metric.unit && (
                <span className="ml-1 text-body font-normal text-secondary-foreground">
                  {metric.unit}
                </span>
              )}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const panelHeading = "text-label font-medium text-muted-foreground";
const panelSection =
  "flex flex-col gap-2.5 border-b border-border py-4.5 last:border-b-0";

function ZoneTime({ panel }: { panel: ActivityPanelView }) {
  const zones = panel.view.zoneTime;
  if (!zones) return null;
  const total = zones.reduce((sum, item) => sum + item.seconds, 0);
  return (
    <section aria-labelledby="activity-zones" className={panelSection}>
      <h2 id="activity-zones" className={panelHeading}>
        Temps dans les zones
      </h2>
      {zones.map(({ zone, seconds }) => (
        <div
          key={zone}
          className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem] items-center gap-2.5"
        >
          <span className="text-secondary-foreground">Z{zone}</span>
          <span className="h-1.5 overflow-hidden rounded-mark bg-muted">
            <span
              className="block h-full rounded-mark"
              style={{
                width: `${total > 0 ? (seconds / total) * 100 : 0}%`,
                background: `var(--intensity-${zone})`,
              }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">
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
    <section aria-labelledby="activity-effort" className={panelSection}>
      <h2 id="activity-effort" className={panelHeading}>
        Effort
      </h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-border">
        {stats.map((stat) => (
          <div key={stat.key} className="contents">
            <dt className="border-b border-border py-2 text-secondary-foreground">
              {stat.label}
            </dt>
            <dd className="border-b border-border py-2 text-right font-semibold tabular-nums">
              {stat.value}
              {stat.unit && ` ${stat.unit}`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StrengthHeartRate({ curve }: { curve: HeartRateCurve }) {
  return (
    <Widget
      aria-labelledby="activity-heart-rate"
      headingLevel={2}
      title={<span id="activity-heart-rate">Fréquence cardiaque</span>}
      verdict={
        <span className="text-label font-normal text-muted-foreground">
          bpm · Garmin
        </span>
      }
    >
      <div className="flex flex-col gap-2.5">
        <svg
          role="img"
          aria-label={`Fréquence cardiaque au fil de la séance, moyenne ${curve.average}, pic à ${curve.peak}`}
          viewBox={`0 0 ${curveWidth} ${curveHeight}`}
          preserveAspectRatio="none"
          className="block h-30 w-full sm:h-37.5"
        >
          <line
            x1={0}
            x2={curveWidth}
            y1={curve.averageY}
            y2={curve.averageY}
            className="stroke-control-border"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={curve.path}
            fill="none"
            className="stroke-destructive"
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="flex justify-between pt-1 text-label text-muted-foreground tabular-nums">
          <span>0:00</span>
          <span>moy. {curve.average}</span>
          <span>{curve.duration}</span>
        </div>
        <ProvenanceLabel source="provider">
          Ni allure ni zones pour le renfo : l’effort ressenti compte davantage
        </ProvenanceLabel>
      </div>
    </Widget>
  );
}

const strengthEffortKeys = ["calories", "aerobic", "maxHeartRate", "anaerobic"];

function strengthEffortStats(activity: ActivityPanelView["activity"]) {
  return effortStats(activity)
    .filter((stat) => strengthEffortKeys.includes(stat.key))
    .sort(
      (a, b) =>
        strengthEffortKeys.indexOf(a.key) - strengthEffortKeys.indexOf(b.key),
    );
}

function StrengthEffort({ panel }: { panel: ActivityPanelView }) {
  const stats = strengthEffortStats(panel.activity);
  if (stats.length === 0) return null;
  return (
    <section aria-labelledby="activity-effort" className={panelSection}>
      <h2 id="activity-effort" className={panelHeading}>
        Effort
      </h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-border">
        {stats.map((stat) => (
          <div key={stat.key} className="contents">
            <dt className="border-b border-border py-2 text-secondary-foreground">
              {stat.label}
            </dt>
            <dd className="border-b border-border py-2 text-right font-semibold tabular-nums">
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
  today,
  pair = null,
}: {
  panel: ActivityPanelView;
  today: string;
  pair?: React.ReactNode;
}) {
  const { activity, card } = panel;
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
  const effort = card.strength
    ? strengthEffortStats(activity).length > 0
    : effortStats(activity, card.feeling).length > 0;
  const planned = card.kind === "planned";
  const aside = zones || effort || pair;
  return (
    <div className="flex flex-col pb-18 md:pb-6 xl:flex-row xl:items-start">
      <article className="flex min-w-0 flex-1 flex-col gap-4.5 px-4 pt-4.5 md:px-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0 rounded-full border-[1.5px]",
                planned
                  ? "border-primary bg-primary"
                  : "border-muted-foreground",
              )}
            />
            <h1 className="min-w-0 text-verdict font-semibold text-balance break-words">
              {title}
            </h1>
            {card.kind === "unplanned" && card.inPlan && <Chip>Hors plan</Chip>}
            <span className="text-label text-muted-foreground max-sm:basis-full sm:ml-auto">
              {kicker.join(" · ")}
            </span>
          </div>
          <HeaderMetrics panel={panel} />
        </header>
        <PlanCard card={card} />
        {card.strength ? (
          panel.view.heartRate && (
            <StrengthHeartRate curve={panel.view.heartRate} />
          )
        ) : panel.view.route || panel.view.charts ? (
          <ActivityData
            key={`data:${activity.id}`}
            route={panel.view.route}
            charts={panel.view.charts}
          />
        ) : (
          <Widget headingLevel={2} title="Parcours" aria-label="Parcours">
            <p className="text-body text-secondary-foreground">
              Aucun tracé GPS n’est disponible pour cette activité.
            </p>
          </Widget>
        )}
        {!card.strength &&
          (panel.view.splits ? (
            <SplitsSection splits={panel.view.splits} laps={laps} />
          ) : (
            laps && <LapTableSection table={laps} />
          ))}
        <ProvenanceLabel source="provider">
          {imported
            ? `Garmin · détail importé le ${imported}`
            : "Garmin · données importées"}
        </ProvenanceLabel>
      </article>
      {aside && (
        <aside
          aria-label="Détails de l’activité"
          className="flex flex-col px-4 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
        >
          {pair && <div className={panelSection}>{pair}</div>}
          {card.strength ? (
            <StrengthEffort panel={panel} />
          ) : (
            <>
              <ZoneTime panel={panel} />
              <Effort panel={panel} />
            </>
          )}
        </aside>
      )}
    </div>
  );
}
