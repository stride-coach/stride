import { cn } from "@/lib/utils";
import { MonoLabel } from "@/components/stride/mono-label";
import type { LapColumnDisplay, LapTable } from "@/features/activities/detail";

const displays: Record<LapColumnDisplay, string> = {
  all: "",
  wide: "hidden sm:table-cell",
  narrow: "sm:hidden",
};

function Missing() {
  return (
    <>
      <span aria-hidden="true" className="text-muted-foreground">
        —
      </span>
      <span className="sr-only">non disponible</span>
    </>
  );
}

export function LapTableSection({ table }: { table: LapTable }) {
  return (
    <section aria-labelledby="activity-laps" className="flex flex-col gap-2.5">
      <h2 id="activity-laps" className="text-body font-medium">
        {table.title}
      </h2>
      <LapTableView table={table} />
    </section>
  );
}

export function LapTableView({ table }: { table: LapTable }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{table.title}</caption>
      <thead>
        <tr className="border-b border-control-border">
          <th scope="col" className="pb-2 font-normal">
            <MonoLabel size="nano">
              {table.title === "Tours" ? "Tour" : "Segment"}
            </MonoLabel>
          </th>
          {table.columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "pb-2 pl-2 text-right font-normal",
                displays[column.display],
              )}
            >
              <MonoLabel size="nano" className="whitespace-nowrap">
                {column.shortLabel === column.label ? (
                  column.label
                ) : (
                  <>
                    <span className="sm:hidden">{column.shortLabel}</span>
                    <span className="max-sm:hidden">{column.label}</span>
                  </>
                )}
              </MonoLabel>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.key} className="border-b border-border">
            <th
              scope="row"
              className="py-2.5 text-left font-semibold tabular-nums"
            >
              {row.label}
            </th>
            {table.columns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  "py-2.5 pl-2 text-right font-semibold whitespace-nowrap text-foreground tabular-nums",
                  displays[column.display],
                )}
              >
                {row.cells[column.key] ?? <Missing />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
