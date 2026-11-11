import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localToday } from "@/features/app-shell/shell";
import { GearFrame } from "@/features/gear/components/gear-frame";
import { ShoeForm } from "@/features/gear/components/shoe-form";
import { modelName } from "@/features/gear/view";
import { requireAthlete } from "@/server/app/session";
import { readShoe } from "@/server/gear/shoes";

export const metadata: Metadata = { title: "Modifier la paire · Matériel" };

export default async function EditShoeRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAthlete();
  const shoe = await readShoe(context, id);
  if (!shoe) notFound();
  return (
    <GearFrame
      crumbs={[
        { label: "Matériel", href: "/activities/gear" },
        { label: modelName(shoe.spec), href: `/activities/gear/${shoe.id}` },
        { label: "Modifier" },
      ]}
      back={{ href: `/activities/gear/${shoe.id}`, label: "Retour à la paire" }}
    >
      <h1 className="text-verdict font-semibold">Modifier la fiche</h1>
      <ShoeForm
        mode="edit"
        id={shoe.id}
        spec={shoe.spec}
        suggested={shoe.suggested}
        today={localToday(new Date())}
      />
    </GearFrame>
  );
}
