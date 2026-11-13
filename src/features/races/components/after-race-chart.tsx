import { cn } from "@/lib/utils";
import type { AfterChart, PassageCheck } from "../after-race";

const width = 1000;
const kmSteps = [1, 2, 5, 10, 20, 25, 50];

function kmTicks(distanceM: number) {
  const km = distanceM / 1000;
  const step = kmSteps.find((item) => km / item <= 6) ?? 100;
  return Array.from({ length: Math.floor(km / step) + 1 }, (_, index) => ({
    km: index * step,
    left: ((index * step * 1000) / distanceM) * 100,
  }));
}

function Lane({
  label,
  height,
  children,
  overlay,
}: {
  label: string;
  height: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label font-medium text-secondary-foreground">
        {label}
      </p>
      <div className="relative" style={{ height }}>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 block size-full overflow-visible"
        >
          {children}
        </svg>
        {overlay}
      </div>
    </div>
  );
}

function Label({
  left,
  top,
  className,
  children,
}: {
  left: number;
  top: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -translate-x-1/2 text-label leading-4 whitespace-nowrap tabular-nums",
        left < 4 && "translate-x-0",
        left > 96 && "-translate-x-full",
        className,
      )}
      style={{ left: `${left}%`, top }}
    >
      {children}
    </span>
  );
}

export function AfterRaceChart({
  chart,
  passages,
}: {
  chart: AfterChart;
  passages: PassageCheck[];
}) {
  const x = (distanceM: number) => (distanceM / chart.distanceM) * width;
  const left = (distanceM: number) => (distanceM / chart.distanceM) * 100;

  const profileHeight = 72;
  const elevations = chart.elevation.map(([, ele]) => ele);
  const low = Math.min(...elevations);
  const high = Math.max(...elevations);
  const elevationY = (ele: number) =>
    profileHeight -
    4 -
    ((ele - low) / Math.max(1, high - low)) * (profileHeight - 8);
  const profileLine = chart.elevation
    .map(
      ([distanceM, ele], index) =>
        `${index ? "L" : "M"}${x(distanceM).toFixed(1)},${elevationY(ele).toFixed(1)}`,
    )
    .join("");

  const gapHeight = 64;
  const deltas = chart.gaps.map((gap) => gap.deltaSeconds);
  const gapLow = Math.min(0, ...deltas);
  const gapHigh = Math.max(60, ...deltas);
  const gapY = (seconds: number) =>
    gapHeight -
    6 -
    ((seconds - gapLow) / (gapHigh - gapLow)) * (gapHeight - 24);
  const gapLine = chart.gaps
    .map(
      (gap, index) =>
        `${index ? "L" : "M"}${x(gap.distanceM).toFixed(1)},${gapY(gap.deltaSeconds).toFixed(1)}`,
    )
    .join("");

  const paceHeight = 64;
  const paces = chart.paces.flatMap((pace) => [
    pace.plannedSecondsPerKm,
    pace.actualSecondsPerKm,
  ]);
  const paceLow = Math.min(...paces);
  const paceHigh = Math.max(paceLow + 30, ...paces);
  const paceY = (secondsPerKm: number) =>
    6 + ((secondsPerKm - paceLow) / (paceHigh - paceLow)) * (paceHeight - 24);
  const steps = (pick: "plannedSecondsPerKm" | "actualSecondsPerKm") =>
    chart.paces
      .map(
        (pace, index) =>
          `${index ? "L" : "M"}${x(pace.fromM).toFixed(1)},${paceY(pace[pick]).toFixed(1)}H${x(pace.toM).toFixed(1)}`,
      )
      .join("");

  return (
    <section
      aria-labelledby="after-plan"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="after-plan" className="font-semibold">
          Ta course sur ton plan
        </h2>
        <ul
          aria-label="Légende"
          className="flex flex-wrap gap-x-4 text-label text-muted-foreground sm:ml-auto"
        >
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-3.5 bg-foreground" />
            Réalisé
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-3.5 border-t-2 border-dashed border-primary"
            />
            Prévu
          </li>
        </ul>
      </div>
      <div className="relative flex flex-col gap-3">
        {chart.night.map((range) => (
          <span
            key={`${range.fromM}-${range.toM}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 bg-foreground/6"
            style={{
              left: `${left(range.fromM)}%`,
              width: `${left(range.toM - range.fromM)}%`,
            }}
          />
        ))}
        <div aria-hidden="true" className="relative h-8">
          {chart.stations.map((station, index) => {
            const edge = index === 0 || index === chart.stations.length - 1;
            const position = left(station.distanceM);
            return (
              <span
                key={station.id}
                className={cn(
                  "absolute top-0 flex -translate-x-1/2 flex-col text-label leading-4 whitespace-nowrap",
                  position < 4 && "translate-x-0",
                  position > 96 && "-translate-x-full items-end",
                  !edge && chart.stations.length > 4 && "max-sm:hidden",
                )}
                style={{ left: `${position}%` }}
              >
                <span className="font-medium">{station.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {station.clock}
                </span>
              </span>
            );
          })}
        </div>
        {chart.elevation.length > 1 && (
          <Lane label="Profil" height={profileHeight}>
            <path
              d={`${profileLine}L${width},${profileHeight}L0,${profileHeight}Z`}
              className="fill-secondary-foreground/15"
            />
            <path
              d={profileLine}
              className="fill-none stroke-secondary-foreground"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          </Lane>
        )}
        <Lane
          label="Écart sur le plan"
          height={gapHeight}
          overlay={
            <>
              {chart.gaps.map((gap) =>
                gap.label ? (
                  <Label
                    key={gap.distanceM}
                    left={left(gap.distanceM)}
                    top={gapY(gap.deltaSeconds) - 20}
                    className={cn(
                      "font-semibold",
                      gap.deltaSeconds > 0 ? "text-warning" : "text-primary",
                    )}
                  >
                    {gap.label}
                  </Label>
                ) : null,
              )}
              <Label
                left={100}
                top={gapY(0) + 2}
                className="text-muted-foreground"
              >
                dans le plan
              </Label>
            </>
          }
        >
          <line
            x1={0}
            x2={width}
            y1={gapY(0)}
            y2={gapY(0)}
            className="stroke-border"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={gapLine}
            className="fill-none stroke-foreground"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </Lane>
        {chart.paces.length > 0 && (
          <Lane
            label="Allure : prévue et réalisée"
            height={paceHeight}
            overlay={chart.paces.map((pace) => (
              <Label
                key={pace.fromM}
                left={left((pace.fromM + pace.toM) / 2)}
                top={
                  paceY(
                    Math.max(pace.actualSecondsPerKm, pace.plannedSecondsPerKm),
                  ) + 3
                }
                className="font-medium"
              >
                {pace.actual}
              </Label>
            ))}
          >
            <path
              d={steps("plannedSecondsPerKm")}
              className="fill-none stroke-primary"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={steps("actualSecondsPerKm")}
              className="fill-none stroke-foreground"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </Lane>
        )}
        <div
          aria-hidden="true"
          className="relative h-4 text-label text-muted-foreground tabular-nums"
        >
          {kmTicks(chart.distanceM).map((tick, index) => (
            <Label
              key={tick.km}
              left={tick.left}
              top={0}
              className={index % 2 ? "max-sm:hidden" : undefined}
            >
              {tick.km} km
            </Label>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Temps de course à chaque passage, prévu et réalisé</caption>
        <thead>
          <tr>
            <th scope="col">Passage</th>
            <th scope="col">Prévu</th>
            <th scope="col">Réalisé</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {passages.map((item) => (
            <tr key={item.id}>
              <th scope="row">
                {item.name}, km {item.distance}
              </th>
              <td>{item.planned}</td>
              <td>{item.actual}</td>
              <td>{item.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
