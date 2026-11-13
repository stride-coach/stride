"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adoptRaceWeather } from "@/server/races/weather-actions";
import { actionMessage } from "../messages";

export function AdoptWeather({
  raceId,
  observedOn,
}: {
  raceId: string;
  observedOn: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await adoptRaceWeather({ raceId, observedOn });
          if (result.status !== "saved")
            toast.error(actionMessage(result.status));
          else toast.success("Le plan suit la nouvelle météo.");
        })
      }
    >
      Prendre la nouvelle météo
    </Button>
  );
}
