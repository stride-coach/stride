import { redirect } from "next/navigation";
import { requireAthlete } from "@/server/app/session";
import { loadSessionSheet } from "@/server/plans/session-sheet";
import { SessionSheet } from "../../../../plan/_components/session-sheet";

export default async function SessionPanelOverlay({
  params,
}: {
  params: Promise<{ sessionKey: string }>;
}) {
  const [context, { sessionKey }] = await Promise.all([
    requireAthlete(),
    params,
  ]);
  const sheet = await loadSessionSheet(context, sessionKey);
  if (!sheet) redirect(`/plan?session=${encodeURIComponent(sessionKey)}`);
  return (
    <SessionSheet
      key={sheet.panel.sessionKey}
      planId={sheet.planId}
      panel={sheet.panel}
      watch={sheet.watch}
      overlay
    />
  );
}
