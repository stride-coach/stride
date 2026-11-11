import Link from "next/link";
import { Widget } from "@/components/stride/widget";
import { NavGearIcon } from "@/components/stride/nav-icons";
import { cn } from "@/lib/utils";
import type { RotationView, WeekShoeRow } from "../planned";

function PairChip({ name, href }: { name: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-control-touch items-center gap-1.5 rounded-md border border-control-border px-2.5 whitespace-nowrap text-foreground transition-colors duration-150 ease-stride hover:border-muted-foreground md:min-h-6"
    >
      <NavGearIcon className="size-3.5 text-muted-foreground" />
      {name}
    </Link>
  );
}

export function PlannedPairs({ rows }: { rows: WeekShoeRow[] }) {
  return (
    <Widget
      headingLevel={2}
      title={
        <>
          <span className="md:hidden">Cette semaine</span>
          <span className="max-md:hidden">Paires prévues cette semaine</span>
        </>
      }
    >
      <p className="pb-1 text-label text-muted-foreground max-md:hidden">
        choisies par Stride, modifiables sur chaque séance
      </p>
      {rows.length === 0 ? (
        <p className="text-body text-secondary-foreground">
          Plus de séance de course prévue cette semaine.
        </p>
      ) : (
        <ul className="-my-1.5">
          {rows.map((row) => (
            <li
              key={row.sessionKey}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0 md:grid-cols-[72px_minmax(0,1fr)_auto]"
            >
              <span className="text-label text-muted-foreground max-md:hidden">
                {row.day}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{row.title}</span>
                <span className="text-label text-muted-foreground">
                  <span className="md:hidden">{row.day} · </span>
                  {row.detail}
                </span>
              </span>
              {row.pair ? (
                <PairChip name={row.pair} href={row.href} />
              ) : (
                <Link
                  href={row.href}
                  className="inline-flex min-h-control-touch items-center text-label text-muted-foreground hover:text-foreground md:min-h-0"
                >
                  Aucune paire
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function dotSize(km: number) {
  return Math.round(Math.min(Math.max(8 + km / 2, 9), 20));
}

export function RotationStrip({ view }: { view: RotationView }) {
  if (view.rows.length === 0) return null;
  return (
    <Widget
      headingLevel={2}
      title="Rotation · 14 derniers jours"
      verdict={
        <span className="text-label font-normal text-muted-foreground">
          {view.range}
        </span>
      }
      className="max-md:hidden"
    >
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-105 table-fixed border-collapse">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-36 pb-2 text-left text-label font-normal text-muted-foreground"
                >
                  Paire
                </th>
                {view.days.map((day) => (
                  <th
                    key={day.day}
                    scope="col"
                    className="pb-2 text-center text-label font-normal text-muted-foreground tabular-nums"
                  >
                    <abbr title={day.label} className="no-underline">
                      {day.letter}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id}>
                  <th
                    scope="row"
                    className="truncate pr-4 text-left font-medium whitespace-nowrap"
                  >
                    {row.name}
                  </th>
                  {row.cells.map((cell) => (
                    <td
                      key={cell.day}
                      className="h-8.5 text-center align-middle"
                    >
                      {cell.km !== null ? (
                        <span
                          title={cell.label ?? undefined}
                          className={cn(
                            "inline-block rounded-full align-middle",
                            cell.pending
                              ? "border-2 border-dashed border-warning"
                              : "bg-foreground",
                          )}
                          style={{
                            width: dotSize(cell.km),
                            height: dotSize(cell.km),
                          }}
                        >
                          <span className="sr-only">{cell.label}</span>
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="inline-block size-1 rounded-full bg-border align-middle"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 text-label text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-foreground"
            />
            sortie · taille = km
          </span>
          {view.rows.some((row) => row.cells.some((cell) => cell.pending)) && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border-2 border-dashed border-warning"
              />
              paire à confirmer
            </span>
          )}
        </div>
        <p className="text-body text-secondary-foreground">
          Évite d’enchaîner deux jours la même paire : Stride en tient compte
          dans ses choix.
        </p>
      </div>
    </Widget>
  );
}
