import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GearFrame } from "@/features/gear/components/gear-frame";
import { ShoeForm } from "@/features/gear/components/shoe-form";
import { modelName, pairCard } from "@/features/gear/view";
import { requireAthlete } from "@/server/app/session";
import { loadGear } from "@/server/gear/load";

export const metadata: Metadata = { title: "Remplacer la paire · Matériel" };

export default async function ReplaceShoeRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAthlete();
  const { today, shoes } = await loadGear(context);
  const shoe = shoes.find((item) => item.id === id);
  if (!shoe || shoe.retiredOn !== null) notFound();
  const name = modelName(shoe.spec);
  return (
    <GearFrame
      crumbs={[
        { label: "Matériel", href: "/activities/gear" },
        { label: name, href: `/activities/gear/${shoe.id}` },
        { label: "Remplacer" },
      ]}
      back={{ href: `/activities/gear/${shoe.id}`, label: "Retour à la paire" }}
    >
      <section className="flex flex-col gap-2.5">
        <h1 className="text-verdict font-semibold">Remplacer {name}</h1>
        <p className="max-w-155 text-body-lg text-pretty text-secondary-foreground">
          La fiche est reprise de ta paire actuelle, à 0 km. Modifie ce qui
          change avant de valider.
        </p>
      </section>
      <ShoeForm
        mode="replace"
        id={shoe.id}
        spec={shoe.spec}
        suggested={shoe.suggested}
        replaced={{ name, totalKm: pairCard(shoe, today).totalKm }}
        today={today}
      />
    </GearFrame>
  );
}
