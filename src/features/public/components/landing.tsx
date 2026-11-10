import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/stride/mono-label";
import { cn } from "@/lib/utils";
import { HealthPreview, ProposalPreview } from "./landing-previews";

const pillars = [
  {
    title: "Lire tes signaux",
    text: "Sommeil, VFC, fréquence cardiaque au repos, Body Battery et disponibilité Garmin chaque matin. Un check-in de dix secondes ajoute tes jambes, tes courbatures et tes douleurs.",
  },
  {
    title: "Doser la charge",
    text: "Montée progressive, semaines d’assimilation, alerte quand la charge grimpe trop vite. Stride suit aussi le kilométrage de tes chaussures pour que tu les changes à temps.",
  },
  {
    title: "Adapter, pas forcer",
    text: "Une douleur signalée, une nuit courte, une semaine chargée : le plan bouge. Chaque changement est expliqué, avec les signaux qui l’ont motivé, et attend ton accord.",
  },
] as const;

const staff = [
  ["Coach", "Construit ton plan et décide de la séance du jour."],
  [
    "Médecin",
    "Suit tes douleurs et ta récupération, et freine quand il le faut.",
  ],
  [
    "Directeur sportif",
    "Garde le cap de ta saison et arbitre entre tes objectifs.",
  ],
  [
    "Stratège de course",
    "Prépare l’allure, le dénivelé et la météo du jour J.",
  ],
  ["Nutritionniste", "Planifie tes apports et tes ravitaillements."],
] as const;

const features = [
  [
    "Plan adaptatif route et trail",
    "Du 10 km à l’ultra, construit autour de tes disponibilités et de tes courses.",
  ],
  [
    "Séances envoyées sur ta montre",
    "Tes fractionnés arrivent dans Garmin Connect, prêts à lancer.",
  ],
  [
    "Analyse de chaque sortie",
    "Prévu contre réalisé, zones, allure, débrief et ressenti.",
  ],
  [
    "Préparation de course",
    "Parcours GPX, stratégie d’allure, météo et plan de ravitaillement.",
  ],
  [
    "Suivi du matériel",
    "Kilométrage et usure de chaque paire, séance par séance.",
  ],
  [
    "Historique complet",
    "Ton passé Garmin est importé dès la connexion : le coach te connaît dès le premier jour.",
  ],
] as const;

const steps = [
  ["Crée ton compte", "Un e-mail et un mot de passe."],
  [
    "Connecte Garmin",
    "Tu choisis ce que tu partages. Ton historique s’importe en arrière-plan.",
  ],
  [
    "Complète ce que Garmin ne sait pas",
    "Disponibilités, objectifs, blessures passées.",
  ],
  ["Reçois ton plan", "Ton coach te propose ta première semaine. Tu valides."],
] as const;

const privacy = [
  "Base de données hébergée en Europe.",
  "Données de santé traitées uniquement avec ton consentement explicite.",
  "Jamais vendues, jamais utilisées pour de la publicité.",
  "Export et suppression de tes données sur simple demande.",
] as const;

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-17 border-b border-border-subtle py-14 md:py-28"
    >
      <div
        className={cn(
          "mx-auto flex max-w-300 flex-col gap-5.5 px-4 md:px-10",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <MonoLabel tone="accent">{children}</MonoLabel>;
}

function Heading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[30px] leading-[1.08] font-semibold tracking-[-0.03em] md:text-[clamp(30px,3.4vw,44px)] md:leading-[1.06]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function Lead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-base leading-relaxed text-secondary-foreground md:text-lead md:leading-relaxed",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Dash() {
  return (
    <span aria-hidden="true" className="text-primary">
      —
    </span>
  );
}

function Terrain() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full fill-none"
    >
      <g className="stroke-surface-current" strokeWidth="1.2">
        {Array.from({ length: 6 }, (_, index) => (
          <path
            key={index}
            d={`M-50 ${480 + index * 40}C${180 + index * 10} ${420 + index * 40} ${340 + index * 10} ${480 + index * 40} ${540 + index * 10} ${420 + index * 40}S${880 + index * 10} ${300 + index * 40} ${1080 + index * 10} ${350 + index * 40}S1380 ${400 + index * 40} 1500 ${360 + index * 40}`}
          />
        ))}
      </g>
      <path
        d="M-20 720C140 680 260 640 380 630S560 580 640 520 780 450 900 430 1080 400 1180 330 1340 260 1460 240"
        className="hidden stroke-primary md:block"
        strokeWidth="2"
      />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      <Terrain />
      <div className="relative mx-auto grid max-w-300 gap-14 px-4 pt-12 pb-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:px-10 md:pt-24 md:pb-26">
        <div className="flex flex-col gap-5.5 md:gap-6.5">
          <MonoLabel>
            Coach running · Route &amp; trail ·{" "}
            <span className="md:hidden">Garmin</span>
            <span className="hidden md:inline">Connecté à Garmin</span>
          </MonoLabel>
          <h1 className="text-[42px] leading-none font-semibold tracking-[-0.04em] md:text-[clamp(44px,5.6vw,76px)] md:leading-[0.98]">
            Progresse
            <br />
            sans te blesser.
          </h1>
          <Lead className="max-w-125">
            Stride lit ton sommeil, ta VFC, ta charge et tes douleurs avant
            chaque séance, puis ajuste ton plan. Tu enchaînes les saisons
            <span className="hidden md:inline"> de route et de trail</span>, pas
            les arrêts.
          </Lead>
          <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-3">
            <Button asChild size="lg" className="md:h-11.5">
              <Link href="/sign-up">Créer un compte</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 md:h-11.5"
            >
              <a href="#prevention">Voir l’approche prévention</a>
            </Button>
          </div>
          <p className="text-meta text-muted-foreground">
            Garmin aujourd’hui. Coros et Suunto à l’étude.
          </p>
        </div>
        <ProposalPreview />
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <main>
      <Hero />

      <Section id="prevention" className="md:gap-14">
        <div className="flex max-w-190 flex-col gap-5.5 md:gap-4.5">
          <Kicker>01 · Prévention</Kicker>
          <Heading>
            Un plan, tout le monde en fait. Le tenir sans se blesser, c’est le
            vrai sujet.
          </Heading>
          <Lead>
            <span className="hidden md:inline">
              La plupart des apps te donnent un programme et te laissent
              l’appliquer.{" "}
            </span>
            Stride regarde d’abord dans quel état tu es, puis décide de ce que
            tu peux encaisser aujourd’hui.
          </Lead>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3 md:rounded-2xl">
          {pillars.map((pillar, index) => (
            <li
              key={pillar.title}
              className="flex flex-col gap-2 bg-surface-inset p-5 md:gap-3.5 md:p-7.5"
            >
              <span className="font-metric text-[30px] leading-none font-semibold text-primary md:text-[44px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold md:text-[21px] md:tracking-[-0.015em]">
                {pillar.title}
              </h3>
              <p className="text-body leading-normal text-secondary-foreground md:leading-relaxed">
                {pillar.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="sante"
        className="md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-16"
      >
        <div className="flex flex-col gap-5.5 md:gap-4.5">
          <Kicker>02 · Données santé</Kicker>
          <Heading>
            Garmin mesure.
            <br className="hidden md:block" /> Stride explique.
          </Heading>
          <Lead>
            Tes tendances de VFC, de sommeil et de fréquence cardiaque au repos
            sont comparées à ta propre référence, pas à une moyenne. Chaque
            chiffre affiche sa source, sa tendance et ce qu’il change pour ta
            prochaine séance.
          </Lead>
          <ul className="hidden flex-col gap-2.5 text-body text-secondary-foreground md:flex">
            {[
              "Forme, fatigue et charge sur 6 semaines",
              "Récupération nuit après nuit",
              "Douleurs suivies jusqu’à leur résolution",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Dash />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <HealthPreview />
      </Section>

      <Section id="staff" className="md:gap-12">
        <div className="flex max-w-190 flex-col gap-5.5 md:gap-4.5">
          <Kicker>03 · Le staff</Kicker>
          <Heading>Un staff complet, pas un chatbot.</Heading>
          <Lead className="hidden md:block">
            Cinq spécialistes lisent le même dossier d’athlète et parlent d’une
            seule voix. Tu peux écrire à chacun d’eux.
          </Lead>
        </div>
        <ul className="flex flex-col border-b border-border md:grid md:grid-cols-5 md:gap-3 md:border-0">
          {staff.map(([role, text]) => (
            <li
              key={role}
              className="flex flex-col gap-1 border-t border-border py-3.5 md:gap-2.5 md:rounded-xl md:border md:bg-surface-inset md:p-5.5"
            >
              <MonoLabel tone="accent">{role}</MonoLabel>
              <p className="text-body text-secondary-foreground md:text-sm md:leading-normal">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="md:gap-10">
        <Heading className="max-w-190">
          Et tout ce qu’on attend d’un coach.
        </Heading>
        <ul className="grid border-b border-border md:grid-cols-3 md:gap-x-12 md:border-0">
          {features.map(([title, text]) => (
            <li
              key={title}
              className="flex flex-col gap-1 border-t border-border py-3.5 md:gap-2 md:py-5.5"
            >
              <h3 className="text-base font-semibold md:text-[17px]">
                {title}
              </h3>
              <p className="text-body leading-normal text-secondary-foreground">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="comment" className="md:grid md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-5.5 md:gap-4.5">
          <Kicker>04 · Comment ça marche</Kicker>
          <Heading>Six minutes pour démarrer.</Heading>
        </div>
        <ol className="flex flex-col border-b border-border">
          {steps.map(([title, text], index) => (
            <li
              key={title}
              className="grid grid-cols-[36px_1fr] gap-2 border-t border-border py-3.5 md:grid-cols-[56px_1fr] md:gap-3 md:py-5"
            >
              <span className="font-metric text-2xl leading-none font-semibold text-primary md:text-[30px]">
                {index + 1}
              </span>
              <div className="flex flex-col md:gap-1.5">
                <h3 className="text-base font-semibold md:text-[17px]">
                  {title}
                </h3>
                <p className="text-body text-secondary-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="md:grid md:grid-cols-2 md:items-start md:gap-16">
        <div className="flex flex-col gap-5.5 md:gap-4.5">
          <Kicker>05 · Confidentialité</Kicker>
          <Heading>Tes données santé restent les tiennes.</Heading>
        </div>
        <div className="flex flex-col gap-2 md:gap-5.5">
          <ul className="flex flex-col gap-2.5 text-body leading-normal text-secondary-foreground md:gap-3.5">
            {privacy.map((item) => (
              <li key={item} className="flex gap-2.5 md:gap-3">
                <Dash />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/privacy"
            className="w-fit rounded-md py-2.5 text-body text-primary hover:text-foreground"
          >
            Lire la politique de confidentialité
          </Link>
        </div>
      </Section>

      <section className="px-4 py-16 text-center md:py-30">
        <div className="mx-auto flex max-w-300 flex-col items-center gap-4.5 md:gap-6">
          <h2 className="max-w-205 text-[38px] leading-none font-semibold tracking-[-0.035em] md:text-[clamp(36px,4.4vw,60px)]">
            Cours encore dans dix ans.
          </h2>
          <Lead className="max-w-130">
            Crée ton compte, connecte ta montre, et laisse le staff faire le
            tri.
          </Lead>
          <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:gap-3">
            <Button asChild size="lg" className="md:h-11.5">
              <Link href="/sign-up">Créer un compte</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 md:h-11.5"
            >
              <Link href="/sign-in">Se connecter</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
