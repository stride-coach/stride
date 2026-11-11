import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { Relief } from "@/components/stride/relief";
import { AuthAside, Wordmark } from "./auth-shell";
import { cn } from "@/lib/utils";

export function RecoveryShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background md:grid md:grid-cols-[1.35fr_1fr] md:bg-shell">
      <Relief corner="top-right" className="print:hidden" />
      <Relief corner="bottom-left" className="max-md:hidden print:hidden" />
      <AuthAside />
      <div className="relative flex flex-1 flex-col md:m-2 md:overflow-y-auto md:rounded-xl md:border md:border-border md:bg-background">
        <header className="flex min-h-13 items-center gap-4 px-4 pt-3 md:min-h-0 md:px-8 md:pt-8">
          <Link
            href="/sign-in"
            className="-ml-2.5 inline-flex min-h-11 items-center gap-1 rounded-md pr-2 text-body text-secondary-foreground hover:text-foreground md:ml-0 md:min-h-control md:text-primary md:hover:underline"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
            Retour à la connexion
          </Link>
          <div className="ml-auto md:hidden">
            <Wordmark compactOnMobile />
          </div>
        </header>
        <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4 md:px-8">
          <p className="text-label text-secondary-foreground">
            Mot de passe oublié · trois étapes
          </p>
          <h1 className="text-metric font-semibold text-balance">
            Retour sur pied en une minute.
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

export function RecoveryStage({
  number,
  title,
  active,
  children,
}: {
  number: number;
  title: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-current={active ? "step" : undefined}
      className="flex min-w-0 flex-col gap-3 border-t border-border px-4 py-4.5 md:px-8"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-label font-semibold tabular-nums",
            active
              ? "bg-primary text-primary-foreground"
              : "border border-control-border text-secondary-foreground",
          )}
        >
          {number}
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function EnvelopeMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 28"
      className="h-7 w-9 fill-none"
      strokeWidth="1.5"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="26"
        rx="4"
        className="stroke-foreground"
      />
      <path d="M2 3 18 15 34 3" className="stroke-primary" />
    </svg>
  );
}
