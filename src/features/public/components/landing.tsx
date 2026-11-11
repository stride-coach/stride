import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import {
  NavPlanIcon,
  NavProgressIcon,
  NavRacesIcon,
} from "@/components/stride/nav-icons";
import { Relief } from "@/components/stride/relief";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import type { StaffAgent } from "@/features/coach/staff";
import { TodayPreview } from "./landing-previews";

const pillars = [
  {
    icon: NavProgressIcon,
    title: "Tes plages, pas des moyennes",
    text: "Sommeil, VFC, FC au repos, charge : chaque signal est lu par rapport à ce qui est normal pour toi, calculé sur tes 28 derniers jours.",
  },
  {
    icon: NavPlanIcon,
    title: "Un plan qui bouge avec toi",
    text: "Une nuit courte, une douleur, une semaine chargée : le staff propose un ajustement, avec sa raison. Tu acceptes ou tu refuses.",
  },
  {
    icon: NavRacesIcon,
    title: "Une course préparée de bout en bout",
    text: "Programme à rebours depuis ta date, stratégie par section, alimentation testée en sortie longue, équipement prêt.",
  },
] as const;

const roles: readonly { agent: StaffAgent; name: string; text: string }[] = [
  { agent: "coach", name: "Coach", text: "Ton entraînement au quotidien" },
  {
    agent: "medical",
    name: "Santé",
    text: "Ta récupération et les signaux de ton corps",
  },
  {
    agent: "director",
    name: "Directeur sportif",
    text: "Ta saison dans son ensemble",
  },
  {
    agent: "strategist",
    name: "Stratège de course",
    text: "Le parcours, ton objectif sur ce parcours et ta gestion de course",
  },
  {
    agent: "nutritionist",
    name: "Nutrition",
    text: "Ce que tu manges autour de tes séances et en course",
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <Relief corner="top-right" className="max-md:hidden" />
      <div className="relative mx-auto grid max-w-300 gap-10 px-4 pt-10 pb-12 md:px-10 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div className="flex flex-col items-start gap-5">
          <Chip proposal>Route, trail et ultra · avec Garmin</Chip>
          <h1 className="text-display font-semibold text-balance">
            Un staff qui lit ton corps avant de décider ta séance.
          </h1>
          <p className="max-w-130 text-body-lg text-pretty text-secondary-foreground">
            Chaque matin, Stride compare ton sommeil, ta VFC et ta charge à tes
            propres plages, puis ajuste ton plan. Pour arriver au départ en
            forme, et pas blessé.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/sign-up">Créer un compte</Link>
            </Button>
            <span className="text-label text-secondary-foreground max-sm:text-center">
              Garmin requis · environ 6 minutes
            </span>
          </div>
        </div>
        <TodayPreview />
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <main>
      <Hero />

      <section
        id="comment"
        aria-labelledby="comment-title"
        className="scroll-mt-15 border-b border-border"
      >
        <h2 id="comment-title" className="sr-only">
          Comment ça marche
        </h2>
        <ul className="mx-auto grid max-w-300 gap-8 px-4 py-12 md:grid-cols-3 md:gap-10 md:px-10 md:py-16">
          {pillars.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-control-touch place-items-center rounded-md border border-control-border bg-card text-secondary-foreground"
              >
                <Icon className="size-4" />
              </span>
              <h3 className="text-title font-semibold">{title}</h3>
              <p className="text-body-lg text-pretty text-secondary-foreground">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="staff"
        aria-labelledby="staff-title"
        className="scroll-mt-15"
      >
        <div className="mx-auto flex max-w-300 flex-col gap-6 px-4 py-12 md:px-10 md:py-16">
          <div className="flex flex-col gap-2">
            <h2
              id="staff-title"
              className="text-metric font-semibold text-balance"
            >
              Cinq rôles, une seule conversation.
            </h2>
            <p className="text-body-lg text-secondary-foreground">
              Tu écris au même endroit. Le bon spécialiste répond, avec tes
              données sous les yeux.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {roles.map((role) => (
              <li
                key={role.agent}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <StaffAvatar agent={role.agent} size={30} decorative />
                <h3 className="font-semibold">{role.name}</h3>
                <p className="text-label text-secondary-foreground">
                  {role.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
