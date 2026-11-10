import Link from "next/link";
import type { ReactNode } from "react";
import { Halo } from "@/components/stride/halo";
import { cn } from "@/lib/utils";

export function Wordmark({
  compactOnMobile = false,
}: {
  compactOnMobile?: boolean;
}) {
  return (
    <Link
      href="/sign-in"
      aria-label="Stride, se connecter"
      className={cn(
        "relative inline-flex w-fit items-center text-foreground",
        compactOnMobile ? "gap-2 md:gap-2.5" : "gap-2.5",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn(
          "fill-none stroke-primary",
          compactOnMobile ? "size-4.5 md:size-6" : "size-6",
        )}
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="m5 21 7-18m0 18 7-18" />
      </svg>
      <span
        className={cn(
          "font-metric font-bold tracking-wider italic",
          compactOnMobile ? "text-lg md:text-2xl" : "text-2xl",
        )}
      >
        STRIDE
      </span>
    </Link>
  );
}

const signInTrajectory =
  "M-20,820 C60,760 120,700 180,690 S260,640 300,560 S360,470 430,440 S520,400 560,330 S640,250 720,230";
const signUpTrajectory =
  "M-20,820 C60,760 120,700 180,690 S260,640 300,560 S360,470 430,440";
const signUpRemainder = "M430,440 C500,410 520,400 560,330 S640,250 720,230";
const mobileTrajectory =
  "M-10,270 C40,240 90,220 140,210 S220,170 260,130 S330,80 400,70";

function Terrain({ signup }: { signup: boolean }) {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 740 900"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden h-full w-full fill-none md:block"
      >
        <g className="stroke-muted" strokeWidth="1.2">
          {Array.from({ length: 9 }, (_, index) => (
            <path
              key={index}
              d={`M-20 ${430 + index * 43} C90 ${395 + index * 43} 165 ${430 + index * 43} 260 ${375 + index * 43} S430 ${245 + index * 43} 535 ${300 + index * 43} S685 ${350 + index * 43} 760 ${334 + index * 43}`}
            />
          ))}
          <path d="M128 292c82-71 161-54 188 12s-80 91-155 59-34-60-33-71Z" />
          {!signup && (
            <path d="M155 301c61-45 105-35 125 6s-77 44-108 28-21-27-17-34Z" />
          )}
        </g>
      </svg>
      <Halo
        viewBox="0 0 700 900"
        preserveAspectRatio="none"
        path={signup ? signUpTrajectory : signInTrajectory}
        pool={
          signup ? { cx: 420, cy: 380, r: 460 } : { cx: 546, cy: 270, r: 500 }
        }
        width={150}
        point={signup ? { x: 430, y: 440 } : { x: 560, y: 330 }}
        scrim="bottom-start"
        className="absolute inset-0 hidden h-full w-full md:block"
      />
      {signup && (
        <svg
          aria-hidden="true"
          viewBox="0 0 700 900"
          preserveAspectRatio="none"
          className="absolute inset-0 hidden h-full w-full fill-none md:block"
        >
          <path
            d={signUpRemainder}
            className="stroke-muted-foreground"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
        </svg>
      )}
      <svg
        aria-hidden="true"
        viewBox="0 0 390 240"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full fill-none md:hidden"
      >
        <g className="stroke-muted" strokeWidth="1.1">
          {Array.from({ length: 5 }, (_, index) => (
            <path
              key={index}
              d={`M-12 ${145 + index * 20}C70 ${105 + index * 20} 110 ${138 + index * 20} 178 ${104 + index * 20}S302 ${49 + index * 20} 402 ${77 + index * 20}`}
            />
          ))}
        </g>
      </svg>
      <Halo
        viewBox="0 0 390 270"
        path={mobileTrajectory}
        pool={{ cx: 312, cy: 68, r: 290 }}
        width={90}
        scrim="bottom"
        className="absolute inset-0 h-full w-full md:hidden"
      />
    </>
  );
}

export function AuthShell({
  children,
  signup = false,
}: {
  children: ReactNode;
  signup?: boolean;
}) {
  return (
    <main className="flex min-h-svh flex-col md:grid md:grid-cols-[1.04fr_1fr]">
      <section
        aria-label="Stride"
        className="relative flex h-60 shrink-0 flex-col justify-between overflow-hidden px-6 pt-14 md:h-auto md:min-h-svh md:px-10 md:py-8"
      >
        <Terrain signup={signup} />
        <Wordmark />
        <div className="relative hidden max-w-130 flex-col gap-5 md:flex">
          <p className="text-[clamp(34px,3.6vw,48px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            {signup
              ? "Six minutes environ pour avoir un coach qui a lu tout ton historique."
              : "Ton coach sait déjà d’où tu viens."}
          </p>
          {signup ? (
            <ol className="flex flex-col gap-2.5 text-[15px] text-secondary-foreground">
              {[
                "Crée ton compte",
                "Connecte Garmin — on importe ton historique",
                "Complète ce que Garmin ne sait pas",
                "Découvre ton profil d’athlète",
              ].map((label, index) => (
                <li key={label} className="flex gap-3">
                  <span
                    className={cn(
                      "w-3.5 font-metric text-[17px]",
                      index === 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Route &amp; trail · Basé sur ton historique Garmin
            </p>
          )}
        </div>
      </section>
      <section
        aria-label={signup ? "Créer un compte" : "Se connecter"}
        className="flex flex-1 flex-col px-6 pb-8 md:m-2 md:justify-center md:rounded-lg md:border md:border-border md:bg-surface-inset md:py-12"
      >
        <div className="mx-auto flex w-full max-w-95 flex-1 flex-col md:flex-none">
          {children}
        </div>
      </section>
    </main>
  );
}
