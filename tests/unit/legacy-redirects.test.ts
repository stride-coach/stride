import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function redirects() {
  const rules = (await nextConfig.redirects?.()) ?? [];
  return rules.map(({ source, destination, has }) => ({
    source,
    destination,
    query: has?.[0]?.key,
  }));
}

describe("legacy links", () => {
  it("lands old Progression links on their Santé tab", async () => {
    expect(await redirects()).toEqual(
      expect.arrayContaining([
        { source: "/health", destination: "/health/fitness" },
        { source: "/progress", destination: "/health/fitness" },
        {
          source: "/progress/:section(body|recovery|health)",
          destination: "/health/recovery",
        },
        { source: "/progress/records", destination: "/health/records" },
      ]),
    );
  });

  it("lands old Matériel and Nutrition links on their new tab", async () => {
    expect(await redirects()).toEqual(
      expect.arrayContaining([
        { source: "/gear/:path*", destination: "/activities/gear/:path*" },
        { source: "/nutrition", destination: "/health/nutrition" },
      ]),
    );
  });

  it("lands the old activity detail URL on the activity", async () => {
    expect(await redirects()).toEqual(
      expect.arrayContaining([
        {
          source: "/activities/:id/details",
          destination: "/activities/:id",
        },
      ]),
    );
  });
});
