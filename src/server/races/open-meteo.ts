import "server-only";
import { z } from "zod";

const publicUrls = {
  forecast: "https://api.open-meteo.com/v1/forecast",
  archive: "https://archive-api.open-meteo.com/v1/archive",
};

const baseUrlSchema = z
  .string()
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      context.addIssue({
        code: "custom",
        message: "OPEN_METEO_URL must be an HTTP or HTTPS base URL.",
      });
      return z.NEVER;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  });

export function openMeteoUrls(value: unknown = process.env.OPEN_METEO_URL) {
  if (value === undefined || value === "") return publicUrls;
  const base = baseUrlSchema.parse(value);
  return { forecast: `${base}/v1/forecast`, archive: `${base}/v1/archive` };
}
