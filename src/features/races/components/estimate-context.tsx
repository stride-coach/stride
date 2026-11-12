import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Status } from "@/components/stride/status";

const needs = [
  ["Le profil et la carte", false],
  ["Les côtes à marcher", false],
  ["La météo à l’endroit où tu passes", false],
  ["Les heures de nuit", false],
  ["L’export vers la montre", false],
  ["L’allure et les heures de passage, en estimation", true],
  ["Les barrières horaires que tu saisis", true],
  ["Le carnet de route", true],
] as const;

export function EstimateContext({ raceId }: { raceId: string }) {
  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="estimate-needs"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <h2
          id="estimate-needs"
          className="text-body font-medium text-secondary-foreground"
        >
          Avec et sans tracé
        </h2>
        <ul className="flex flex-col">
          {needs.map(([label, available]) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              <span>{label}</span>
              <Status level={available ? "ok" : "watch"}>
                {available ? "Disponible" : "Avec le tracé"}
              </Status>
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="estimate-manual"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <h2
          id="estimate-manual"
          className="text-body font-medium text-secondary-foreground"
        >
          Pas de GPX officiel ?
        </h2>
        <p className="text-body text-secondary-foreground">
          Saisis les ravitaillements à la main, avec leur kilomètre : le plan se
          découpe à chacun. Tu peux aussi importer la trace d’un coureur de l’an
          dernier, en gardant en tête que le parcours a pu changer.
        </p>
        <Link
          href={`/races/${raceId}/waypoints`}
          className="w-fit font-medium text-primary underline-offset-2 hover:underline"
        >
          Saisir les ravitaillements
        </Link>
      </section>
    </div>
  );
}
