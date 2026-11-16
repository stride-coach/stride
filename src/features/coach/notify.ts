export type NotifyOffer = "available" | "needs-push" | "push-off";

export function notifyOffer(push: {
  devices: number;
  staffEnabled: boolean;
}): NotifyOffer {
  if (push.devices === 0) return "needs-push";
  return push.staffEnabled ? "available" : "push-off";
}

export const notifyCopy = {
  idle: "Me prévenir quand c’est prêt",
  active: "Je te préviens quand c’est prêt",
  "needs-push":
    "Active les notifications dans les réglages pour être prévenu quand la réponse est prête.",
  "push-off":
    "Les notifications du staff sont coupées dans les réglages : tu ne seras pas prévenu.",
} as const;

export const notifyFailure =
  "Ton choix n’a pas pu être enregistré. Réessaie dans un instant.";
