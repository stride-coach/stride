import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { ChartInspector } from "@/components/stride/chart-inspector";
import { Status, type StatusLevel } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BodyKpi,
  BodyNights,
  ReadinessAdvice,
  ReadinessFactor,
  ReadinessSummary,
  TodaySession,
} from "../body";
import { lighterSessionHref, sessionHref } from "../body";
import { formatInteger } from "../format";
import type { HealthRange } from "../health";
import type { RecoveryView } from "../recovery-view";
import { formatSleep } from "../recovery-view";
import { Legend, nightTitle, RangeChart } from "./charts";
import { PanelSection, WidgetEmpty } from "./health-frame";

const value = "font-semibold whitespace-nowrap tabular-nums";

const summaryLevels: Record<ReadinessSummary["tone"], StatusLevel> = {
  success: "ok",
  warning: "watch",
  danger: "alert",
};

export function ReadinessPanel({
  id,
  summary,
  advice,
  session,
}: {
  id: string;
  summary: ReadinessSummary | null;
  advice: ReadinessAdvice | null;
  session: TodaySession | null;
}) {
  const planHref = session ? sessionHref(session) : null;
  const lighterHref = session ? lighterSessionHref(session) : null;
  return (
    <PanelSection id={id} title="Forme du jour">
      {summary ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <span data-slot="metric" className={cn("text-metric", value)}>
              {formatInteger(summary.score)}
            </span>
            <Status level={summaryLevels[summary.tone]}>{summary.level}</Status>
          </div>
          <p className="text-label text-muted-foreground">
            {summary.gap ? `${summary.gap} · ` : ""}Disponibilité Garmin + ton
            ressenti
          </p>
        </div>
      ) : (
        <p className="text-body text-muted-foreground">
          Garmin n’a pas transmis de disponibilité pour aujourd’hui.
        </p>
      )}
      {advice &&
        (session && planHref ? (
          <Link
            href={planHref}
            className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors duration-150 ease-stride hover:border-control-border"
          >
            <span className="text-label text-muted-foreground">
              Séance du jour
            </span>
            <span className="font-medium">{session.title}</span>
            <span className="text-body text-secondary-foreground">
              {advice.text}
            </span>
          </Link>
        ) : (
          <p className="text-body text-secondary-foreground">{advice.text}</p>
        ))}
      {session && planHref && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={planHref}>Voir la séance</Link>
          </Button>
          {advice?.lighter && lighterHref && (
            <Button asChild variant="outline">
              <Link href={lighterHref}>Version allégée</Link>
            </Button>
          )}
        </div>
      )}
    </PanelSection>
  );
}

const factorTones = {
  danger: "text-destructive",
  warning: "text-warning",
  muted: "text-secondary-foreground",
  success: "text-primary",
} as const;

export function FactorsSection({
  factors,
  className,
}: {
  factors: ReadinessFactor[];
  className?: string;
}) {
  return (
    <Widget
      headingLevel={2}
      title={<span id="body-factors">Ce qui pèse aujourd’hui</span>}
      aria-labelledby="body-factors"
      className={className}
    >
      {factors.length ? (
        <ul className="flex flex-col">
          {factors.map((factor) => (
            <li
              key={factor.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0"
            >
              <span className="font-medium">{factor.label}</span>
              <span
                data-slot="metric"
                className={cn(value, factorTones[factor.tone])}
              >
                {factor.value}
              </span>
              <span className="col-span-2 text-label text-muted-foreground">
                {factor.reason}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <WidgetEmpty>
          Aucun signal Garmin récent ni ressenti saisi aujourd’hui.
        </WidgetEmpty>
      )}
    </Widget>
  );
}

export function NightsSection({
  nights,
  className,
}: {
  nights: BodyNights;
  className?: string;
}) {
  const max = Math.max(1, ...nights.nights.map((night) => night.seconds ?? 0));
  const hasNight = nights.nights.some((night) => night.seconds !== null);
  return (
    <Widget
      headingLevel={2}
      title={<span id="body-nights">Sommeil</span>}
      aria-labelledby="body-nights"
      className={className}
    >
      {hasNight ? (
        <div className="flex flex-col gap-2.5">
          {nights.summary && (
            <p className="text-label text-secondary-foreground tabular-nums">
              {nights.summary}
            </p>
          )}
          <ChartInspector
            label={`Durée et phases de sommeil des ${nights.nights.length} dernières nuits`}
            points={nights.nights.map((night, index, all) => ({
              x: (index + 0.5) / all.length,
              title: nightTitle(night.day),
              rows:
                night.seconds === null
                  ? [{ label: "Sommeil", value: "Non mesuré", tone: "muted" }]
                  : [
                      {
                        label: "Durée",
                        value: formatSleep(night.seconds),
                        tone: night.short ? "warning" : "provider",
                      },
                      ...(night.deep === null
                        ? []
                        : [
                            {
                              label: "Profond",
                              value: formatSleep(night.deep),
                            },
                          ]),
                      ...(night.rem === null
                        ? []
                        : [
                            {
                              label: "Paradoxal",
                              value: formatSleep(night.rem),
                            },
                          ]),
                    ],
              note:
                nights.average === null
                  ? undefined
                  : `Ta moyenne : ${formatSleep(nights.average)}`,
            }))}
          >
            <ol className="flex h-28 items-end gap-0.5 border-b border-control-border sm:gap-1">
              {nights.nights.map((night) => {
                const staged =
                  night.deep !== null &&
                  night.light !== null &&
                  night.rem !== null &&
                  night.deep + night.light + night.rem > 0;
                return (
                  <li
                    key={night.day}
                    className={cn(
                      "flex flex-1 flex-col overflow-hidden rounded-t-mark",
                      night.short &&
                        "outline-[1.5px] outline-offset-1 outline-warning",
                      !staged && "bg-secondary-foreground",
                    )}
                    style={{
                      height: `${((night.seconds ?? 0) / max) * 100}%`,
                    }}
                  >
                    {staged && (
                      <>
                        <span
                          className="bg-data-2"
                          style={{ flex: night.rem! }}
                        />
                        <span
                          className="bg-data-1"
                          style={{ flex: night.light! }}
                        />
                        <span
                          className="bg-data-3"
                          style={{ flex: night.deep! }}
                        />
                      </>
                    )}
                    <span className="sr-only">
                      {`${nightTitle(night.day)} : ${night.seconds === null ? "non mesurée" : formatSleep(night.seconds)}${night.short ? ", nuit courte" : ""}`}
                    </span>
                  </li>
                );
              })}
            </ol>
          </ChartInspector>
          <Legend
            items={[
              {
                label: "Paradoxal",
                swatch: "size-2 rounded-mark bg-data-2",
              },
              { label: "Léger", swatch: "size-2 rounded-mark bg-data-1" },
              { label: "Profond", swatch: "size-2 rounded-mark bg-data-3" },
              {
                label: "Nuit courte",
                swatch: "size-2 rounded-mark outline-[1.5px] outline-warning",
              },
            ]}
          />
        </div>
      ) : (
        <WidgetEmpty>
          Aucune nuit mesurée par Garmin sur cette période.
        </WidgetEmpty>
      )}
    </Widget>
  );
}

function rangeText(range: { low: number; high: number } | null) {
  if (!range) return null;
  return range.low === range.high
    ? `${range.low}`
    : `${range.low}–${range.high}`;
}

function RangeCard({
  id,
  title,
  unit,
  signal,
  higherIsBetter,
  caption,
  chartDays,
}: {
  id: string;
  title: string;
  unit: string;
  signal: HealthRange | null;
  higherIsBetter: boolean;
  caption: (signal: HealthRange) => string;
  chartDays: number;
}) {
  const unfavorable = higherIsBetter ? "below" : "above";
  const status: { label: string; level: StatusLevel | null } | null = !signal
    ? null
    : signal.position === null
      ? { label: "Plage en cours de calcul", level: null }
      : signal.position === "within"
        ? { label: higherIsBetter ? "Dans ta plage" : "Stable", level: "ok" }
        : signal.position === unfavorable
          ? {
              label: higherIsBetter ? "Sous ta plage" : "Au-dessus",
              level: "watch",
            }
          : {
              label: higherIsBetter ? "Au-dessus de ta plage" : "Plus basse",
              level: "ok",
            };
  return (
    <Widget
      headingLevel={2}
      title={<span id={id}>{title}</span>}
      aria-labelledby={id}
      verdict={
        status &&
        (status.level ? (
          <Status level={status.level}>{status.label}</Status>
        ) : (
          <span className="text-label font-normal text-muted-foreground">
            {status.label}
          </span>
        ))
      }
    >
      {signal ? (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span data-slot="metric" className={cn("text-metric", value)}>
              {formatInteger(signal.last)}
              <span className="ml-1 text-body font-normal text-secondary-foreground">
                {unit}
              </span>
            </span>
            <span className="text-label text-muted-foreground">
              {caption(signal)}
            </span>
          </div>
          <ChartInspector
            label={`${title} sur ${chartDays} jours`}
            points={signal.points.map((point, index, all) => ({
              x: all.length > 1 ? index / (all.length - 1) : 0.5,
              title: nightTitle(point.day),
              rows: [
                {
                  label: title,
                  value:
                    point.value === null
                      ? "Non mesurée"
                      : `${Math.round(point.value)} ${unit}`,
                  tone: "foreground",
                },
              ],
              note: signal.range
                ? `Plage habituelle : ${rangeText(signal.range)} ${unit}`
                : undefined,
            }))}
          >
            <RangeChart
              card={signal}
              label={`${title} sur ${chartDays} jours`}
              unfavorable={signal.position === unfavorable}
              height={70}
            />
          </ChartInspector>
        </div>
      ) : (
        <WidgetEmpty>Aucune mesure ces deux derniers jours.</WidgetEmpty>
      )}
    </Widget>
  );
}

export function HeartCards({
  hrv,
  resting,
  chartDays,
}: {
  hrv: HealthRange | null;
  resting: HealthRange | null;
  chartDays: number;
}) {
  return (
    <>
      <RangeCard
        id="body-hrv"
        title="VFC nocturne"
        unit="ms"
        signal={hrv}
        higherIsBetter
        chartDays={chartDays}
        caption={(signal) =>
          signal.range
            ? `plage ${rangeText(signal.range)} ms · 28 nuits`
            : "plage en cours de calcul"
        }
      />
      <RangeCard
        id="body-resting"
        title="FC au repos"
        unit="bpm"
        signal={resting}
        higherIsBetter={false}
        chartDays={chartDays}
        caption={(signal) =>
          signal.median === null
            ? "médiane en cours de calcul"
            : `médiane ${formatInteger(signal.median)} bpm · 28 j`
        }
      />
    </>
  );
}

const kpiTones = {
  warning: "text-warning",
  success: "text-primary",
  muted: "text-muted-foreground",
} as const;

export function KpiCards({ kpis }: { kpis: BodyKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <PanelSection id="body-signals" title="Autres signaux Garmin">
      <dl className="flex flex-col">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0"
          >
            <dt className="text-secondary-foreground">{kpi.label}</dt>
            <dd data-slot="metric" className={value}>
              {kpi.value}
            </dd>
            <dd className={cn("col-span-2 text-label", kpiTones[kpi.tone])}>
              {kpi.detail}
            </dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
}

const monthShort = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

export function RaceRecoveries({
  races,
  note,
}: {
  races: RecoveryView["races"];
  note: string;
}) {
  return (
    <PanelSection id="body-races" title="Récupération après course">
      {races.length ? (
        <dl className="flex flex-col">
          {races.map((race) => (
            <div
              key={race.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border py-2 last:border-b-0"
            >
              <dt className="truncate">
                {race.name} ·{" "}
                {monthShort.format(new Date(`${race.day}T00:00:00Z`))}
              </dt>
              <dd className="text-label text-secondary-foreground">
                {race.ongoing ? "VFC basse depuis " : "VFC normale en "}
                <span
                  data-slot="metric"
                  className={cn("text-body text-foreground", value)}
                >
                  {formatInteger(race.days)} j
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">
          Aucune course passée avec des mesures de VFC.
        </p>
      )}
      <p className="text-label text-muted-foreground">{note}</p>
    </PanelSection>
  );
}
