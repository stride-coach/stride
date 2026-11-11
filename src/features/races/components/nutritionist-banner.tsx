"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { StaffPortrait } from "@/features/coach/components/staff-portrait";
import { useStaff } from "@/features/coach/components/staff-context";
import { coachRequestHref } from "@/features/coach/request";
import { changeCountLabel } from "../proposals";

export function NutritionistBanner({
  raceId,
  proposal,
  accepted,
  generic,
  productCount,
  carbsPerHourG,
  weather,
  updatedOn,
}: {
  raceId: string;
  proposal: { id: string; changes: number } | null;
  accepted: boolean;
  generic: boolean;
  productCount: number;
  carbsPerHourG: number;
  weather: "forecast" | "normals" | null;
  updatedOn: string | null;
}) {
  const nutritionist = useStaff().nutritionist;
  const name = nutritionist.name;
  const role = nutritionist.feminine
    ? "ta nutritionniste"
    : "ton nutritionniste";
  const weatherText =
    weather === "forecast"
      ? "la météo prévue"
      : weather === "normals"
        ? "les normales de saison"
        : null;
  const products = `${productCount} produit${productCount > 1 ? "s" : ""}`;
  const title = accepted
    ? `${name}, ${role}, a préparé ce plan avec toi`
    : `${name}, ${role}, peut ajuster ce plan avec toi`;
  const detail = generic
    ? "Ajoute tes produits dans Mes produits : en attendant, Stride compte en gels, compotes et barres génériques."
    : accepted
      ? `Basé sur tes ${products}, ${carbsPerHourG} g/h${weatherText ? ` et ${weatherText}` : ""}.${updatedOn ? ` Dernière mise à jour le ${updatedOn}.` : ""}`
      : `Stride répartit tes ${products} sur les tronçons à ${carbsPerHourG} g/h${weatherText ? `, selon ${weatherText}` : ""}.`;
  const mobileTitle = accepted
    ? `Plan préparé avec ${name}`
    : "Plan calculé par Stride";
  const mobileDetail = [
    generic ? "produits génériques" : products,
    `${carbsPerHourG} g/h`,
    weather === "forecast" ? "météo prévue" : weather ? "normales" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const examine =
    proposal && `/races/${raceId}/nutrition?proposal=${proposal.id}`;
  const adjust = coachRequestHref(
    `Ajustons ma nutrition de course avec ${name}.`,
    null,
    raceId,
  );
  return (
    <section
      aria-label="Plan de nutrition"
      className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <StaffPortrait agent="nutritionist" size={36} decorative />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-lg font-semibold text-balance">
            <span className="max-md:hidden">{title}</span>
            <span className="md:hidden">{mobileTitle}</span>
          </span>
          <span className="text-secondary-foreground">
            <span className="max-md:hidden">{detail}</span>
            <span className="text-label md:hidden">{mobileDetail}</span>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-md:[&>a]:flex-1">
        {proposal && (
          <Chip proposal className="max-md:hidden">
            {changeCountLabel(proposal.changes)}
          </Chip>
        )}
        {examine && (
          <Button asChild>
            <Link href={examine} scroll={false} data-proposal-id={proposal.id}>
              <span className="max-md:hidden">Examiner</span>
              <span className="md:hidden">
                Examiner {changeCountLabel(proposal.changes)}
              </span>
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={adjust}>Ajuster avec {name}</Link>
        </Button>
      </div>
    </section>
  );
}
