"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDataActivityNavigation } from "@/features/data-activity/components/navigation";
import { removeRace } from "@/server/races/goals";

export function RemoveRaceButton({ id, name }: { id: string; name: string }) {
  const navigate = useDataActivityNavigation();
  const [pending, startTransition] = useTransition();
  function remove() {
    startTransition(async () => {
      const result = await removeRace(id);
      if (result.status === "deleted") {
        toast.success("Course supprimée.");
        navigate("/races");
        return;
      }
      toast.error(
        result.status === "session-expired"
          ? "Ta session a expiré. Connecte-toi à nouveau."
          : "Impossible de supprimer la course. Réessaie.",
      );
    });
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          Supprimer la course
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette course sera retirée de tes objectifs. Tes activités Garmin
            importées resteront disponibles.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Garder la course</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={remove}
          >
            Supprimer la course
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
