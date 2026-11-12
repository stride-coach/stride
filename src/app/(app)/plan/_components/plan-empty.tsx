import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";

export function PlanEmpty() {
  return (
    <section className="flex max-w-160 flex-col gap-4">
      <h1 className="text-verdict font-semibold text-balance">
        Pas encore de programme
      </h1>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        <p className="text-body-lg text-pretty text-secondary-foreground">
          Demande au Coach de construire ton plan. Il part de tes objectifs, de
          tes disponibilités et de ton historique, puis te le propose avant de
          l’enregistrer.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button asChild>
          <Link href="/coach?request=plan">Demander un plan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/races">Vérifier mes courses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/training">Mes disponibilités</Link>
        </Button>
      </div>
    </section>
  );
}
