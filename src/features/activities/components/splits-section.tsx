"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { LapTable } from "../detail";
import type { KmSplits, SplitColumn, SplitRow } from "../splits";
import { LapTableView } from "./lap-table";

const labels: Record<SplitColumn, string> = {
  heartRate: "FC moy.",
  gain: "D+",
  loss: "D−",
  cadence: "Cad.",
  power: "Puiss.",
};

const head =
  "pb-2 pl-2 text-right font-mono text-[9.5px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase";
const cell =
  "py-2.5 pl-2 text-right font-metric text-[17px] font-semibold whitespace-nowrap tabular-nums";

function Missing() {
  return (
    <>
      <span aria-hidden="true" className="text-dim">
        —
      </span>
      <span className="sr-only">non disponible</span>
    </>
  );
}

function KmTable({ splits }: { splits: KmSplits }) {
  const has = (key: SplitColumn) => splits.columns.includes(key);
  const climb = has("gain") || has("loss");
  const row = (item: SplitRow, average = false) => (
    <tr
      key={item.key}
      className={cn("border-b border-border", average && "text-foreground")}
    >
      <th
        scope="row"
        className={cn(
          "py-2.5 text-left",
          average
            ? "text-meta font-semibold"
            : "font-metric text-[17px] font-semibold tabular-nums",
        )}
      >
        {item.label}
      </th>
      <td className={cell}>
        {item.pace}
        {!average && (
          <span className="ml-1 text-xs font-medium text-muted-foreground max-sm:hidden">
            /km
          </span>
        )}
      </td>
      <td className="w-[34%] pl-2 sm:w-[30%] sm:pl-3.5">
        {item.bar && (
          <span
            aria-hidden="true"
            className={cn(
              "block h-2 rounded-mark",
              item.bar.fast ? "bg-provider" : "bg-border-strong",
            )}
            style={{ width: `${item.bar.width}%` }}
          />
        )}
      </td>
      {has("heartRate") && (
        <td className={cell}>{item.heartRate ?? <Missing />}</td>
      )}
      {has("gain") && (
        <td className={cn(cell, "max-sm:hidden")}>
          {item.gain ?? <Missing />}
        </td>
      )}
      {has("loss") && (
        <td className={cn(cell, "max-sm:hidden")}>
          {item.loss ?? <Missing />}
        </td>
      )}
      {climb && (
        <td className={cn(cell, "sm:hidden")}>
          {item.gain ?? "—"}/{item.loss ?? "—"}
        </td>
      )}
      {has("cadence") && (
        <td className={cn(cell, "max-sm:hidden")}>
          {item.cadence ?? <Missing />}
        </td>
      )}
      {has("power") && (
        <td className={cn(cell, "max-sm:hidden")}>
          {item.power ?? <Missing />}
        </td>
      )}
    </tr>
  );
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">Splits par km</caption>
      <thead>
        <tr className="border-b border-border-strong">
          <th scope="col" className={cn(head, "pl-0 text-left")}>
            Km
          </th>
          <th scope="col" className={head}>
            Allure
          </th>
          <th scope="col" className={head}>
            <span className="sr-only">Comparaison</span>
          </th>
          {has("heartRate") && (
            <th scope="col" className={head}>
              <span className="sm:hidden">FC</span>
              <span className="max-sm:hidden">{labels.heartRate}</span>
            </th>
          )}
          {has("gain") && (
            <th scope="col" className={cn(head, "max-sm:hidden")}>
              {labels.gain}
            </th>
          )}
          {has("loss") && (
            <th scope="col" className={cn(head, "max-sm:hidden")}>
              {labels.loss}
            </th>
          )}
          {climb && (
            <th scope="col" className={cn(head, "sm:hidden")}>
              D+/D−
            </th>
          )}
          {has("cadence") && (
            <th scope="col" className={cn(head, "max-sm:hidden")}>
              {labels.cadence}
            </th>
          )}
          {has("power") && (
            <th scope="col" className={cn(head, "max-sm:hidden")}>
              {labels.power}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {splits.rows.map((item) => row(item))}
        {row(splits.average, true)}
      </tbody>
    </table>
  );
}

export function SplitsSection({
  splits,
  laps,
}: {
  splits: KmSplits;
  laps: LapTable | null;
}) {
  const [view, setView] = useState<"km" | "laps">("km");
  return (
    <section aria-labelledby="activity-splits" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="activity-splits" className="text-lg font-semibold sm:text-xl">
          Splits
        </h2>
        {laps && (
          <ToggleGroup
            type="single"
            variant="segment"
            aria-label="Découpage"
            value={view}
            onValueChange={(value) => {
              if (value === "km" || value === "laps") setView(value);
            }}
            className="ml-auto gap-0.5 rounded-[9px] border border-border bg-card p-0.75"
          >
            <ToggleGroupItem
              value="km"
              className="min-h-7.5 rounded-md border-l-0 px-2.75 text-[12.5px] data-[state=on]:bg-border data-[state=on]:font-semibold"
            >
              Par km
            </ToggleGroupItem>
            <ToggleGroupItem
              value="laps"
              className="min-h-7.5 gap-1 rounded-md border-l-0 px-2.75 text-[12.5px] data-[state=on]:bg-border data-[state=on]:font-semibold"
            >
              {laps.title}
              <span className="font-normal text-muted-foreground">
                {laps.rows.length}
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
      {view === "laps" && laps ? (
        <LapTableView table={laps} />
      ) : (
        <>
          <KmTable splits={splits} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-2.5 rounded-mark bg-provider"
            />
            Bleu : km plus rapides que ta moyenne · calculé sur le tracé Garmin
          </p>
        </>
      )}
    </section>
  );
}
