import { describe, expect, it } from "vitest";
import { renderSummary, summarize } from "../../scripts/e2e-report";

type Status = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

function spec(
  title: string,
  results: { status: Status; duration: number }[],
  file = "plan.spec.ts",
) {
  return {
    title,
    file,
    tests: [
      {
        projectName: "chromium",
        results: results.map((result, retry) => ({ ...result, retry })),
      },
    ],
  };
}

function report(...specs: ReturnType<typeof spec>[]) {
  return { suites: [{ title: "suite", specs, suites: [] }] };
}

function summarized(input: unknown) {
  const summary = summarize(input);
  if (!summary) throw new Error("Expected a readable report");
  return summary;
}

describe("browser report summary", () => {
  it("counts a test that passes on retry as flaky, not failed", () => {
    const summary = summarized(
      report(
        spec("opens the panel", [
          { status: "failed", duration: 3_000 },
          { status: "passed", duration: 2_000 },
        ]),
      ),
    );
    expect(summary.failed).toEqual([]);
    expect(summary.flaky).toEqual([
      {
        file: "plan.spec.ts",
        title: "opens the panel",
        project: "chromium",
        durationMs: 5_000,
        retries: 1,
      },
    ]);
  });

  it("counts a test that never passes as failed", () => {
    const summary = summarized(
      report(
        spec("saves the draft", [
          { status: "failed", duration: 1_000 },
          { status: "timedOut", duration: 30_000 },
        ]),
        spec("lists sessions", [{ status: "passed", duration: 500 }]),
      ),
    );
    expect(summary.failed.map((test) => test.title)).toEqual([
      "saves the draft",
    ]);
    expect(summary.passed).toBe(1);
  });

  it("lists the ten slowest tests, slowest first", () => {
    const specs = Array.from({ length: 12 }, (_, index) =>
      spec(`test ${index}`, [{ status: "passed", duration: index * 100 }]),
    );
    const summary = summarized(report(...specs));
    expect(summary.slowest).toHaveLength(10);
    expect(summary.slowest[0].title).toBe("test 11");
    expect(summary.slowest[9].title).toBe("test 2");
  });

  it("reads tests in nested suites", () => {
    const summary = summarized({
      suites: [
        {
          title: "file",
          specs: [],
          suites: [
            {
              title: "group",
              specs: [spec("nested", [{ status: "failed", duration: 1 }])],
              suites: [],
            },
          ],
        },
      ],
    });
    expect(summary.failed.map((test) => test.title)).toEqual(["nested"]);
  });

  it("says no test ran when a readable report holds none", () => {
    const markdown = renderSummary(summarized({ suites: [], errors: [] }));
    expect(markdown).toContain("No test ran");
    expect(markdown).not.toContain("Report missing");
  });

  it("shows the run errors a report carries outside any test", () => {
    const markdown = renderSummary(
      summarized({
        suites: [],
        errors: [
          { message: "Timed out waiting 300000ms from config.webServer." },
        ],
      }),
    );
    expect(markdown).toContain(
      "Timed out waiting 300000ms from config.webServer.",
    );
  });

  it("says the report is missing when it cannot be read", () => {
    expect(renderSummary(null)).toContain("Report missing");
    expect(renderSummary(summarize({ nothing: true }))).toContain(
      "Report missing",
    );
  });

  it("renders failed and flaky tests with their file and retries", () => {
    const markdown = renderSummary(
      summarize(
        report(
          spec("opens the panel", [
            { status: "failed", duration: 3_000 },
            { status: "passed", duration: 2_000 },
          ]),
          spec("saves the draft", [{ status: "failed", duration: 1_000 }]),
        ),
      ),
    );
    expect(markdown).toContain("1 failed");
    expect(markdown).toContain("1 flaky");
    expect(markdown).toContain("plan.spec.ts › saves the draft");
    expect(markdown).toContain("plan.spec.ts › opens the panel");
  });
});
