"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  initialAuthState,
  type AuthAction,
  type AuthState,
} from "@/features/auth/schemas";
import { passwordPolicy } from "@/features/auth/password-policy";
import {
  EmailField,
  FormFeedback,
  FormHeading,
  PasswordField,
  PasswordGuidance,
} from "./form-controls";
import { ConfirmationResend } from "./confirmation-resend";

export function SignUpForm({
  action,
  resendAction,
}: {
  action: AuthAction;
  resendAction: AuthAction;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [edited, setEdited] = useState<
    Partial<Record<"fullName" | "email" | "password" | "confirmation", boolean>>
  >({});
  const [state, formAction, pending] = useActionState(
    async (previous: AuthState, data: FormData) => {
      const result = await action(previous, data);
      if (result.status === "success") {
        setPassword("");
        setConfirmation("");
      }
      return result;
    },
    initialAuthState,
  );
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const valid =
    fullName.trim().length >= 2 &&
    passwordPolicy(password, email).valid &&
    password === confirmation;
  if (state.status === "success" && state.email) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:flex-none">
        <p className="text-label text-secondary-foreground tabular-nums">
          Étape 1 sur 4 · Confirme ton e-mail
        </p>
        <FormHeading
          title="Vérifie ta boîte mail"
          description={`On a envoyé un lien de confirmation à ${state.email}. Ouvre-le pour activer ton compte.`}
        />
        <ol className="flex flex-col border-t border-border">
          {[
            "Ouvre l’e-mail de Stride",
            "Clique sur « Confirmer l’adresse e-mail »",
            "Tu reviens ici, connecté, prêt à configurer ton coach",
          ].map((step, index) => (
            <li
              key={step}
              className="grid grid-cols-[2rem_minmax(0,1fr)] border-b border-border py-2.5"
            >
              <span className="text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <ConfirmationResend
          action={resendAction}
          email={state.email}
          sentAt={state.sentAt}
        />
        <form
          action="/sign-up"
          method="get"
          className="text-body text-secondary-foreground"
        >
          Mauvaise adresse ?{" "}
          <button
            type="submit"
            className="inline-flex min-h-control-touch items-center text-primary hover:underline md:min-h-0"
          >
            Changer d’e-mail
          </button>
        </form>
        <p className="text-label text-muted-foreground">
          Introuvable ? Regarde dans les spams ou promotions. Les liens expirent
          : utilise l’e-mail le plus récent.
        </p>
        <p className="mt-auto text-body text-secondary-foreground md:mt-0">
          Déjà confirmé ?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }
  return (
    <form
      action={formAction}
      onSubmit={() => setEdited({})}
      className="flex flex-col gap-5"
      aria-busy={pending}
    >
      <FormHeading
        title="Crée ton compte"
        description="Juste l’essentiel. Ton coach te posera le reste."
      />
      <FieldGroup>
        <Field
          data-invalid={Boolean(!edited.fullName && state.errors?.fullName)}
        >
          <FieldLabel htmlFor="fullName">Nom complet</FieldLabel>
          <Input
            className="h-control-touch"
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setEdited((previous) => ({ ...previous, fullName: true }));
            }}
            disabled={pending}
            aria-invalid={Boolean(!edited.fullName && state.errors?.fullName)}
            aria-describedby={
              state.errors?.fullName
                ? "full-name-error full-name-help"
                : "full-name-help"
            }
          />
          <p
            id="full-name-help"
            className="text-label text-secondary-foreground"
          >
            C’est ainsi que ton coach t’appellera.
          </p>
          {!edited.fullName && state.errors?.fullName && (
            <FieldError id="full-name-error">
              {state.errors.fullName}
            </FieldError>
          )}
        </Field>
        <EmailField
          value={email}
          onChange={(value) => {
            setEmail(value);
            setEdited((previous) => ({ ...previous, email: true }));
          }}
          error={edited.email ? undefined : state.errors?.email}
          disabled={pending}
        />
        <div className="flex flex-col gap-3">
          <PasswordField
            value={password}
            onChange={(value) => {
              setPassword(value);
              setEdited((previous) => ({ ...previous, password: true }));
            }}
            newPassword
            error={
              edited.password || edited.email
                ? undefined
                : state.errors?.password
            }
            description="password-guidance"
            disabled={pending}
          />
          <PasswordGuidance password={password} email={email} />
        </div>
        <PasswordField
          name="confirmation"
          label="Confirmer le mot de passe"
          value={confirmation}
          onChange={(value) => {
            setConfirmation(value);
            setEdited((previous) => ({ ...previous, confirmation: true }));
          }}
          newPassword
          error={
            mismatch
              ? "Les mots de passe ne correspondent pas encore."
              : edited.confirmation || edited.password
                ? undefined
                : state.errors?.confirmation
          }
          disabled={pending}
        />
      </FieldGroup>
      <FormFeedback state={state} />
      <Button
        type="submit"
        disabled={pending || !valid}
        className="h-control-touch w-full"
      >
        {pending ? "Création du compte…" : "Créer un compte"}
      </Button>
      <p className="text-label text-secondary-foreground">
        On t’envoie un lien par e-mail pour confirmer ton adresse.
      </p>
      <p className="text-label text-muted-foreground">
        En créant un compte, tu acceptes les{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Conditions d’utilisation
        </Link>{" "}
        et la{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Politique de confidentialité
        </Link>
        . Tes données ne sont jamais vendues.
      </p>
      <p className="text-center text-body text-secondary-foreground">
        Déjà un compte ?{" "}
        <Link href="/sign-in" className="text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
