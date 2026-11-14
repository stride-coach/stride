"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { releasePushSubscription } from "@/features/notifications/components/release-push";
import { clearOnboardingCaches } from "@/features/onboarding/components/use-autosave";
import { clearRaceDayCopies } from "@/features/races/components/race-day-store";
import { signOut } from "@/server/auth/actions";
import { AccountMenuSignOutIcon } from "./account-menu-icons";

function useSignOut() {
  const [pending, startTransition] = useTransition();
  const run = () => {
    clearOnboardingCaches();
    startTransition(async () => {
      await Promise.all([releasePushSubscription(), clearRaceDayCopies()]);
      const result = await signOut();
      if (result.error)
        toast.error("Déconnexion impossible. Réessaie.", { id: "sign-out" });
    });
  };
  return { pending, run };
}

export function SignOutButton({ className }: { className?: string }) {
  const { pending, run } = useSignOut();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={run}
      className={className}
    >
      Se déconnecter
    </Button>
  );
}

export function SignOutMenuItem() {
  const { pending, run } = useSignOut();
  return (
    <DropdownMenuItem
      className="min-h-9 gap-2.5 px-2.5 text-body [&_svg]:text-muted-foreground"
      disabled={pending}
      onSelect={(event) => {
        event.preventDefault();
        run();
      }}
    >
      <AccountMenuSignOutIcon />
      Se déconnecter
    </DropdownMenuItem>
  );
}
