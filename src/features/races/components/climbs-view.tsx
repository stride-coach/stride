"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClimbRow } from "../climbs";
import { useAxisFocus } from "./axis-focus";

const shownClimbs = 10;

const head = "px-2 py-2 text-left text-label font-normal text-muted-foreground";
const cell = "px-2 py-2.5 tabular-nums whitespace-nowrap";

export function ClimbsTable({ rows }: { rows: ClimbRow[] }) {
  const { setCursorM, setHighlight } = useAxisFocus();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, shownClimbs);
  const hidden = rows.length - shown.length;
  const focus = (row: ClimbRow) => ({
    onPointerEnter: () => setHighlight({ fromM: row.fromM, toM: row.toM }),
    onPointerLeave: () => setHighlight(null),
    onFocus: () => setHighlight({ fromM: row.fromM, toM: row.toM }),
    onBlur: () => setHighlight(null),
  });
  const select = (row: ClimbRow) => () => setCursorM(row.fromM);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:hidden">
        {shown.map((row) => (
          <li
            key={row.number}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              onClick={select(row)}
              {...focus(row)}
              className="grid min-h-row-touch w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-2 px-3 py-2.5 text-left"
            >
              <span className="text-muted-foreground tabular-nums">
                {row.number}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium tabular-nums">
                  km {row.km} · {row.length} à {row.average}
                </span>
                <span className="truncate text-label text-secondary-foreground tabular-nums">
                  max {row.max} · {row.passage}
                  {row.section ? ` · ${row.section}` : ""}
                </span>
              </span>
              <span className="text-label font-medium">{row.instruction}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto rounded-xl border border-border bg-card max-md:hidden">
        <table className="w-full min-w-160 border-collapse text-body">
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className={head}>
                <span className="sr-only">Numéro</span>
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Au km
              </th>
              <th scope="col" className={head}>
                Où
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Longueur
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                D+
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Moyenne
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Max
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Heure
              </th>
              <th scope="col" className={head}>
                Consigne
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={row.number}
                {...focus(row)}
                className="border-b border-border transition-colors duration-(--stride-duration-fast) ease-stride last:border-b-0 hover:bg-muted"
              >
                <th
                  scope="row"
                  className={cn(
                    cell,
                    "text-left font-normal text-muted-foreground",
                  )}
                >
                  <button
                    type="button"
                    onClick={select(row)}
                    aria-label={`Placer le curseur sur la côte ${row.number}, km ${row.km}`}
                    className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {row.number}
                  </button>
                </th>
                <td className={cn(cell, "text-right")}>{row.km}</td>
                <td className="max-w-64 truncate px-2 py-2.5 text-secondary-foreground">
                  {row.section ?? "—"}
                </td>
                <td className={cn(cell, "text-right")}>{row.length}</td>
                <td className={cn(cell, "text-right")}>{row.gain}</td>
                <td className={cn(cell, "text-right")}>{row.average}</td>
                <td className={cn(cell, "text-right font-medium")}>
                  {row.max}
                </td>
                <td className={cn(cell, "text-right")}>{row.passage}</td>
                <td className={cn(cell, "font-medium")}>{row.instruction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-primary"
          onClick={() => setExpanded(true)}
        >
          {hidden === 1 ? "Voir la suivante" : `Voir les ${hidden} suivantes`}
        </Button>
      )}
    </div>
  );
}
