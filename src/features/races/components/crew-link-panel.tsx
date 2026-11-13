"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Status } from "@/components/stride/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { renewCrewLink, setCrewLink } from "@/server/races/actions";
import { crewLinkPath } from "../crew-link";
import { actionMessage } from "../messages";

const shared = [
  ["Les points et leurs fenêtres", true],
  ["L’accès et ce qu’il faut te préparer", true],
  ["Ta FC, ta santé, ton ressenti", false],
  ["Ta position en direct", false],
] as const;

export function CrewLinkPanel({
  raceId,
  link,
  origin,
  period,
}: {
  raceId: string;
  link: { token: string; enabled: boolean } | null;
  origin: string | null;
  period: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useOptimistic(link?.enabled ?? false);
  const path = link ? crewLinkPath(link.token) : null;
  const url = path ? `${origin ?? ""}${path}` : null;

  function toggle(next: boolean) {
    startTransition(async () => {
      setEnabled(next);
      const result = await setCrewLink(raceId, next);
      if (result.status !== "saved") toast.error(actionMessage(result.status));
      else
        toast.success(next ? "Lien de suivi activé." : "Lien de suivi coupé.");
    });
  }

  function renew() {
    startTransition(async () => {
      const result = await renewCrewLink(raceId);
      if (result.status !== "saved") toast.error(actionMessage(result.status));
      else toast.success("Nouveau lien créé. L’ancien ne fonctionne plus.");
    });
  }

  async function copy() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).toString(),
      );
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible. Sélectionne le lien pour le copier.");
    }
  }

  async function share() {
    if (!path) return;
    const address = new URL(path, window.location.origin).toString();
    if (typeof navigator.share !== "function") return copy();
    try {
      await navigator.share({ title: "Suivi de course", url: address });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="font-medium">Lien de suivi</span>
          <span className="text-label text-muted-foreground">
            {period ?? "Ajoute la date de la course pour l’activer"}
          </span>
        </span>
        <Switch
          checked={enabled}
          disabled={pending || !period}
          onCheckedChange={toggle}
          aria-label="Lien de suivi"
        />
      </label>
      {enabled && url && (
        <>
          <Button
            type="button"
            size="lg"
            onClick={share}
            className="w-full md:hidden"
          >
            Partager le lien
          </Button>
          <div className="flex gap-2 max-md:hidden">
            <Input
              readOnly
              value={url}
              aria-label="Adresse du lien de suivi"
              onFocus={(event) => event.currentTarget.select()}
              className="h-control-touch min-w-0 flex-1 rounded-lg bg-card md:h-control"
            />
            <Button type="button" variant="outline" onClick={copy}>
              Copier
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={renew}
            className="w-fit"
          >
            Créer un nouveau lien
          </Button>
        </>
      )}
      <div className="flex flex-col">
        <h3 className="text-label font-medium text-secondary-foreground">
          Ce que voit ton assistance
        </h3>
        <ul className="flex flex-col">
          {shared.map(([label, visible]) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              <span>{label}</span>
              <Status
                level={visible ? "ok" : "watch"}
                className={visible ? undefined : "text-muted-foreground"}
              >
                {visible ? "Visible" : "Jamais partagé"}
              </Status>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-label text-muted-foreground">
        Pas besoin de compte. Le lien ne fonctionne que la veille, le jour et le
        lendemain de la course, et tu peux le couper ou le remplacer à tout
        moment.
      </p>
    </div>
  );
}
