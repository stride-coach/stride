import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));
const modelFiles = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ id: "file_model" })),
  delete: vi.fn(async () => ({ id: "file_model" })),
}));
vi.mock("../../src/server/coaching/managed/resources", () => ({
  managedClient: () => ({ files: modelFiles }),
}));
vi.mock("../../src/server/activities/activities", () => ({
  readActivity: vi.fn(),
  listActivities: vi.fn(),
}));
vi.mock("../../src/server/races/races", () => ({ listRaces: vi.fn() }));
vi.mock("../../src/server/plans/stored", () => ({ readActivePlan: vi.fn() }));
vi.mock("../../src/server/plans/debrief", () => ({
  loadSessionDebrief: vi.fn(),
}));

import {
  attachmentHref,
  attachmentMeta,
  attachmentSuggestion,
  coachAttachmentsSchema,
  type AttachmentOption,
} from "../../src/features/coach/attachments";
import {
  checkFileBytes,
  checkFileMeta,
  fileErrors,
  maxFileBytes,
  maxPdfBytes,
  sniffFormat,
} from "../../src/features/coach/files";
import {
  healthSeries,
  healthValueLabel,
} from "../../src/features/coach/health-attachments";
import {
  AttachmentAccessError,
  attachmentContextText,
  attachmentMediaBlocks,
  loadAttachmentOptions,
  resolveAttachments,
} from "../../src/server/coaching/attachments";
import { storeCoachFile } from "../../src/server/coaching/files";
import type { OnboardingContext } from "../../src/server/onboarding/context";

const userId = "a0000000-0000-4000-8000-00000000000a";
const fileId = "f0000000-0000-4000-8000-00000000000f";

function fakeContext(tables: Record<string, unknown>) {
  const upload = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const inserted: unknown[] = [];
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    for (const method of ["select", "eq", "in", "not", "order", "limit"])
      builder[method] = self;
    builder.insert = (row: unknown) => {
      inserted.push(row);
      return builder;
    };
    builder.single = async () => ({
      data: { id: fileId, created_at: "2026-11-16T10:00:00Z" },
      error: null,
    });
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve({ data: tables[table] ?? [], error: null });
    return builder;
  };
  const context = {
    userId,
    client: { from, storage: { from: () => ({ upload, remove }) } },
  } as unknown as OnboardingContext;
  return { context, upload, remove, inserted };
}

function onePagePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return body;
}

const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Sortie</name><trkseg>
<trkpt lat="45.0" lon="6.0"><ele>1000</ele></trkpt>
<trkpt lat="45.001" lon="6.0"><ele>1010</ele></trkpt>
<trkpt lat="45.002" lon="6.0"><ele>1030</ele></trkpt>
</trkseg></trk></gpx>`;

describe("health and file references", () => {
  it("accepts only known health topics and file uuids", () => {
    expect(
      coachAttachmentsSchema.safeParse([
        { kind: "health", id: "hrv" },
        { kind: "file", id: fileId },
      ]).success,
    ).toBe(true);
    expect(
      coachAttachmentsSchema.safeParse([{ kind: "health", id: "../x" }])
        .success,
    ).toBe(false);
    expect(
      coachAttachmentsSchema.safeParse([{ kind: "file", id: "a.gpx" }]).success,
    ).toBe(false);
  });

  it("links health data and keeps files unlinked", () => {
    expect(attachmentHref({ kind: "health", id: "hrv" })).toBe(
      "/health/recovery",
    );
    expect(attachmentHref({ kind: "file", id: fileId })).toBeNull();
  });

  it("describes menu suggestions and meta in French", () => {
    const hrv: AttachmentOption = {
      kind: "health",
      id: "hrv",
      title: "VFC",
      date: "2026-11-16",
      distanceKm: null,
      elevationGainM: null,
      detail: "42 ms",
    };
    expect(attachmentSuggestion("health", [hrv], "2026-11-16")).toBe(
      "VFC · 42 ms",
    );
    expect(attachmentSuggestion("health", [], "2026-11-16")).toBe(
      "VFC, sommeil…",
    );
    expect(attachmentSuggestion("file", [], "2026-11-16")).toBe("Capture, PDF, GPX");
    expect(attachmentMeta(hrv, "2026-11-16")).toBe("lun. 16/11/2026 · 42 ms");
  });

  it("keeps the latest fortnight of a health topic", () => {
    const series = healthSeries("sleep", [
      { metric: "sleep_duration_seconds", day: "2026-11-15", value: 26_000 },
      { metric: "sleep_score", day: "2026-11-15", value: 81 },
      { metric: "sleep_duration_seconds", day: "2026-11-16", value: 27_000 },
      { metric: "hrv_last_night_ms", day: "2026-11-16", value: 40 },
    ]);
    expect(series).toMatchObject({
      latestDay: "2026-11-16",
      latest: "7 h 30",
    });
    expect(series.days).toHaveLength(2);
    expect(series.days[1].values).toEqual({ sleep_duration_seconds: 27_000 });
    expect(healthValueLabel("ms", 42.4)).toBe("42 ms");
  });
});

describe("file validation", () => {
  it("rejects empty, oversized and unsupported files", () => {
    expect(checkFileMeta({ name: "a.gpx", size: 0, type: "" })).toEqual({
      error: fileErrors.empty,
    });
    expect(
      checkFileMeta({ name: "a.gpx", size: maxFileBytes + 1, type: "" }),
    ).toEqual({ error: fileErrors.tooLarge });
    expect(
      checkFileMeta({ name: "run.exe", size: 10, type: "application/x" }),
    ).toEqual({ error: fileErrors.unsupported });
    expect(
      checkFileMeta({ name: "photo.png", size: 10, type: "image/jpeg" }),
    ).toEqual({ error: fileErrors.unsupported });
    expect(checkFileMeta({ name: "a.GPX", size: 10, type: "" })).toEqual({
      format: "gpx",
    });
  });

  it("allows a heavier PDF than an image", () => {
    const pdf = { name: "roadbook.pdf", type: "application/pdf" };
    expect(checkFileMeta({ ...pdf, size: 25 * 1024 * 1024 })).toEqual({
      format: "pdf",
    });
    expect(checkFileMeta({ ...pdf, size: maxPdfBytes + 1 })).toEqual({
      error: fileErrors.pdfTooLarge,
    });
    expect(
      checkFileMeta({ name: "a.png", size: maxFileBytes + 1, type: "image/png" }),
    ).toEqual({ error: fileErrors.tooLarge });
  });

  it("sniffs magic bytes instead of trusting the name", () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    expect(sniffFormat(png)).toBe("png");
    expect(sniffFormat(Uint8Array.from([255, 216, 255, 224]))).toBe("jpeg");
    expect(sniffFormat(new TextEncoder().encode("﻿" + gpx))).toBe("gpx");
    expect(sniffFormat(new TextEncoder().encode("<html><gpx>"))).toBeNull();
    expect(checkFileBytes("jpeg", png)).toBe(fileErrors.mismatch);
    expect(checkFileBytes("png", png)).toBeNull();
    expect(sniffFormat(new TextEncoder().encode("%PDF-1.7\n"))).toBe("pdf");
  });

  it("stores nothing for an invalid file", async () => {
    const { context, upload } = fakeContext({});
    const fake = new File(["<script>alert(1)</script>"], "trace.gpx");
    expect(await storeCoachFile(context, fake)).toEqual({
      error: fileErrors.mismatch,
    });
    const flat = new File(
      ["<gpx><trk><trkseg></trkseg></trk></gpx>"],
      "vide.gpx",
    );
    expect(await storeCoachFile(context, flat)).toEqual({
      error: fileErrors.noTrack,
    });
    const broken = new File(
      [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])],
      "capture.png",
      { type: "image/png" },
    );
    expect(await storeCoachFile(context, broken)).toEqual({
      error: fileErrors.corrupt,
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it("stores a GPX trace and an image in the athlete folder", async () => {
    const { context, upload, inserted } = fakeContext({});
    const stored = await storeCoachFile(
      context,
      new File([gpx], "sortie.gpx", { type: "application/gpx+xml" }),
    );
    expect(stored).toEqual({
      attachment: {
        kind: "file",
        id: fileId,
        title: "sortie.gpx",
        date: "2026-11-16",
      },
    });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${userId}/[0-9a-f-]+\\.gpx$`)),
      expect.any(Buffer),
      { contentType: "application/gpx+xml" },
    );
    expect(inserted[0]).toMatchObject({
      user_id: userId,
      content_type: "application/gpx+xml",
      summary: { type: "gpx", points: 3, waypoints: 0 },
    });
    const image = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await storeCoachFile(
      context,
      new File([image], "capture.png", { type: "image/png" }),
    );
    expect(inserted[1]).toMatchObject({
      summary: { type: "image", width: 4, height: 3 },
      model_file_id: "file_model",
    });
    expect(inserted[0]).toMatchObject({ model_file_id: null });
  });

  it("stores a PDF with its page count and a copy for the staff", async () => {
    const { context, inserted } = fakeContext({});
    const stored = await storeCoachFile(
      context,
      new File([onePagePdf()], "roadbook.pdf", { type: "application/pdf" }),
    );
    expect(stored).toMatchObject({ attachment: { title: "roadbook.pdf" } });
    expect(inserted[0]).toMatchObject({
      content_type: "application/pdf",
      summary: { type: "pdf", pages: 1 },
      model_file_id: "file_model",
    });
  });

  it("rejects an unreadable PDF and stores nothing when the copy fails", async () => {
    const { context, upload } = fakeContext({});
    expect(
      await storeCoachFile(
        context,
        new File(["%PDF-1.4 rien"], "cassé.pdf", { type: "application/pdf" }),
      ),
    ).toEqual({ error: fileErrors.corrupt });
    modelFiles.upload.mockRejectedValueOnce(new Error("down"));
    expect(
      await storeCoachFile(
        context,
        new File([onePagePdf()], "roadbook.pdf", { type: "application/pdf" }),
      ),
    ).toEqual({ error: fileErrors.failed });
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("health and file resolution", () => {
  it("resolves a health topic from stored observations", async () => {
    const { context } = fakeContext({
      provider_observations: [
        {
          metric: "hrv_last_night_ms",
          observed_on: "2026-11-16",
          value_numeric: 42,
        },
        {
          metric: "hrv_last_night_ms",
          observed_on: "2026-11-15",
          value_numeric: "39",
        },
        { metric: "sleep_score", observed_on: "2026-11-16", value_numeric: 80 },
      ],
    });
    const [hrv] = await resolveAttachments(context, [
      { kind: "health", id: "hrv" },
    ]);
    expect(hrv).toMatchObject({
      kind: "health",
      title: "VFC",
      date: "2026-11-16",
      days: [
        { date: "2026-11-15", values: { hrv_last_night_ms: 39 } },
        { date: "2026-11-16", values: { hrv_last_night_ms: 42 } },
      ],
    });
    expect(attachmentContextText([hrv])).toContain("hrv_last_night_ms");
  });

  it("refuses a health topic without observations and a foreign file", async () => {
    const { context } = fakeContext({});
    await expect(
      resolveAttachments(context, [{ kind: "health", id: "sleep" }]),
    ).rejects.toBeInstanceOf(AttachmentAccessError);
    await expect(
      resolveAttachments(context, [{ kind: "file", id: fileId }]),
    ).rejects.toBeInstanceOf(AttachmentAccessError);
  });

  it("gives the staff a described reference of a file", async () => {
    const { context } = fakeContext({
      coach_attachment_files: [
        {
          id: fileId,
          file_name: "capture.png",
          content_type: "image/png",
          size_bytes: 2048,
          created_at: "2026-11-16T10:00:00Z",
          summary: { type: "image", width: 4, height: 3 },
        },
      ],
    });
    const [file] = await resolveAttachments(context, [
      { kind: "file", id: fileId },
    ]);
    expect(file).toMatchObject({
      kind: "file",
      title: "capture.png",
      image: { width: 4, height: 3 },
    });
    expect(file).toHaveProperty("note", expect.stringContaining("ne voit pas"));
    expect(attachmentMediaBlocks([file])).toEqual([]);
  });

  it("hands the staff the image and the PDF themselves", async () => {
    const pdfId = "f0000000-0000-4000-8000-0000000000ff";
    const { context } = fakeContext({
      coach_attachment_files: [
        {
          id: fileId,
          file_name: "page-course.png",
          content_type: "image/png",
          size_bytes: 2048,
          created_at: "2026-11-16T10:00:00Z",
          summary: { type: "image", width: 4, height: 3 },
          model_file_id: "file_image",
        },
        {
          id: pdfId,
          file_name: "roadbook.pdf",
          content_type: "application/pdf",
          size_bytes: 4096,
          created_at: "2026-11-16T10:00:00Z",
          summary: { type: "pdf", pages: 48 },
          model_file_id: "file_pdf",
        },
      ],
    });
    const files = await resolveAttachments(context, [
      { kind: "file", id: fileId },
      { kind: "file", id: pdfId },
    ]);
    expect(attachmentMediaBlocks(files)).toEqual([
      { type: "image", source: { type: "file", file_id: "file_image" } },
      {
        type: "document",
        source: { type: "file", file_id: "file_pdf" },
        title: "roadbook.pdf",
      },
    ]);
    const text = attachmentContextText(files);
    expect(text).not.toContain("file_image");
    expect(text).not.toContain("ne voit pas");
    expect(JSON.parse(text).attachments[1]).toMatchObject({ pdf: { pages: 48 } });
  });

  it("offers health topics that have observations", async () => {
    const { context } = fakeContext({
      provider_observations: [
        {
          metric: "hrv_last_night_ms",
          observed_on: "2026-11-16",
          value_numeric: 42,
        },
      ],
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const options = await loadAttachmentOptions(context, "2026-11-16");
    expect(options.health).toMatchObject([
      { kind: "health", id: "hrv", title: "VFC", detail: "42 ms" },
    ]);
    expect(options.file).toEqual([]);
  });
});
