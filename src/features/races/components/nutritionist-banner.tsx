"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
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
    : `${accepted ? "Basé sur" : "Stride répartit"} tes ${products}${accepted ? `, ${carbsPerHourG} g/h` : ` à ${carbsPerHourG} g/h`}${weatherText ? ` et ${weatherText}` : ""}.${accepted && updatedOn ? ` Dernière mise à jour le ${updatedOn}.` : ""}`;
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
      className="flex min-w-0 flex-col gap-2.5 rounded-panel border border-border bg-surface p-4 md:flex-row md:items-center md:gap-4.5 md:px-6 md:py-5.5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4.5">
        <StaffPortrait
          agent="nutritionist"
          size={44}
          decorative
          className="max-md:hidden"
        />
        <StaffPortrait
          agent="nutritionist"
          size={40}
          decorative
          className="md:hidden"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-0.75">
          <span className="text-sm font-semibold md:text-body">
            <span className="max-md:hidden">{title}</span>
            <span className="md:hidden">{mobileTitle}</span>
          </span>
          <span className="text-xs text-muted-foreground md:text-meta md:text-muted">
            <span className="max-md:hidden">{detail}</span>
            <span className="md:hidden">{mobileDetail}</span>
          </span>
        </div>
      </div>
      {proposal && (
        <span className="inline-flex items-center self-center rounded-full border border-warning/30 px-2.25 py-0.5 text-xs whitespace-nowrap text-warning max-md:hidden">
          {changeCountLabel(proposal.changes)}
        </span>
      )}
      {examine && (
        <Button
          asChild
          size="md"
          className="rounded-surface text-meta max-md:min-h-11"
        >
          <Link href={examine} scroll={false} data-proposal-id={proposal.id}>
            <span className="max-md:hidden">Examiner</span>
            <span className="md:hidden">
              Examiner {changeCountLabel(proposal.changes)}
            </span>
          </Link>
        </Button>
      )}
      <Button
        asChild
        variant="outline"
        size="md"
        className="rounded-surface text-meta max-md:min-h-11"
      >
        <Link href={adjust}>Ajuster avec {name}</Link>
      </Button>
    </section>
  );
}
