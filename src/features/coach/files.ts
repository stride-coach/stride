const megabyte = 1024 * 1024;

export const maxFileBytes = 10 * megabyte;
export const maxPdfBytes = 30 * megabyte;
export const maxUploadBytes = maxPdfBytes;
export const maxPdfPages = 600;

export const fileFormats = ["jpeg", "png", "webp", "gpx", "pdf"] as const;
export type FileFormat = (typeof fileFormats)[number];

export const formatContentType: Record<FileFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gpx: "application/gpx+xml",
  pdf: "application/pdf",
};

export const fileAccept = ".gpx,.jpg,.jpeg,.png,.webp,.pdf";

export const fileErrors = {
  empty: "Ce fichier est vide.",
  tooLarge: "Ce fichier dépasse 10 Mo. Choisis-en un plus léger.",
  pdfTooLarge: "Ce PDF dépasse 30 Mo. Choisis-en un plus léger.",
  unsupported: "Choisis une image JPEG, PNG ou WebP, un PDF ou une trace GPX.",
  mismatch: "Le contenu de ce fichier ne correspond pas à son format.",
  corrupt: "Ce fichier est illisible. Choisis-en un autre.",
  noTrack: "Cette trace GPX ne contient aucun parcours exploitable.",
  pdfProtected:
    "Ce PDF est protégé par un mot de passe. Retire la protection puis réessaie.",
  pdfTooLong: "Ce PDF dépasse 600 pages. Joins seulement les pages utiles.",
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
  pdf: "pdf",
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
  if (format === "gpx") return gpxTypes.has(type);
  return type === formatContentType[format];
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
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
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
  const format = formatOfName(file.name);
  if (!format || !declaredTypeAllowed(format, file.type))
    return { error: fileErrors.unsupported };
  if (format === "pdf" && file.size > maxPdfBytes)
    return { error: fileErrors.pdfTooLarge };
  if (format !== "pdf" && file.size > maxFileBytes)
    return { error: fileErrors.tooLarge };
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
  | { type: "image"; width: number; height: number }
  | { type: "pdf"; pages: number };

export function fileSizeLabel(bytes: number) {
  const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  return bytes >= 1024 * 1024
    ? `${size.format(bytes / (1024 * 1024))} Mo`
    : `${size.format(Math.max(1, bytes / 1024))} Ko`;
}
