# Stride Auth email templates

Open [preview.html](preview.html) to review the three transactional emails, each in light and dark. Serve the folder locally (for example `npx serve docs/design/email-templates`) so each column forces its theme; opened from disk, both columns follow the system theme. The preview embeds the same standalone HTML files intended for Supabase.

| Supabase template | Subject                       | HTML                                   |
| ----------------- | ----------------------------- | -------------------------------------- |
| Confirm sign up   | Confirme ton adresse e-mail   | [confirmation.html](confirmation.html) |
| Reset password    | Réinitialise ton mot de passe | [recovery.html](recovery.html)         |
| Magic link        | Ton lien de connexion Stride  | [magic-link.html](magic-link.html)     |

The designs follow the Dense design system: the `shell` page colour, a 12px-radius panel with a 1px `border`, Inter with system fallbacks, a single `primary` action, and the « Topo » logo. Email clients strip SVG, so the logo's two offset bars are table cells. The copy is French, like every athlete-facing string.

Inline styles carry the light theme, so a client that ignores media queries still shows a correct light email. A `prefers-color-scheme: dark` block, mirrored for Outlook.com with `[data-ogsc]` selectors, switches to the dark tokens. Clients that force their own dark mode may still recolour parts of the message.

All links use Supabase's `{{ .ConfirmationURL }}` variable, preserving the configured redirect and the current PKCE flow. The copy reminds users to open the link in the same browser and profile where they requested it. The preview does not send email or change Supabase settings.

To apply a design, configure a sender and custom SMTP in Supabase Authentication → SMTP Settings, then copy its HTML and subject into the matching entry under Authentication → Email Templates. Keep the project's Site URL and Redirect URLs aligned with `docs/architecture/authentication.md`.

Send a fresh message after saving and inspect it in the email clients used by the team, in light and dark modes. A browser preview cannot verify how every email client renders the message. Open each test link once, in the same browser and profile that requested it; a previously issued link may already be expired or consumed.
