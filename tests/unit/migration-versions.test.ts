import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const directory = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(directory).filter((name) => name.endsWith(".sql"));

describe("supabase migrations", () => {
  it("names every file with a 14 digit version and a description", () => {
    const invalid = files.filter(
      (name) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(name),
    );
    expect(invalid).toEqual([]);
  });

  it("gives every migration its own version", () => {
    const owners = new Map<string, string[]>();
    for (const name of files) {
      const version = name.slice(0, name.indexOf("_"));
      owners.set(version, [...(owners.get(version) ?? []), name]);
    }
    const duplicates = [...owners.values()].filter((names) => names.length > 1);
    expect(duplicates).toEqual([]);
  });
});
