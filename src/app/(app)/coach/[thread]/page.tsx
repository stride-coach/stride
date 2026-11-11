import type { Metadata } from "next";
import { parseSearchParams } from "@/features/coach/search";
import { CoachTopicPage } from "../_components/coach-page";

export const metadata: Metadata = { title: "Sujet · Coach" };

export default async function CoachThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ thread: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ thread }, query] = await Promise.all([params, searchParams]);
  return <CoachTopicPage threadId={thread} search={parseSearchParams(query)} />;
}
