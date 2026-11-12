import type { Metadata } from "next";
import { StrideLogo } from "@/components/stride/stride-logo";
import { Widget } from "@/components/stride/widget";
import { readCrewPage } from "@/server/races/crew-link";

export const metadata: Metadata = {
  title: "Suivi d’assistance",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CrewTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const page = await readCrewPage(token);
  return (
    <main className="mx-auto flex min-h-dvh max-w-180 flex-col gap-5 bg-background px-4 py-6 text-body text-foreground">
      <StrideLogo className="h-5 w-auto self-start" />
      {page ? (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="text-title font-semibold">{page.name}</h1>
            <p className="text-secondary-foreground">
              {[page.date, `départ ${page.start}`].filter(Boolean).join(" · ")}
            </p>
          </header>
          <p className="text-pretty">
            {page.crew.windows
              ? "Chaque fenêtre va du scénario le plus rapide au plus prudent : arrive au début de la fenêtre."
              : "Les heures suivent le plan de course : prévois un peu d’avance."}
          </p>
          <Widget
            headingLevel={2}
            aria-labelledby="crew-meet"
            title={<span id="crew-meet">Où et quand se retrouver</span>}
          >
            <ul className="flex flex-col">
              {page.crew.points.map((point) => (
                <li
                  key={point.id}
                  className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {point.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        {point.distance}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {point.window ?? point.planned}
                    </span>
                  </div>
                  {point.window && (
                    <span className="text-label text-muted-foreground">
                      Passage prévu {point.planned}
                    </span>
                  )}
                  {point.access && (
                    <span className="text-secondary-foreground">
                      {point.access}
                    </span>
                  )}
                  {point.prepare && <span>À préparer : {point.prepare}</span>}
                </li>
              ))}
            </ul>
          </Widget>
          {page.crew.gaps.length > 0 && (
            <Widget
              headingLevel={2}
              aria-labelledby="crew-none"
              title={<span id="crew-none">Sans assistance</span>}
            >
              <ul className="flex flex-col">
                {page.crew.gaps.map((gap) => (
                  <li
                    key={gap.id}
                    className="flex justify-between gap-3 border-b border-border py-2 last:border-b-0"
                  >
                    <span className="font-medium">{gap.name}</span>
                    <span className="text-right text-secondary-foreground">
                      {gap.reason ?? "Assistance non prévue"}
                    </span>
                  </li>
                ))}
              </ul>
            </Widget>
          )}
        </>
      ) : (
        <section className="flex flex-col gap-2">
          <h1 className="text-title font-semibold">
            Ce lien de suivi n’est pas actif
          </h1>
          <p className="text-secondary-foreground">
            Un lien de suivi ne fonctionne que la veille, le jour et le
            lendemain de la course, tant qu’il n’a pas été coupé ou remplacé.
            Demande un nouveau lien à la personne qui court.
          </p>
        </section>
      )}
    </main>
  );
}
