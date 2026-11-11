import { DataActivityProvider } from "@/features/data-activity/components/provider";
import { NotificationsProvider } from "@/features/notifications/components/notifications-context";
import { SettingsShell } from "@/features/settings/components/settings-shell";
import { getShellIdentity, getShellNotifications } from "@/server/app/shell";
import { requireAthleteAccount } from "@/server/app/session";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAthleteAccount();
  const notifications = getShellNotifications();
  const identity = await getShellIdentity();
  return (
    <NotificationsProvider feed={notifications} now={new Date().toISOString()}>
      <DataActivityProvider>
        <SettingsShell athlete={identity.athlete}>{children}</SettingsShell>
      </DataActivityProvider>
    </NotificationsProvider>
  );
}
