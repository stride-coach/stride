import "server-only";
import { toFile } from "@anthropic-ai/sdk";
import sharp from "sharp";
import { z } from "zod";
import {
  checkFileBytes,
  checkFileMeta,
  fileErrors,
  formatContentType,
  maxPdfPages,
  type FileError,
  type FileFormat,
  type FileSummary,
} from "@/features/coach/files";
import type { SentAttachment } from "@/features/coach/attachments";
import { buildCourse } from "@/features/races/course";
import { parseGpx } from "@/features/races/gpx";
import { managedClient } from "@/server/coaching/managed/resources";
import type { OnboardingContext } from "@/server/onboarding/context";

export const fileSummarySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("gpx"),
    name: z.string().nullable(),
    distanceKm: z.number().nonnegative(),
    elevationGainM: z.number().nonnegative().nullable(),
    points: z.int().nonnegative(),
    waypoints: z.int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal("image"),
    width: z.int().positive(),
    height: z.int().positive(),
  }),
  z.strictObject({
    type: z.literal("pdf"),
    pages: z.int().positive(),
  }),
]);

const bucket = "coach-files";
const maxNameLength = 120;
const maxImagePixels = 40_000_000;
const modelImageEdge = 2000;

const rounded = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

async function summarize(
  format: FileFormat,
  bytes: Buffer,
): Promise<FileSummary | FileError> {
  if (format === "gpx") {
    const parsed = parseGpx(new TextDecoder("utf-8").decode(bytes));
    if (parsed === "not-gpx") return fileErrors.mismatch;
    const course = parsed === "no-track" ? null : buildCourse(parsed.points);
    if (parsed === "no-track" || !course) return fileErrors.noTrack;
    return {
      type: "gpx",
      name: parsed.name?.slice(0, maxNameLength) ?? null,
      distanceKm: rounded(course.distanceM / 1000, 2),
      elevationGainM:
        course.elevationGainM === null
          ? null
          : Math.round(course.elevationGainM),
      points: parsed.points.length,
      waypoints: parsed.waypoints.length,
    };
  }
  if (format === "pdf") return summarizePdf(bytes);
  try {
    const image = sharp(bytes, {
      limitInputPixels: maxImagePixels,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1)
      return fileErrors.corrupt;
    await image.raw().toBuffer();
    return { type: "image", width: metadata.width, height: metadata.height };
  } catch {
    return fileErrors.corrupt;
  }
}

async function summarizePdf(bytes: Buffer): Promise<FileSummary | FileError> {
  const { getDocumentProxy } = await import("unpdf");
  try {
    const document = await getDocumentProxy(new Uint8Array(bytes));
    const pages = document.numPages;
    if (pages < 1) return fileErrors.corrupt;
    if (pages > maxPdfPages) return fileErrors.pdfTooLong;
    return { type: "pdf", pages };
  } catch (error) {
    return error instanceof Error && error.name === "PasswordException"
      ? fileErrors.pdfProtected
      : fileErrors.corrupt;
  }
}

async function modelReadyFile(format: FileFormat, bytes: Buffer, name: string) {
  if (format === "gpx") return null;
  if (format === "pdf")
    return toFile(bytes, name, { type: formatContentType.pdf });
  const jpeg = await sharp(bytes, { limitInputPixels: maxImagePixels })
    .rotate()
    .resize(modelImageEdge, modelImageEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return toFile(jpeg, name.replace(/\.[^.]*$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

async function uploadModelCopy(
  format: FileFormat,
  bytes: Buffer,
  name: string,
): Promise<{ id: string | null } | null> {
  try {
    const file = await modelReadyFile(format, bytes, name);
    if (!file) return { id: null };
    const uploaded = await managedClient().files.upload({ file });
    return { id: uploaded.id };
  } catch {
    return null;
  }
}

async function discardModelCopy(id: string | null) {
  if (!id) return;
  await managedClient()
    .files.delete(id)
    .catch(() => undefined);
}

function displayName(name: string) {
  const clean = name.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim();
  return clean.slice(-maxNameLength) || "fichier";
}

export async function storeCoachFile(
  context: OnboardingContext,
  file: File,
): Promise<{ attachment: SentAttachment } | { error: FileError }> {
  const meta = checkFileMeta(file);
  if ("error" in meta) return meta;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mismatch = checkFileBytes(meta.format, bytes);
  if (mismatch) return { error: mismatch };
  const summary = await summarize(meta.format, bytes);
  if (typeof summary === "string") return { error: summary };
  const contentType = formatContentType[meta.format];
  const extension = meta.format === "jpeg" ? "jpg" : meta.format;
  const path = `${context.userId}/${crypto.randomUUID()}.${extension}`;
  const name = displayName(file.name);
  const copy = await uploadModelCopy(meta.format, bytes, name);
  if (!copy) return { error: fileErrors.failed };
  const modelFileId = copy.id;
  const uploaded = await context.client.storage
    .from(bucket)
    .upload(path, bytes, { contentType });
  if (uploaded.error) {
    await discardModelCopy(modelFileId);
    return { error: fileErrors.failed };
  }
  const { data, error } = await context.client
    .from("coach_attachment_files")
    .insert({
      user_id: context.userId,
      storage_path: path,
      file_name: name,
      content_type: contentType,
      size_bytes: bytes.length,
      summary,
      model_file_id: modelFileId,
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    await context.client.storage.from(bucket).remove([path]);
    await discardModelCopy(modelFileId);
    return { error: fileErrors.failed };
  }
  return {
    attachment: {
      kind: "file",
      id: data.id,
      title: name,
      date: data.created_at.slice(0, 10),
    },
  };
}

export async function readCoachFiles(
  context: OnboardingContext,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];
  const { data, error } = await context.client
    .from("coach_attachment_files")
    .select(
      "id, file_name, content_type, size_bytes, summary, model_file_id, created_at",
    )
    .eq("user_id", context.userId)
    .in("id", [...ids])
    .order("created_at", { ascending: false });
  if (error) throw new Error("coach_files_unreadable");
  return data.flatMap((row) => {
    const summary = fileSummarySchema.safeParse(row.summary);
    return summary.success ? [{ ...row, summary: summary.data }] : [];
  });
}
