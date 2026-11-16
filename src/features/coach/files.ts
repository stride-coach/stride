export const maxFileBytes = 10 * 1024 * 1024;

export const fileFormats = ["jpeg", "png", "webp", "gpx"] as const;
export type FileFormat = (typeof fileFormats)[number];

export const formatContentType: Record<FileFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gpx: "application/gpx+xml",
};

export const fileAccept = ".gpx,.jpg,.jpeg,.png,.webp";

export const fileErrors = {
  empty: "Ce fichier est vide.",
  tooLarge: "Ce fichier dépasse 10 Mo. Choisis-en un plus léger.",
  unsupported: "Choisis une trace GPX ou une image JPEG, PNG ou WebP.",
  mismatch: "Le contenu de ce fichier ne correspond pas à son format.",
  corrupt: "Ce fichier est illisible. Choisis-en un autre.",
  noTrack: "Cette trace GPX ne contient aucun parcours exploitable.",
  failed: "L’import du fichier a échoué. Réessaie.",
  missing: "Aucun fichier reçu.",
} as const;

export type FileError = (typeof fileErrors)[keyof typeof fileErrors];

const extensionFormats: Record<string, FileFormat> = {
  gpx: "gpx",
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
};

const gpxTypes = new Set([
  "",
  "application/gpx+xml",
  "application/xml",
  "text/xml",
  "application/octet-stream",
]);

export function formatOfName(name: string): FileFormat | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return name.includes(".") ? (extensionFormats[extension] ?? null) : null;
}

export function declaredTypeAllowed(format: FileFormat, type: string) {
  return format === "gpx"
    ? gpxTypes.has(type)
    : type === formatContentType[format];
}

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((value, index) => bytes[index] === value);

const ascii = (bytes: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...bytes.subarray(from, to));

export function sniffFormat(bytes: Uint8Array): FileFormat | null {
  if (startsWith(bytes, [255, 216, 255])) return "jpeg";
  if (startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10])) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return "webp";
  const head = new TextDecoder("utf-8")
    .decode(bytes.subarray(0, 2048))
    .replace(/^﻿/, "")
    .trimStart();
  if (
    /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<(?:[\w-]+:)?gpx\b/i.test(head)
  )
    return "gpx";
  return null;
}

export function checkFileMeta(file: {
  name: string;
  size: number;
  type: string;
}): { format: FileFormat } | { error: FileError } {
  if (file.size <= 0) return { error: fileErrors.empty };
  if (file.size > maxFileBytes) return { error: fileErrors.tooLarge };
  const format = formatOfName(file.name);
  if (!format || !declaredTypeAllowed(format, file.type))
    return { error: fileErrors.unsupported };
  return { format };
}

export function checkFileBytes(
  format: FileFormat,
  bytes: Uint8Array,
): FileError | null {
  return sniffFormat(bytes) === format ? null : fileErrors.mismatch;
}

export type FileSummary =
  | {
      type: "gpx";
      name: string | null;
      distanceKm: number;
      elevationGainM: number | null;
      points: number;
      waypoints: number;
    }
  | { type: "image"; width: number; height: number };

export function fileSizeLabel(bytes: number) {
  const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  return bytes >= 1024 * 1024
    ? `${size.format(bytes / (1024 * 1024))} Mo`
    : `${size.format(Math.max(1, bytes / 1024))} Ko`;
}
