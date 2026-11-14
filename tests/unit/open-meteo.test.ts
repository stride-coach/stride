import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { openMeteoUrls } from "../../src/server/races/open-meteo";

describe("openMeteoUrls", () => {
  it("uses the public Open-Meteo hosts by default", () => {
    expect(openMeteoUrls(undefined)).toEqual({
      forecast: "https://api.open-meteo.com/v1/forecast",
      archive: "https://archive-api.open-meteo.com/v1/archive",
    });
    expect(openMeteoUrls("")).toEqual(openMeteoUrls(undefined));
  });

  it("routes both APIs to a configured base URL", () => {
    expect(openMeteoUrls("http://127.0.0.1:3200/open-meteo/")).toEqual({
      forecast: "http://127.0.0.1:3200/open-meteo/v1/forecast",
      archive: "http://127.0.0.1:3200/open-meteo/v1/archive",
    });
  });

  it.each([
    "ftp://weather.example.com",
    "https://user:secret@weather.example.com",
    "https://weather.example.com/?key=1",
    "not a url",
  ])("rejects %s", (value) => {
    expect(() => openMeteoUrls(value)).toThrow();
  });
});
