import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Several agents share one 4-core dev server. Running their Playwright suites at the same
// time saturates it, so local runs queue behind a machine-wide lock held by the runner.
const lockDir = process.env.PLAYWRIGHT_LOCK_DIR ?? join(tmpdir(), "stride-e2e.lock");
const pollMs = 2_000;

function holderAlive(): boolean {
  try {
    let pid = 0;
    try {
      pid = Number(readFileSync(join(lockDir, "pid"), "utf8"));
    } catch {}
    // The holder may be between mkdir and writing its pid.
    if (!pid) return Date.now() - statSync(lockDir).mtimeMs < 10_000;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function acquireE2eLock() {
  let announced = false;
  for (;;) {
    try {
      mkdirSync(lockDir);
      writeFileSync(join(lockDir, "pid"), String(process.pid));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (!holderAlive()) {
        rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (!announced) {
        console.log(`Another Playwright run holds ${lockDir}; waiting for it to finish…`);
        announced = true;
      }
      sleep(pollMs);
    }
  }
  // A killed runner leaves the directory behind; the next run sees a dead pid and takes over.
  process.once("exit", () => rmSync(lockDir, { recursive: true, force: true }));
}
