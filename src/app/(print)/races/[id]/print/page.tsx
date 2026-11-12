import type { Metadata } from "next";
import { RoadbookSheet } from "@/features/races/components/roadbook-sheet";
import { PrintOnLoad } from "@/features/races/components/print-on-load";
import { roadbookOptionsSchema } from "@/features/races/printed-roadbook";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadRace } from "@/server/races/load";
import { printedRoadbookFor } from "@/server/races/views";

export const metadata: Metadata = { title: "Carnet de route" };

const printedFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

const pageSizes = { a4: "A4", a6: "A6", band: "A4 landscape" } as const;

export default async function RoadbookPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const options = roadbookOptionsSchema.parse(query);
  const { context, data } = await loadRace(id);
  const roadbook = await printedRoadbookFor(
    data,
    await readNutritionLibrary(context),
  );
  return (
    <main className="mx-auto max-w-[210mm]">
      <style>{`@page { size: ${pageSizes[options.format]}; margin: 8mm; }`}</style>
      {roadbook ? (
        <RoadbookSheet
          roadbook={roadbook}
          options={options}
          printedAt={printedFormat.format(new Date())}
        />
      ) : (
        <p className="p-6 text-body">
          Ajoute un objectif de temps à la course pour préparer son carnet de
          route.
        </p>
      )}
      {query.print === "1" && <PrintOnLoad />}
    </main>
  );
}
