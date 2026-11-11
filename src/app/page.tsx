import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/features/public/components/landing";
import { PublicFooter } from "@/features/public/components/public-footer";
import { PublicHeader } from "@/features/public/components/public-header";
import { requireAthlete } from "@/server/app/session";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Stride · Un staff qui lit ton corps" },
  description:
    "Coach running pour la route et le trail. Stride lit ton sommeil, ta VFC, ta charge et tes douleurs avant chaque séance, puis ajuste ton plan.",
};

export default async function Home() {
  if (await getCurrentUser()) {
    await requireAthlete();
    redirect("/today");
  }
  return (
    <>
      <PublicHeader withSections />
      <Landing />
      <PublicFooter withDisclaimer />
    </>
  );
}
