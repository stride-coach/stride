import type { Metadata } from "next";
import Link from "next/link";
import { UploadIcon } from "lucide-react";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { localToday } from "@/features/app-shell/shell";
import { coachRequestHref } from "@/features/coach/request";
import { raceWorkspaceId } from "@/features/races/map";
import { raceOnTrack } from "@/features/races/on-track";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { requireAthlete } from "@/server/app/session";
import { loadOnTrackInputs } from "@/server/races/on-track";
import { RaceHeader } from "@/features/races/components/race-header";
import { RaceBreadcrumb, RaceTabs } from "@/features/races/components/race-nav";
import { loadRace } from "@/server/races/load";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { data } = await loadRace((await params).id);
  return { title: `${data.race.name} · Courses` };
}

export default async function RaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ data, today }, inputs] = await Promise.all([
    loadRace(id),
    requireAthlete().then((context) =>
      loadOnTrackInputs(context, localToday(new Date())),
    ),
  ]);
  const phase = raceOnTrack(data.race, inputs, null)?.goal.phase?.label ?? null;
  const base = `/races/${data.race.id}`;
  return (
    <>
      <AppHeader
        title="Courses"
        back={{ href: "/races", label: "Retour aux courses" }}
        className="print:hidden"
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="shrink-0 max-md:hidden"
            >
              <Link href={`${base}/course`}>
                <UploadIcon aria-hidden="true" className="size-3.5" />
                Importer un GPX
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-control-touch shrink-0 md:hidden"
            >
              <Link
                href={coachRequestHref(null, null, data.race.id)}
                aria-label="Poser une question sur cette course"
              >
                <StrideMark className="size-4" />
              </Link>
            </Button>
          </>
        }
        breadcrumb={
          <div className="flex min-w-0 items-stretch gap-6 self-stretch">
            <RaceBreadcrumb
              raceId={data.race.id}
              name={data.race.name}
              replacing={data.course !== null}
              kind={data.race.kind}
            />
            <RaceTabs
              raceId={data.race.id}
              kind={data.race.kind}
              variant="header"
            />
          </div>
        }
      />
      <RaceTabs raceId={data.race.id} kind={data.race.kind} variant="pills" />
      <div
        id={raceWorkspaceId}
        className="relative flex min-h-0 flex-1 flex-col print:block"
      >
        <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain print:overflow-visible">
          <main className="flex w-full flex-col pb-18 md:pb-6 print:gap-3 print:p-0">
            <RaceHeader
              race={data.race}
              plan={data.plan}
              course={data.course}
              waypoints={data.waypoints}
              today={today}
              phase={phase}
            />
            <div className="flex flex-col gap-5 px-4 py-4.5 md:gap-6 md:px-5 print:p-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
