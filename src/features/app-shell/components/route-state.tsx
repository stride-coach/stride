import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { missingItems, type MissingItem } from "../route-state";
import { AppHeader } from "./app-header";

const actionsClass =
  "mt-auto flex flex-col gap-2 pt-8 md:mt-2 md:flex-row md:flex-wrap md:justify-center md:pt-0";

const stateClass =
  "flex w-full max-w-110 flex-1 flex-col gap-2.5 md:flex-none md:items-center md:text-center";

export function RouteStateFrame({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader title={section} />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex min-h-full flex-col px-4 pt-8 pb-6 md:items-center md:justify-center md:p-12">
          {children}
        </main>
      </div>
    </>
  );
}

export function RouteError({
  retry,
  className,
}: {
  retry: () => void;
  className?: string;
}) {
  return (
    <section
      role="alert"
      aria-labelledby="route-error-title"
      className={cn(stateClass, className)}
    >
      <p className="text-label text-muted-foreground">Erreur de chargement</p>
      <h1 id="route-error-title" className="text-verdict font-semibold">
        Cette page n’a pas pu se charger.
      </h1>
      <p className="text-body-lg text-pretty text-secondary-foreground">
        Un service n’a pas répondu à temps. Tes données sont en sécurité :
        réessaie, ou repars d’Aujourd’hui.
      </p>
      <div className={actionsClass}>
        <Button type="button" onClick={retry}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/today">Retour à Aujourd’hui</Link>
        </Button>
      </div>
    </section>
  );
}

export function RouteNotFound({ item }: { item: MissingItem }) {
  const { title, message, action } = missingItems[item];
  return (
    <section aria-labelledby="route-not-found-title" className={stateClass}>
      <p className="text-label text-muted-foreground">Introuvable</p>
      <h1 id="route-not-found-title" className="text-verdict font-semibold">
        {title}
      </h1>
      <p className="text-body-lg text-pretty text-secondary-foreground">
        {message}
      </p>
      <div className={actionsClass}>
        {action && (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
        <Button asChild variant={action ? "outline" : "default"}>
          <Link href="/today">Retour à Aujourd’hui</Link>
        </Button>
      </div>
    </section>
  );
}
