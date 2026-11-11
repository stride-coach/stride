import type { Metadata } from "next";
import { CoachTopicPage } from "../_components/coach-page";

export const metadata: Metadata = { title: "Sujet · Coach" };

export default async function CoachThreadPage({
  params,
}: {
  params: Promise<{ thread: string }>;
}) {
  const { thread } = await params;
  return <CoachTopicPage threadId={thread} />;
}
