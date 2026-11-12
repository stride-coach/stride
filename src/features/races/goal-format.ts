const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const dayMs = 86_400_000;

export function formatRaceLongDate(iso: string | null) {
  return iso ? longDate.format(new Date(`${iso}T00:00:00Z`)) : "Date à définir";
}

export function formatKm(value: number | null) {
  return value === null ? "—" : `${decimal.format(value)} km`;
}

export function formatTarget(seconds: number | null) {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function daysUntil(iso: string, today: string) {
  return Math.round(
    (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs,
  );
}
