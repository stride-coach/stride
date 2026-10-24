import { Metric } from "@/components/stride/metric";
import { MonoLabel } from "@/components/stride/mono-label";
import { cn } from "@/lib/utils";

const signals = [
  {
    label: "Sommeil",
    value: "6 h 10",
    context: "· score 58",
    source: "Garmin",
    compact: false,
  },
  {
    label: "VFC nuit",
    value: "48 ms",
    context: "· moy. 7 j 55",
    source: "Garmin",
    compact: true,
  },
  {
    label: "Charge 7 j",
    value: "+18 %",
    context: "· vs 4 semaines",
    source: "Stride",
    compact: true,
    warning: true,
  },
  {
    label: "Mollet G.",
    value: "Gêne 3/10",
    context: "· depuis 2 jours",
    source: "Check-in",
    compact: true,
  },
] as const;

export function ProposalPreview() {
  return (
    <figure
      aria-label="Exemple de proposition du coach"
      className="flex flex-col gap-3.5 rounded-card border border-border bg-surface-inset p-4.5 md:gap-4.5 md:rounded-panel md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <MonoLabel size="micro" className="md:text-label">
          Aujourd’hui · mar. 28/10
        </MonoLabel>
        <MonoLabel
          size="micro"
          tone="warning"
          className="rounded-tag border border-warning-border px-1.75 py-0.75"
        >
          À surveiller
        </MonoLabel>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="text-xl leading-tight font-semibold tracking-[-0.02em] md:text-2xl">
          Le seuil attend. Endurance 45 min à la place.
        </p>
        <p className="text-sm leading-normal text-muted md:text-body">
          Ta VFC est 12 % sous ta moyenne et tu as signalé une gêne au mollet
          gauche hier.
          <span className="hidden md:inline"> Je décale le seuil à jeudi.</span>
        </p>
      </div>
      <dl className="border-b border-border">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className={cn(
              "grid grid-cols-[96px_1fr_auto] items-baseline gap-2 border-t border-border py-2.25 text-meta md:grid-cols-[120px_1fr_auto] md:gap-3 md:py-2.5 md:text-sm",
              !signal.compact && "hidden md:grid",
            )}
          >
            <MonoLabel asChild size="micro" className="md:text-label">
              <dt>{signal.label}</dt>
            </MonoLabel>
            <dd>
              <Metric
                size="sm"
                value={signal.value}
                className={cn(
                  "md:text-xl",
                  "warning" in signal && "text-warning",
                )}
              />{" "}
              <span className="hidden text-muted-foreground md:inline">
                {signal.context}
              </span>
            </dd>
            <MonoLabel size="nano" className="md:text-micro">
              {signal.source}
            </MonoLabel>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-2 md:gap-2.5" aria-hidden="true">
        <span className="flex h-11 flex-1 items-center justify-center rounded-surface bg-primary text-[15px] font-semibold text-primary-foreground md:h-10 md:flex-none md:px-5.5 md:text-sm">
          Accepter
        </span>
        <span className="flex h-11 flex-1 items-center justify-center rounded-surface border border-border-strong text-sm text-foreground md:h-10 md:flex-none md:px-5">
          Garder le seuil
        </span>
        <MonoLabel size="micro" className="ml-auto hidden md:inline">
          Médecin + Coach
        </MonoLabel>
      </div>
    </figure>
  );
}

const hrvTrace = [
  46, 40, 44, 36, 42, 38, 34, 40, 44, 38, 36, 42, 48, 58, 64, 60, 52, 46, 40,
  42, 36, 38, 34, 40, 36, 42, 38, 40, 36,
];
const sleep = [46, 50, 42, 52, 48, 30, 44, 54, 48, 50, 46, 52, 48, 50];

export function HealthPreview() {
  const step = 560 / (hrvTrace.length - 1);
  const points = hrvTrace
    .map((value, index) => `${Math.round(index * step)},${value}`)
    .join(" ");
  const dip = hrvTrace.indexOf(Math.max(...hrvTrace));
  return (
    <figure
      aria-label="Exemple de tendances de récupération"
      className="flex flex-col gap-3.5 rounded-card border border-border bg-surface-inset p-4.5 md:gap-5.5 md:rounded-panel md:p-6.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold md:text-base">
          <span className="md:hidden">VFC nuit · 28 jours</span>
          <span className="hidden md:inline">Récupération · 28 jours</span>
        </span>
        <MonoLabel size="micro" className="hidden md:inline">
          Garmin · référence 60 j
        </MonoLabel>
        <Metric size="md" value="52" unit="ms" className="md:hidden" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="hidden items-baseline justify-between md:flex">
          <MonoLabel>VFC nuit</MonoLabel>
          <span>
            <Metric size="lg" value="52" />{" "}
            <span className="text-meta text-muted-foreground">ms · stable</span>
          </span>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 560 90"
          preserveAspectRatio="none"
          className="h-20 w-full md:h-22.5"
        >
          <rect
            x="0"
            y="28"
            width="560"
            height="28"
            className="fill-surface-raised"
          />
          <polyline
            points={points}
            className="fill-none stroke-foreground"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={Math.round(dip * step)}
            cy={hrvTrace[dip]}
            r="3.5"
            className="fill-warning"
          />
        </svg>
      </div>
      <div className="hidden flex-col gap-2 md:flex">
        <div className="flex items-baseline justify-between">
          <MonoLabel>Sommeil</MonoLabel>
          <span>
            <Metric size="lg" value="7 h 05" />{" "}
            <span className="text-meta text-muted-foreground">
              moyenne 14 nuits
            </span>
          </span>
        </div>
        <div aria-hidden="true" className="flex h-15 items-end gap-2.5">
          {sleep.map((value, index) => (
            <span
              key={index}
              style={{ height: `${(value / 54) * 100}%` }}
              className={cn(
                "flex-1 rounded-mark",
                value < 40 ? "bg-warning" : "bg-border-strong",
              )}
            />
          ))}
        </div>
      </div>
      <p className="border-t border-border pt-3 text-sm leading-normal text-muted md:pt-4">
        <span className="text-accent">Lecture du coach ·</span> Le creux du
        14/10 suit ta sortie longue de 28 km. Ta VFC est revenue à ta référence
        en trois nuits
        <span className="hidden md:inline">
          {" "}
          : la charge actuelle passe bien
        </span>
        .
      </p>
    </figure>
  );
}
