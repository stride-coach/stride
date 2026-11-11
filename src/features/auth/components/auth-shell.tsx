import Link from "next/link";
import type { ReactNode } from "react";
import { Relief } from "@/components/stride/relief";
import { StrideMark } from "@/components/stride/stride-mark";
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
      className="relative inline-flex w-fit items-center gap-2 rounded-md font-semibold text-foreground"
    >
      <StrideMark
        className={cn(
          "stroke-primary",
          compactOnMobile ? "size-4 md:size-4.5" : "size-4.5",
        )}
      />
      <span className="text-body-lg">Stride</span>
    </Link>
  );
}

const steps = [
  { title: "Crée ton compte", detail: null },
  { title: "Connecte Garmin", detail: "Stride importe tout ton historique." },
  { title: "Complète ce que Garmin ne sait pas", detail: null },
  { title: "Découvre ton profil d’athlète et ton plan", detail: null },
] as const;

function Pitch() {
  return (
    <div className="relative flex max-w-100 flex-col gap-5">
      <p className="text-metric font-semibold text-balance">
        Un staff qui lit ton corps avant de décider ta séance.
      </p>
      <ol className="flex flex-col border-t border-border">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-y-0.5 border-b border-border py-2.5"
          >
            <span
              className={cn(
                "tabular-nums",
                index === 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span className="font-medium">{step.title}</span>
            {step.detail && (
              <span className="col-start-2 text-label text-secondary-foreground">
                {step.detail}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AuthAside() {
  return (
    <section
      aria-label="Stride"
      className="relative hidden min-h-svh flex-col justify-between px-7 py-6 md:flex"
    >
      <Wordmark />
      <div className="pl-18">
        <Pitch />
      </div>
      <p className="flex gap-1 text-label text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground">
          Conditions d’utilisation
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="hover:text-foreground">
          Politique de confidentialité
        </Link>
      </p>
    </section>
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
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background md:grid md:grid-cols-[1.35fr_1fr] md:bg-shell">
      <Relief corner="top-right" className="print:hidden" />
      <Relief corner="bottom-left" className="max-md:hidden print:hidden" />
      <div className="relative px-4 pt-5 pb-6 md:hidden">
        <Wordmark />
      </div>
      <AuthAside />
      <section
        aria-label={signup ? "Créer un compte" : "Se connecter"}
        className="relative flex flex-1 flex-col px-4 pb-8 md:m-2 md:justify-center md:rounded-xl md:border md:border-border md:bg-background/70 md:px-8 md:py-12"
      >
        <div className="mx-auto flex w-full max-w-95 flex-1 flex-col md:flex-none">
          {children}
        </div>
      </section>
    </main>
  );
}
