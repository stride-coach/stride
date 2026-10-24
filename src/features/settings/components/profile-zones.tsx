import { MonoLabel } from "@/components/stride/mono-label";
import { ProvenanceLabel } from "@/components/stride/provenance";
import type { HeartRateZones } from "@/features/onboarding/heart-rate-zones";
import {
  heartRateZoneNames,
  heartRateZoneSource,
  type PaceZones,
} from "@/features/settings/zones";

const integer = new Intl.NumberFormat("fr-FR");

function ZoneCard({
  title,
  aside,
  source,
  caption,
  rows,
  empty,
}: {
  title: string;
  aside: React.ReactNode;
  source: string | null;
  caption: string;
  rows: {
    key: string;
    zone?: string;
    label: string;
    value: string;
    unit: string;
  }[];
  empty: string;
}) {
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-panel border border-border bg-surface min-[1100px]:rounded-surface"
    >
      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-2.5 min-[1100px]:gap-2.5 min-[1100px]:px-5 min-[1100px]:pt-4.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-semibold">{title}</h3>
          {aside}
        </div>
        {source && (
          <ProvenanceLabel source="estimate">{source}</ProvenanceLabel>
        )}
      </div>
      {rows.length > 0 ? (
        <table className="w-full border-collapse text-body min-[1100px]:mx-5 min-[1100px]:mb-3 min-[1100px]:w-[calc(100%-2.5rem)] min-[1100px]:text-sm">
          <caption className="sr-only">{caption}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border-subtle">
                <th
                  scope="row"
                  className="px-4 py-2.75 text-left font-normal min-[1100px]:px-0 min-[1100px]:py-2.5"
                >
                  {row.zone && (
                    <MonoLabel size="nano" tone="secondary" className="mr-2.5">
                      {row.zone}
                    </MonoLabel>
                  )}
                  {row.label}
                </th>
                <td className="px-4 py-2.75 text-right min-[1100px]:px-0 min-[1100px]:py-2.5">
                  <span className="font-metric text-lead font-semibold">
                    {row.value}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {row.unit}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="border-t border-border-subtle px-4 py-3.5 text-sm text-muted min-[1100px]:mx-5 min-[1100px]:px-0">
          {empty}
        </p>
      )}
    </section>
  );
}

export function ProfileZones({
  heartRate,
  paces,
}: {
  heartRate: HeartRateZones | null;
  paces: PaceZones | null;
}) {
  return (
    <section
      aria-labelledby="zones-heading"
      className="flex flex-col gap-2 min-[1100px]:gap-4"
    >
      <div className="flex flex-col gap-1 px-1.5 min-[1100px]:flex-row min-[1100px]:items-baseline min-[1100px]:justify-between min-[1100px]:border-b min-[1100px]:border-border-strong min-[1100px]:px-0 min-[1100px]:pb-2.5">
        <h2
          id="zones-heading"
          className="font-mono text-micro font-normal tracking-wider text-muted-foreground uppercase min-[1100px]:text-label"
        >
          Zones
        </h2>
        <p className="text-xs text-muted-foreground">
          <span className="min-[1100px]:hidden">
            Elles donnent les cibles de chaque séance
          </span>
          <span className="hidden min-[1100px]:inline">
            Recalculées dès que FC max, FC repos ou ton seuil changent
          </span>
        </p>
      </div>
      <div className="grid gap-2 min-[1100px]:grid-cols-2 min-[1100px]:gap-5">
        <ZoneCard
          title="Fréquence cardiaque"
          caption="Zones de fréquence cardiaque"
          aside={
            <a
              href="#entrainement"
              className="-my-2.5 inline-flex min-h-11 items-center text-meta text-accent hover:text-foreground min-[1100px]:my-0 min-[1100px]:min-h-8"
            >
              <span className="min-[1100px]:hidden">Modifier</span>
              <span className="hidden min-[1100px]:inline">
                Modifier FC max ou seuil
              </span>
            </a>
          }
          source={heartRate ? heartRateZoneSource(heartRate) : null}
          rows={(heartRate?.zones ?? []).map((zone) => ({
            key: String(zone.zone),
            zone: `Z${zone.zone}`,
            label: heartRateZoneNames[zone.zone - 1] ?? `Zone ${zone.zone}`,
            value: `${integer.format(zone.lower)}–${integer.format(zone.upper)}`,
            unit: "bpm",
          }))}
          empty="Pas encore de zones : il faut une FC max, relevée en course ou saisie plus haut."
        />
        <ZoneCard
          title="Allures"
          caption="Zones d’allure"
          aside={
            paces?.threshold && (
              <span className="font-metric text-body font-semibold text-muted">
                Seuil {paces.threshold} /km
              </span>
            )
          }
          source={paces?.source ?? null}
          rows={(paces?.rows ?? []).map((row) => ({
            key: row.intensity,
            label: row.label,
            value: row.range,
            unit: "/km",
          }))}
          empty="Pas encore d’allures : il faut une séance au seuil sur le plat, un effort récent ou une VO₂ max Garmin."
        />
      </div>
      <p className="hidden text-meta text-muted-foreground min-[1100px]:block">
        Ces zones donnent les cibles de chaque séance du plan.
      </p>
    </section>
  );
}
