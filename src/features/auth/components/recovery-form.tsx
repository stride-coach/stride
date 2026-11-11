"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  initialAuthState,
  type AuthAction,
  type AuthState,
} from "@/features/auth/schemas";
import { EmailField, FormFeedback } from "./form-controls";
import { EnvelopeMark, RecoveryStage } from "./recovery";

export function RecoveryForm({ action }: { action: AuthAction }) {
  const [inbox, setInbox] = useState<AuthState>();
  const [remaining, setRemaining] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [hideFeedback, setHideFeedback] = useState(false);
  const [edited, setEdited] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: AuthState, data: FormData) => {
      setHideFeedback(false);
      setEdited(false);
      setCooldownUntil(Date.now() + 60_000);
      setRemaining(60);
      const result = await action(previous, data);
      const resend = data.get("intent") === "resend";
      if (result.status === "success") {
        setInbox(result);
        setCooldownUntil((result.sentAt ?? Date.now()) + 60_000);
        if (resend)
          toast.success("Nouveau lien demandé.", {
            id: "recovery-resend",
            description:
              "Si un compte existe, regarde dans ta boîte mail et tes spams.",
          });
      } else if (resend)
        toast.error(
          result.message ??
            "Impossible de demander un lien. Attends une minute et réessaie.",
          { id: "recovery-resend" },
        );
      return result;
    },
    initialAuthState,
  );
  const [email, setEmail] = useState("");
  const sent = Boolean(inbox);
  useEffect(() => {
    if (!sent) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sent, cooldownUntil]);
  return (
    <div className="flex flex-1 flex-col">
      <RecoveryStage number={1} title="Demande un lien" active={!sent}>
        <p className="text-body text-secondary-foreground">
          Saisis l’e-mail de ton inscription. On t’envoie un lien à utiliser
          avant qu’il n’expire.
        </p>
        <form
          id="recovery-request"
          action={formAction}
          className="flex flex-col gap-4"
          aria-busy={pending}
        >
          <EmailField
            value={email}
            onChange={(value) => {
              setEmail(value);
              setEdited(true);
            }}
            error={!sent && !edited ? state.errors?.email : undefined}
            disabled={pending || sent}
          />
          <FormFeedback
            state={sent || hideFeedback ? initialAuthState : state}
          />
          <Button
            type="submit"
            disabled={pending || sent}
            className="h-control-touch w-full"
          >
            {pending ? "Envoi du lien…" : "Envoyer le lien"}
          </Button>
        </form>
      </RecoveryStage>
      <RecoveryStage number={2} title="Vérifie ta boîte mail" active={sent}>
        {sent ? (
          <>
            <div
              role="status"
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5"
            >
              <EnvelopeMark />
              <p className="text-body">
                Si un compte existe pour{" "}
                <strong className="font-semibold break-all">
                  {inbox?.email}
                </strong>
                , tu vas recevoir un lien de réinitialisation.
              </p>
              <p className="text-body text-muted-foreground">
                Rien après quelques minutes ? Regarde dans les spams, ou renvoie
                le lien.
              </p>
            </div>
            <form action={formAction}>
              <input type="hidden" name="email" value={inbox?.email} />
              <input type="hidden" name="intent" value="resend" />
              <Button
                type="submit"
                variant="outline"
                disabled={pending || remaining > 0}
                className="h-control-touch w-full disabled:text-muted-foreground disabled:opacity-100"
              >
                {pending ? (
                  "Envoi du lien…"
                ) : remaining > 0 ? (
                  <>
                    Renvoyer dans{" "}
                    <span className="font-semibold tabular-nums">
                      0:{String(remaining).padStart(2, "0")}
                    </span>
                  </>
                ) : (
                  "Renvoyer le lien"
                )}
              </Button>
            </form>
            <Button
              type="button"
              variant="link"
              disabled={pending}
              className="h-auto min-h-control-touch justify-start self-start p-0 md:min-h-0"
              onClick={() => {
                setInbox(undefined);
                setHideFeedback(true);
                setEdited(true);
                setEmail("");
              }}
            >
              Utiliser un autre e-mail
            </Button>
          </>
        ) : (
          <p className="text-body text-muted-foreground">
            Après ta demande, regarde dans ta boîte mail et tes spams. Cette
            étape s’active quand la demande est acceptée.
          </p>
        )}
      </RecoveryStage>
      <RecoveryStage
        number={3}
        title="Choisis un nouveau mot de passe"
        active={false}
      >
        <p className="text-body text-muted-foreground">
          Ouvre le lien reçu pour vérifier ton compte et choisir un nouveau mot
          de passe.
        </p>
      </RecoveryStage>
    </div>
  );
}
