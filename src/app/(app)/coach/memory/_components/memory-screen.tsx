import { AppHeader } from "@/features/app-shell/components/app-header";
import { Chip } from "@/components/stride/chip";
import { Button } from "@/components/ui/button";
import {
  factPeriod,
  factProvenance,
  type Fact,
  type FactGroup,
} from "@/features/coach/memory";
import { CoachHeaderNav, CoachTabs } from "../../_components/coach-tabs";
import { AddFactButton, ClearAllButton, FactRowActions } from "./fact-actions";

function FactRow({ fact, timeZone }: { fact: Fact; timeZone: string }) {
  const period = factPeriod(fact);
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3 md:min-h-11 md:flex-row md:items-center md:gap-4 md:px-5 md:py-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{fact.text}</span>
        {period && (
          <span className="text-label text-muted-foreground">{period}</span>
        )}
      </span>
      <span className="flex items-center justify-between gap-3 md:contents">
        <Chip className="shrink-0">{factProvenance(fact, timeZone)}</Chip>
        <FactRowActions fact={fact} />
      </span>
    </li>
  );
}

function About({ count, groups }: { count: number; groups: FactGroup[] }) {
  return (
    <>
      <section
        aria-labelledby="memory-how"
        className="flex flex-col gap-2 border-b border-border px-4.5 py-3.5"
      >
        <h2
          id="memory-how"
          className="text-label font-medium text-muted-foreground"
        >
          Comment ça marche
        </h2>
        <p className="text-secondary-foreground">
          Le staff s’appuie sur ces lignes pour te répondre. Tu peux corriger ou
          faire oublier chacune d’elles : une ligne oubliée n’est plus utilisée.
        </p>
      </section>
      <section
        aria-labelledby="memory-origin"
        className="flex flex-col items-start gap-2 border-b border-border px-4.5 py-3.5"
      >
        <h2
          id="memory-origin"
          className="text-label font-medium text-muted-foreground"
        >
          D’où ça vient
        </h2>
        <Chip>Tu l’as dit</Chip>
        <p className="text-label leading-normal text-muted-foreground">
          Une information que tu as ajoutée ou corrigée toi-même.
        </p>
      </section>
      <div className="flex items-center gap-2 px-4.5 py-3.5">
        <Button asChild variant="outline">
          <a href="/api/coach/memory/export" download>
            Exporter
          </a>
        </Button>
        <ClearAllButton
          count={count}
          categories={groups.map((group) => group.category)}
        />
      </div>
    </>
  );
}

export function MemoryScreen({
  groups,
  timeZone,
}: {
  groups: FactGroup[];
  timeZone: string;
}) {
  const count = groups.reduce((total, group) => total + group.facts.length, 0);
  return (
    <>
      <AppHeader
        title="Coach"
        back={{ href: "/coach", label: "Retour au fil principal" }}
        breadcrumb={<CoachHeaderNav />}
        actions={<AddFactButton className="max-md:hidden" />}
      />
      <CoachTabs className="border-b border-border px-4 py-2.5" />
      <div className="flex min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain max-md:flex-col">
        <main className="flex min-w-0 flex-1 flex-col pb-tab-bar-reserve md:pb-0">
          <h1 className="sr-only">Ce que le staff sait de toi</h1>
          {count === 0 ? (
            <div className="m-4 flex flex-col items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-body text-secondary-foreground md:m-5">
              <p>
                Tu n’as encore rien ajouté. Dis au staff ce qu’il doit savoir :
                un objectif, une gêne, une habitude, un déplacement.
              </p>
              <AddFactButton className="md:hidden" />
            </div>
          ) : (
            <>
              {groups.map((group, index) => (
                <section
                  key={group.category}
                  aria-labelledby={`memory-${group.category}`}
                >
                  <div
                    className={`flex items-baseline gap-2 border-b border-border bg-card px-4 py-2 md:px-5 ${index > 0 ? "border-t" : ""}`}
                  >
                    <h2
                      id={`memory-${group.category}`}
                      className="text-label font-medium"
                    >
                      {group.label}
                    </h2>
                    <span className="text-label text-muted-foreground tabular-nums">
                      {group.facts.length}
                    </span>
                  </div>
                  <ul>
                    {group.facts.map((fact) => (
                      <FactRow key={fact.id} fact={fact} timeZone={timeZone} />
                    ))}
                  </ul>
                </section>
              ))}
              <div className="flex flex-col gap-3 px-4 py-4 md:hidden">
                <AddFactButton />
              </div>
            </>
          )}
          <div className="border-t border-border md:hidden">
            <About count={count} groups={groups} />
          </div>
        </main>
        <aside
          aria-label="À propos de ces informations"
          className="flex w-panel shrink-0 flex-col border-l border-border max-md:hidden"
        >
          <About count={count} groups={groups} />
        </aside>
      </div>
    </>
  );
}
