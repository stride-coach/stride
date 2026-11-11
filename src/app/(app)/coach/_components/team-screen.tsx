"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { AppHeader } from "@/features/app-shell/components/app-header";
import {
  StaffAvatar,
  StaffStack,
} from "@/features/coach/components/staff-avatar";
import {
  staff as allStaff,
  staffAgents,
  type SpecialistAgent,
  type StaffAgent,
} from "@/features/coach/staff";
import {
  conversationsLabel,
  opinionsLabel,
  teamProfiles,
  type StaffUsage,
} from "@/features/coach/team";
import { CoachHeaderNav, CoachTabs } from "./coach-tabs";

const specialists = staffAgents.filter(
  (agent): agent is SpecialistAgent => agent !== "coach",
);

function usageOf(agent: StaffAgent, usage: StaffUsage) {
  return agent === "coach"
    ? `${usage.conversations} ${conversationsLabel(usage.conversations)}`
    : `${usage.opinions[agent]} ${opinionsLabel}`;
}

function RoleCard({ agent, usage }: { agent: StaffAgent; usage: StaffUsage }) {
  const member = allStaff[agent];
  const profile = teamProfiles[agent];
  const id = `team-${agent}`;
  return (
    <article
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="flex items-start gap-3">
        <StaffAvatar agent={agent} size={48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={id} className="text-title font-semibold">
            {member.name}
          </h2>
          <span className="text-label text-muted-foreground">
            Membre du staff · IA
          </span>
        </div>
        <span className="pt-1 text-label text-muted-foreground tabular-nums">
          {usageOf(agent, usage)}
        </span>
      </div>
      <p className="text-secondary-foreground">{profile.summary(member)}</p>
      <div className="flex flex-col gap-1.5">
        <span className="text-label font-medium text-muted-foreground">
          {profile.listTitle}
        </span>
        <ul className="flex flex-col gap-1">
          {profile.duties(member).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        <span className="text-label text-muted-foreground">Regarde</span>
        <ul aria-label="Données consultées" className="contents">
          {profile.reads.map((item) => (
            <li key={item}>
              <Chip>{item}</Chip>
            </li>
          ))}
        </ul>
      </div>
      {agent === "coach" && (
        <Button asChild className="self-start">
          <Link href="/coach/new">Écrire au Coach</Link>
        </Button>
      )}
    </article>
  );
}

function Initials({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-7.5 shrink-0 place-items-center rounded-full bg-muted text-label font-semibold"
    >
      {initials}
    </span>
  );
}

function Arrow() {
  return (
    <ArrowRightIcon
      aria-hidden="true"
      className="size-3.5 text-muted-foreground"
    />
  );
}

function Step({
  index,
  title,
  children,
  text,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
  text: string;
}) {
  return (
    <li className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 border-b border-border py-2.5 last:border-b-0">
      <span className="text-muted-foreground tabular-nums">{index}</span>
      <h3 className="font-medium">{title}</h3>
      <span
        aria-hidden="true"
        className="col-start-2 flex min-h-7.5 items-center gap-1.5"
      >
        {children}
      </span>
      <p className="col-start-2 text-label text-secondary-foreground">{text}</p>
    </li>
  );
}

const panelSection =
  "flex flex-col gap-2.5 border-b border-border py-4.5 last:border-b-0";
const panelHeading = "text-label font-medium text-muted-foreground";

function TeamPanel({
  initials,
  usage,
}: {
  initials: string;
  usage: StaffUsage;
}) {
  const opinions = specialists.reduce(
    (sum, agent) => sum + usage.opinions[agent],
    0,
  );
  return (
    <aside
      aria-label="Comment le staff travaille"
      className="flex flex-col px-4 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
    >
      <section aria-labelledby="team-how" className={panelSection}>
        <h2 id="team-how" className={panelHeading}>
          Comment ils travaillent
        </h2>
        <ol className="flex flex-col">
          <Step
            index={1}
            title="Tu écris au Coach"
            text="Une question, une douleur, une nouvelle course. Tu n’as pas à savoir qui consulter."
          >
            <Initials initials={initials} />
            <Arrow />
            <StaffAvatar agent="coach" size={22} decorative />
          </Step>
          <Step
            index={2}
            title="Le Coach passe la main"
            text="Au spécialiste utile, deux au plus. Il te parle directement et te pose ses questions dans la conversation."
          >
            <StaffAvatar agent="coach" size={22} decorative />
            <Arrow />
            <StaffStack agents={specialists} size={22} />
          </Step>
          <Step
            index={3}
            title="Tu décides"
            text="Le staff propose, tu valides ou tu refuses. Ton plan ne change jamais sans toi."
          >
            <StaffAvatar agent="coach" size={22} decorative />
            <Arrow />
            <Initials initials={initials} />
          </Step>
        </ol>
      </section>
      <section aria-labelledby="team-month" className={panelSection}>
        <h2 id="team-month" className={panelHeading}>
          Ce mois-ci
        </h2>
        <dl className="flex flex-col">
          <div className="flex items-baseline justify-between gap-3 border-b border-border py-2">
            <dt className="text-secondary-foreground">Conversations</dt>
            <dd className="font-semibold tabular-nums">
              {usage.conversations}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-secondary-foreground">Avis des spécialistes</dt>
            <dd className="font-semibold tabular-nums">{opinions}</dd>
          </div>
        </dl>
      </section>
      <section className={panelSection}>
        <p className="text-label text-muted-foreground">
          Le staff lit tes données Garmin et ton ressenti. Il propose, tu
          décides. Il ne pose pas de diagnostic.
        </p>
      </section>
    </aside>
  );
}

export function TeamScreen({
  usage,
  initials,
}: {
  usage: StaffUsage;
  initials: string;
}) {
  return (
    <>
      <AppHeader
        title="Coach"
        back={{ href: "/coach", label: "Retour aux conversations" }}
        breadcrumb={<CoachHeaderNav />}
      />
      <CoachTabs className="border-b border-border px-4 py-2.5" />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-18 md:pb-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4.5 md:px-5">
            <div className="flex flex-col gap-2">
              <h1 className="max-w-160 text-verdict font-semibold text-balance">
                Cinq rôles, une seule conversation
              </h1>
              <p className="max-w-170 text-body-lg text-secondary-foreground">
                Tu écris toujours au même endroit. Le Coach te répond et fait
                intervenir le spécialiste concerné quand ta question le demande.
                Ce sont des rôles tenus par une IA, pas des personnes.
              </p>
            </div>
            <div className="grid items-start gap-3 lg:grid-cols-2">
              {staffAgents.map((agent) => (
                <RoleCard key={agent} agent={agent} usage={usage} />
              ))}
            </div>
          </div>
          <TeamPanel initials={initials} usage={usage} />
        </main>
      </div>
    </>
  );
}
