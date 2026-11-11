import { DataActivityProvider } from "@/features/data-activity/components/provider";
import { NotificationsProvider } from "@/features/notifications/components/notifications-context";
import { shellProfileDetail } from "@/features/app-shell/shell";
import { SettingsShell } from "@/features/settings/components/settings-shell";
import {
  getShellIdentity,
  getShellNotifications,
  getShellSeasons,
} from "@/server/app/shell";
import { requireAthleteAccount } from "@/server/app/session";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAthleteAccount();
  const notifications = getShellNotifications();
  const seasons = getShellSeasons();
  const identity = await getShellIdentity();
  return (
    <NotificationsProvider feed={notifications} now={new Date().toISOString()}>
      <DataActivityProvider>
        <SettingsShell
          athlete={identity.athlete}
          goal={identity.goal}
          seasons={seasons}
          modelDetail={shellProfileDetail(identity.account)}
        >
          {children}
        </SettingsShell>
      </DataActivityProvider>
    </NotificationsProvider>
  );
}
