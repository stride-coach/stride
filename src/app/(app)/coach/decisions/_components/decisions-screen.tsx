import { AppHeader } from "@/features/app-shell/components/app-header";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import {
  decisionWindowDays,
  monthCountLabel,
  type DecisionEntry,
  type DecisionsView,
  type SelectedDecision,
} from "@/features/coach/decisions";
import { CoachHeaderNav, CoachTabs } from "../../_components/coach-tabs";
import { DecisionResponseState } from "./decision-response";
import { DecisionSheet } from "./decision-sheet";

const columns =
  "md:grid-cols-[76px_26px_minmax(0,1.25fr)_104px_minmax(0,1fr)] md:gap-x-3";

function DecisionRow({ entry }: { entry: DecisionEntry }) {
  return (
    <li className="border-b border-border">
      <Link
        href={`/coach/decisions?decision=${entry.id}`}
        prefetch={false}
        scroll={false}
        data-decision-id={entry.id}
        className={`grid grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 px-4 py-3 transition-colors duration-150 ease-stride hover:bg-muted focus-visible:outline-offset-[-2px] md:min-h-14 md:items-center md:px-5 md:py-2 ${columns}`}
      >
        <span className="text-label text-muted-foreground tabular-nums max-md:hidden">
          {entry.day}
        </span>
        <span className="max-md:row-span-3 max-md:pt-0.5">
          <StaffAvatar agent={entry.agent} size={22} decorative />
        </span>
        <span className="flex min-w-0 items-baseline gap-2 md:hidden">
          <span className="text-label text-muted-foreground">
            {entry.role} · {entry.day}
          </span>
          <DecisionResponseState
            response={entry.response}
            className="ml-auto"
          />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium max-md:text-body-lg md:truncate">
            {entry.title}
          </span>
          <span className="truncate text-label text-muted-foreground max-md:hidden">
            {entry.reason ? `${entry.role} · ${entry.reason}` : entry.role}
          </span>
          <span className="text-label leading-snug text-muted-foreground md:hidden">
            {[entry.reason, entry.outcome]
              .filter((part): part is string => Boolean(part))
              .map((part) => part.replace(/\.$/, ""))
              .join(". ")}
          </span>
        </span>
        <span className="max-md:hidden">
          <DecisionResponseState response={entry.response} />
        </span>
        <span className="text-label leading-snug text-secondary-foreground max-md:hidden">
          {entry.outcome}
        </span>
      </Link>
    </li>
  );
}

function SummaryPanel({ view }: { view: DecisionsView }) {
  const rows = [
    ["Propositions", view.summary.proposals],
    ["Acceptées", view.summary.accepted],
    ["Modifiées", view.summary.modified],
    ["Refusées", view.summary.rejected],
  ] as const;
  return (
    <aside
      aria-label="Résumé des décisions"
      className="flex w-panel shrink-0 flex-col border-l border-border max-md:hidden"
    >
      <section
        aria-labelledby="decisions-recent"
        className="flex flex-col gap-2 border-b border-border px-4.5 py-3.5"
      >
        <h2
          id="decisions-recent"
          className="text-label font-medium text-muted-foreground"
        >
          {decisionWindowDays} derniers jours
        </h2>
        <dl className="flex flex-col">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 py-1.5"
            >
              <dt className="text-secondary-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {view.recovery && (
        <section
          aria-labelledby="decisions-recovery"
          className="flex flex-col gap-2 border-b border-border px-4.5 py-3.5"
        >
          <h2
            id="decisions-recovery"
            className="text-label font-medium text-muted-foreground"
          >
            Retour dans ta plage après une alerte
          </h2>
          <dl className="flex flex-col">
            {view.recovery.groups.map((group) => (
              <div
                key={group.kind}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <dt className="text-secondary-foreground">{group.label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-medium tabular-nums">{group.days}</span>
                  <span className="text-label text-muted-foreground tabular-nums">
                    {group.cases} cas
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          {view.recovery.caution && (
            <p className="text-label leading-normal text-muted-foreground">
              {view.recovery.caution}
            </p>
          )}
        </section>
      )}
      <p className="px-4.5 py-3.5 text-label leading-normal text-muted-foreground">
        Chaque proposition du staff est gardée ici, avec ta réponse. Refuser ne
        change rien à la suite : le staff s’adapte à ce que tu as fait.
      </p>
    </aside>
  );
}

export function DecisionsScreen({
  view,
  selected,
}: {
  view: DecisionsView;
  selected: SelectedDecision | null;
}) {
  return (
    <>
      <AppHeader
        title="Coach"
        back={{ href: "/coach", label: "Retour au fil principal" }}
        breadcrumb={<CoachHeaderNav />}
      />
      <CoachTabs className="border-b border-border px-4 py-2.5" />
      <div className="flex min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex min-w-0 flex-1 flex-col pb-tab-bar-reserve md:pb-0">
          <h1 className="sr-only">Décisions du staff</h1>
          {view.empty ? (
            <p className="m-4 rounded-xl border border-border bg-card px-4 py-3.5 text-body text-secondary-foreground md:m-5">
              Aucune proposition pour l’instant. Les changements proposés par le
              staff apparaîtront ici, avec ta réponse.
            </p>
          ) : (
            view.months.map((month, index) => (
              <section
                key={month.key}
                aria-labelledby={`decisions-${month.key}`}
              >
                <div
                  className={`flex items-baseline justify-between border-b border-border bg-card px-4 py-2 md:px-5 ${index > 0 ? "border-t" : ""}`}
                >
                  <h2
                    id={`decisions-${month.key}`}
                    className="text-label font-medium"
                  >
                    {month.label}
                  </h2>
                  <span className="text-label text-muted-foreground">
                    {monthCountLabel(month.count)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className={`hidden min-h-7.5 items-center border-b border-border px-5 text-label text-muted-foreground md:grid ${columns}`}
                >
                  <span>Date</span>
                  <span />
                  <span>Proposition</span>
                  <span>Ta réponse</span>
                  <span>Ce que ça a donné</span>
                </div>
                <ul>
                  {month.entries.map((entry) => (
                    <DecisionRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </main>
        {!view.empty && <SummaryPanel view={view} />}
      </div>
      {selected && <DecisionSheet selected={selected} />}
    </>
  );
}
