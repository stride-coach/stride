import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { attachmentDate } from "@/features/coach/attachments";
import { staff, type StaffAgent } from "@/features/coach/staff";
import { decisionsLabel } from "@/features/coach/topics";

const section =
  "flex flex-col gap-2.5 border-b border-border py-4.5 first:pt-0 last:border-b-0";
const heading = "text-label font-medium text-muted-foreground";

function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string | null;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-baseline gap-2">
      <dt className="text-secondary-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
      {detail ? (
        <dd className="text-label text-muted-foreground">{detail}</dd>
      ) : (
        <dd aria-hidden="true" />
      )}
    </div>
  );
}

export function TopicAside({
  race,
  lead,
  companions,
  decisions,
  closed,
}: {
  race: { id: string; title: string; date: string | null } | null;
  lead: StaffAgent;
  companions: readonly StaffAgent[];
  decisions: number;
  closed: boolean;
}) {
  return (
    <div className="flex flex-col">
      <section aria-labelledby="topic-facts" className={section}>
        <h2 id="topic-facts" className={heading}>
          Ce sujet
        </h2>
        <dl className="flex flex-col gap-2">
          {race && (
            <Fact
              label="Lié à"
              value={
                <Link href={`/races/${race.id}`} className="hover:underline">
                  {race.title}
                </Link>
              }
              detail={race.date ? attachmentDate(race.date) : null}
            />
          )}
          <Fact label="Mené par" value={staff[lead].name} />
          {companions.length > 0 && (
            <Fact
              label="Avec"
              value={companions.map((agent) => staff[agent].name).join(", ")}
            />
          )}
          <Fact label="Décisions" value={decisionsLabel(decisions)} />
        </dl>
      </section>
      <section aria-labelledby="topic-close" className={section}>
        <h2 id="topic-close" className={heading}>
          {closed ? "Sujet clos" : "Quand tu le clos"}
        </h2>
        <p className="text-secondary-foreground">
          {closed
            ? "Son résumé et ses décisions sont dans le fil principal. Le sujet reste lisible ici."
            : "Le staff en garde un résumé dans le fil principal, avec les décisions prises. Le sujet reste lisible."}
        </p>
      </section>
      <section aria-labelledby="topic-rest" className={section}>
        <h2 id="topic-rest" className={heading}>
          Le reste continue
        </h2>
        <p className="text-secondary-foreground">
          La séance du jour, les alertes et les propositions arrivent toujours
          dans le fil principal, pas ici.
        </p>
        <Link href="/coach" className="self-start text-primary hover:underline">
          Revenir au fil principal
        </Link>
      </section>
    </div>
  );
}
