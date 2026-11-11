"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandalonePage } from "./standalone-page";

export function StandaloneError({ retry }: { retry: () => void }) {
  return (
    <StandalonePage
      alert
      label="Erreur de chargement"
      title="Stride n’a pas pu se charger."
      message="Un service n’a pas répondu à temps. Tes données sont en sécurité : réessaie dans un instant."
    >
      <Button type="button" onClick={retry}>
        Réessayer
      </Button>
      <Button asChild variant="outline">
        <Link href="/">Retour à Stride</Link>
      </Button>
    </StandalonePage>
  );
}
