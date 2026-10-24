import { redirect } from "next/navigation";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionKey: string }>;
}) {
  const { sessionKey } = await params;
  redirect(`/plan?session=${encodeURIComponent(sessionKey)}`);
}
