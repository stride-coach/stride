import type { Metadata } from "next";
import { PushSettings } from "@/features/notifications/components/push-settings";
import { SettingsHeading } from "@/features/settings/components/settings-shell";
import { requireAthleteAccount } from "@/server/app/session";
import { readPushSettings } from "@/server/push/preferences";

export const metadata: Metadata = { title: "Notifications · Réglages" };

export default async function NotificationSettingsPage() {
  const context = await requireAthleteAccount();
  const push = await readPushSettings(context);
  return (
    <>
      <SettingsHeading
        title="Notifications"
        description="Tout reste dans ta cloche, même quand une notification est coupée ici."
      />
      <PushSettings
        title="Sur tes appareils"
        publicKey={push.publicKey}
        preferences={push.preferences}
        endpoints={push.endpoints}
      />
    </>
  );
}
