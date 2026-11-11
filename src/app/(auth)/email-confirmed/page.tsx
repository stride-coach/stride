import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/stride/status";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { createSupabaseServerClient } from "@/server/supabase/client";

export const metadata: Metadata = { title: "E-mail confirmé" };

export default async function EmailConfirmedPage() {
  await connection();
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at) redirect("/sign-in");
  const name =
    typeof data.user.user_metadata.full_name === "string"
      ? data.user.user_metadata.full_name.trim().split(/\s+/)[0].slice(0, 40)
      : "";
  return (
    <AuthShell signup>
      <div className="flex flex-1 flex-col gap-4 md:flex-none">
        <Status level="ok">E-mail confirmé</Status>
        <h1 className="text-metric font-semibold text-balance">
          C’est validé{name ? `, ${name}` : ""}.
        </h1>
        <p className="text-body-lg text-secondary-foreground">
          Ton adresse est confirmée et tu es connecté. Prochaine étape :
          connecte Garmin pour que ton coach lise ton historique.
        </p>
        <Button asChild className="mt-auto h-control-touch w-full md:mt-0">
          <Link href="/">Continuer la configuration</Link>
        </Button>
        <p className="text-label text-muted-foreground">
          Connecté en tant que {data.user.email}
        </p>
      </div>
    </AuthShell>
  );
}
