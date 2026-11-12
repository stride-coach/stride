import { cn } from "@/lib/utils";
import type { Barrier, MarginWeight } from "../cutoff-alert";

export function CutoffContext({
  barriers,
  weights,
  barrierAt,
}: {
  barriers: Barrier[];
  weights: MarginWeight[];
  barrierAt: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="cutoff-barriers"
        className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <h2
          id="cutoff-barriers"
          className="text-body font-medium text-secondary-foreground"
        >
          Tes barrières
        </h2>
        <dl className="flex flex-col gap-2">
          {barriers.map((barrier) => (
            <div
              key={barrier.waypointId}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3"
            >
              <dt className="truncate text-secondary-foreground">
                {barrier.name}
              </dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  barrier.threatened && "text-warning",
                )}
              >
                {barrier.margin}
              </dd>
              <dd className="text-label text-muted-foreground tabular-nums">
                barrière {barrier.cutoff}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-label text-secondary-foreground">
          En dessous de 30 minutes de marge, Stride te prévient et propose des
          réglages. Il ne modifie jamais ton plan seul.
        </p>
      </section>
      {weights.length > 0 && (
        <section
          aria-labelledby="cutoff-weights"
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2
            id="cutoff-weights"
            className="text-body font-medium text-secondary-foreground"
          >
            Ce qui pèse sur la marge
          </h2>
          <dl className="flex flex-col gap-2">
            {weights.map((weight) => (
              <div
                key={weight.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
              >
                <dt className="text-secondary-foreground">{weight.label}</dt>
                <dd className="font-semibold tabular-nums">{weight.value}</dd>
                <dd className="col-span-2 text-label text-muted-foreground">
                  {weight.detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-label text-secondary-foreground">
            Le temps que chacun te coûte {barrierAt}, à la même allure de
            course.
          </p>
        </section>
      )}
    </div>
  );
}
