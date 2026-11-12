import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type ReportedTest = {
  file: string;
  title: string;
  project: string;
  durationMs: number;
  retries: number;
};

export type ReportSummary = {
  ran: number;
  errors: string[];
  passed: number;
  failed: ReportedTest[];
  flaky: ReportedTest[];
  slowest: ReportedTest[];
};

type JsonResult = { status?: unknown; duration?: unknown; retry?: unknown };
type JsonTest = { projectName?: unknown; results?: unknown };
type JsonSpec = { title?: unknown; file?: unknown; tests?: unknown };
type JsonSuite = { specs?: unknown; suites?: unknown };

const slowestCount = 10;

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function specsOf(suites: unknown): JsonSpec[] {
  return list<JsonSuite>(suites).flatMap((suite) => [
    ...list<JsonSpec>(suite.specs),
    ...specsOf(suite.suites),
  ]);
}

export function summarize(report: unknown): ReportSummary | null {
  if (!report || typeof report !== "object" || !("suites" in report))
    return null;
  const errors = list<{ message?: unknown }>(
    (report as { errors?: unknown }).errors,
  ).map((error) => String(error.message ?? "").trim());
  const summary: ReportSummary = {
    ran: 0,
    errors: errors.filter(Boolean),
    passed: 0,
    failed: [],
    flaky: [],
    slowest: [],
  };
  const all: ReportedTest[] = [];
  for (const spec of specsOf((report as { suites: unknown }).suites)) {
    for (const test of list<JsonTest>(spec.tests)) {
      const results = list<JsonResult>(test.results);
      if (results.length === 0) continue;
      const statuses = results.map((result) => result.status);
      if (statuses.every((status) => status === "skipped")) continue;
      const reported: ReportedTest = {
        file: String(spec.file ?? ""),
        title: String(spec.title ?? ""),
        project: String(test.projectName ?? ""),
        durationMs: results.reduce(
          (total, result) =>
            total + (typeof result.duration === "number" ? result.duration : 0),
          0,
        ),
        retries: results.length - 1,
      };
      all.push(reported);
      const passed = statuses.at(-1) === "passed";
      if (!passed) summary.failed.push(reported);
      else if (results.length > 1) summary.flaky.push(reported);
      else summary.passed += 1;
    }
  }
  summary.ran = all.length;
  summary.slowest = [...all]
    .sort((first, second) => second.durationMs - first.durationMs)
    .slice(0, slowestCount);
  return summary;
}

function seconds(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function rows(tests: ReportedTest[], withRetries: boolean) {
  return tests.map(
    (test) =>
      `| ${test.file} › ${test.title} | ${test.project} | ${seconds(test.durationMs)}${withRetries ? ` | ${test.retries}` : ""} |`,
  );
}

export function renderSummary(summary: ReportSummary | null): string {
  if (!summary)
    return "### Browser report\n\nReport missing: the run produced no readable Playwright JSON report.\n";
  const lines = ["### Browser report", ""];
  if (summary.errors.length > 0)
    lines.push(
      "#### Run errors",
      "",
      ...summary.errors.map((error) => `- ${error.split("\n")[0]}`),
      "",
    );
  if (summary.ran === 0) {
    lines.push("No test ran.", "");
    return lines.join("\n");
  }
  lines.push(
    `${summary.passed} passed · ${summary.failed.length} failed · ${summary.flaky.length} flaky`,
    "",
  );
  if (summary.failed.length > 0)
    lines.push(
      "#### Failed",
      "",
      "| Test | Project | Time | Retries |",
      "|---|---|---:|---:|",
      ...rows(summary.failed, true),
      "",
    );
  if (summary.flaky.length > 0)
    lines.push(
      "#### Flaky (passed on retry)",
      "",
      "| Test | Project | Time | Retries |",
      "|---|---|---:|---:|",
      ...rows(summary.flaky, true),
      "",
    );
  lines.push(
    "#### Slowest",
    "",
    "| Test | Project | Time |",
    "|---|---|---:|",
    ...rows(summary.slowest, false),
    "",
  );
  return lines.join("\n");
}

function readReport(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const path = process.argv[2] ?? "test-results/report.json";
  process.stdout.write(renderSummary(summarize(readReport(path))));
}
