"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDecimal, formatPace } from "../format";
import { actionMessage } from "../messages";
import { saveRacePlan } from "@/server/races/actions";
import { Status } from "@/components/stride/status";
import { CardLabel, Figure, RaceCard } from "./race-ui";

export type WalkRow = { threshold: number; count: number; distanceM: number };

export function WalkCard({
  raceId,
  revision,
  threshold,
  paceSecondsPerKm,
  rows,
  applied,
}: {
  raceId: string;
  revision: number | null;
  threshold: number;
  paceSecondsPerKm: number;
  rows: WalkRow[];
  applied: boolean;
}) {
  const [value, setValue] = useState(threshold);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = rows.find((row) => row.threshold === value) ?? rows[0];
  const around = [value - 2, value, value + 2]
    .map((item) => rows.find((row) => row.threshold === item))
    .filter((row): row is WalkRow => Boolean(row));
  const minutes = Math.round(
    ((current.distanceM / 1000) * paceSecondsPerKm) / 60,
  );

  function commit(next: number) {
    if (next === threshold) return;
    startTransition(async () => {
      const result = await saveRacePlan(raceId, revision, {
        walkGradePercent: next,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status), { id: "walk-grade" });
        setValue(threshold);
        return;
      }
      toast.success("Seuil de marche enregistré.", { id: "walk-grade" });
    });
  }

  const distance = `${formatDecimal(current.distanceM / 1000)} km`;
  return (
    <RaceCard aria-busy={pending} className="gap-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <p className="text-body">
          Marche dès <b>{value} %</b>
          <span className="max-md:hidden"> de pente</span> à{" "}
          <b>{formatPace(paceSecondsPerKm)} /km</b> · {distance}
          <span className="max-md:hidden"> marchés</span> au total
        </p>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="walk-settings"
          onClick={() => setOpen((current) => !current)}
          className="md:ml-auto"
        >
          Régler la marche
        </Button>
      </div>
      <div
        id="walk-settings"
        className={cn("flex flex-col gap-4 pt-2", !open && "hidden")}
      >
        <div className="flex items-center justify-between">
          <CardLabel>Marche rapide</CardLabel>
          {applied && <Status level="ok">Appliquée à la simulation</Status>}
        </div>
        <label htmlFor="walk-grade" className="text-body">
          Je marche dès{" "}
          <b className="text-title font-semibold text-primary tabular-nums">
            {value} %
          </b>{" "}
          de pente
        </label>
        <Slider
          id="walk-grade"
          min={5}
          max={20}
          step={1}
          value={[value]}
          onValueChange={([next]) => setValue(next)}
          onValueCommit={([next]) => commit(next)}
          aria-valuetext={`${value} %`}
          disabled={pending}
        />
        <div className="flex justify-between">
          <span className="text-label text-muted-foreground">5 %</span>
          <span className="text-label text-muted-foreground">20 %</span>
        </div>
        <div className="flex gap-6">
          <Figure
            value={current.count}
            label={current.count > 1 ? "portions" : "portion"}
          />
          <Figure
            value={`${formatDecimal(current.distanceM / 1000)} km`}
            label="à la marche"
          />
          <Figure
            value={`~${minutes} min`}
            label={`à ${formatPace(paceSecondsPerKm)} /km`}
          />
        </div>
        <div>
          {around.map((row) => (
            <div
              key={row.threshold}
              className={cn(
                "grid grid-cols-[52px_1fr_auto] gap-2.5 border-t border-border py-1.5 text-body",
                row.threshold === value
                  ? "text-foreground"
                  : "text-secondary-foreground",
              )}
            >
              <span className="font-medium tabular-nums">
                {row.threshold} %
              </span>
              <span>
                {row.count} {row.count > 1 ? "portions" : "portion"}
              </span>
              <span className="font-medium tabular-nums">
                {formatDecimal(row.distanceM / 1000)} km
              </span>
            </div>
          ))}
        </div>
        <p className="text-body text-muted-foreground">
          Pente mesurée sur 100 m glissants du GPX. Marche comptée à{" "}
          {formatPace(paceSecondsPerKm)} /km dans la simulation.
        </p>
      </div>
    </RaceCard>
  );
}
