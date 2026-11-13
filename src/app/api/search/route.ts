import { holdsHealthConsent } from "@/server/consent/health-consent";
import { getOnboardingContext } from "@/server/onboarding/context";
import { loadSearchIndex } from "@/server/search/search-index";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  const context = await getOnboardingContext().catch(() => null);
  if (!context)
    return Response.json({ code: "session-expired" }, { status: 401, headers });
  if (!(await holdsHealthConsent(context)))
    return Response.json({ code: "consent" }, { status: 403, headers });
  const index = await loadSearchIndex(context).catch(() => null);
  if (!index)
    return Response.json({ code: "unavailable" }, { status: 503, headers });
  return Response.json(index, { headers });
}
