# Testing expectations

- Use Vitest for focused unit tests of domain rules, parsing, and deterministic behavior. The `server` Vitest project runs `tests/unit/server-render` with the `react-server` condition to check request-scoped server reads through a Flight render.
- Use Playwright for user-visible browser flows and smoke coverage.
- Keep domain code framework-independent where practical so it is easy to test.
- Validate external inputs at boundaries and cover valid, invalid, and incomplete cases.
- Add integration tests when persistence or external service behavior is introduced.
- Cover database ownership, constraints and functions with pgTAP tests in `supabase/tests/database`, run with `npm run db:test` against the local Supabase stack. Every Stride table needs cross-athlete and anonymous access tests.
- AI behavior will need curated evaluations for coaching quality, safety, and regression; no evaluation framework is included yet.

Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before a pull request when relevant. Locally, run only the Playwright specs the change touches, such as `npx playwright test tests/e2e/<area>.spec.ts --project=chromium`. Pull requests run the browser specs selected from their changes, `main` runs the full browser suite, and onboarding runs only with migrations (see [CI design](ci.md)). CI retries a failed browser test once. A test that passes only on retry keeps the job green but is listed as flaky in the job's browser report (see [CI design](ci.md)); treat it as a failure to fix, not as noise.

### Writing stable browser specs

These rules come from the browser failures measured in #515.

- **Locate by role.** While a page streams, React briefly keeps a hidden copy of the content, so `getByLabel`, `getByText` and CSS locators can match two elements in strict mode. `getByRole` ignores hidden elements. When a modal makes the rest of the page `aria-hidden`, use a CSS or text locator with `.filter({ visible: true })` instead.
- **Click once the page answers.** A click right after a load or a client navigation can land before hydration or be swallowed while the navigation finishes. Only there, use `clickUntil` or `clickToUrl` from `tests/e2e/support/navigation.ts` to click until the expected outcome appears; everywhere else keep a single `click()` followed by its assertion, so a control that really needs two clicks still fails the spec.
- **Make loading states deterministic.** A test that asserts a skeleton or loading motion delays the reads with `/__test__/rest-delay`, and aborts `next-router-prefetch` requests to that route so a finished prefetch cannot skip the loading state.
- **Own the fixture state you change.** Remove only what the test added (`/__test__/rest-delay` returns an `id`), reset what it mutates before it starts, and prefer a dedicated seeded athlete for a journey that writes data other specs read.
- **Anchor dates on the fixture, never on the real weekday.** Plan fixtures start relative to the current week, so pick days from the plan itself.
- **Wait on visible outcomes**, not on timeouts or network idle. Give an explicit longer timeout only to steps that load heavy client code, such as maps, and say so in the PR.
- **Prove stability before the PR.** Run a new or changed spec with `--retries=0` several times: `--repeat-each=5` for read-only journeys, separate runs with fresh fixtures for journeys that write data.

### Quarantine

A browser test that fails on `main` without a related change can be quarantined with `test("…", { tag: "@quarantine" }, …)`. Every project of the main Playwright config skips tagged tests unless `PLAYWRIGHT_QUARANTINE=true`, which runs only them. On `main` pushes, the non-blocking `browser-quarantine` job runs the quarantined `chromium` and `chromium-race-course` tests on a production build and publishes their browser report, so they keep running without turning `main` red.

- Quarantine a test only with its failure rate from the browser reports, and list it in the tracking issue (#515).
- Remove the tag in the pull request that fixes the cause.
- Never quarantine a test that fails because of the change under review.
- In a `test.describe.configure({ mode: "serial" })` group, later tests may depend on earlier ones: quarantine the whole group or none of it. A single tagged test would leave the blocking run without one of its steps and run alone in the quarantine job, where it fails for missing setup.
- Onboarding tests use their own config and cannot be quarantined.

### Reusing the app between local runs

Each Playwright invocation otherwise builds or compiles the app before its first test. Keep one app running instead, and let Playwright start fresh auth and Garmin fixtures for every run:

```bash
PLAYWRIGHT_PRODUCTION=true npm run e2e:app
```

```bash
PLAYWRIGHT_REUSE_APP=true npx playwright test tests/e2e/<area>.spec.ts --project=chromium
```

`e2e:app` starts the configured app server with the e2e environment on port 3100. With `PLAYWRIGHT_PRODUCTION=true` it builds once, so restart it after changing application code; without it, it runs `next dev` with hot reload. The fixtures keep their state in memory, so they are never reused between runs.

## Main browser suite

The browser suite never calls the live Open-Meteo API. Playwright sets `OPEN_METEO_URL` to the auth fixture (`/open-meteo`), whose `tests/fixtures/open-meteo.mjs` answers the forecast, archive and time-zone requests with deterministic weather: about 6 to 14 °C, dry, 14 km/h wind. The variable is unset outside tests, so production keeps the public hosts. Next caches these fetches in `.next-e2e/cache/fetch-cache`, so clear that folder after changing the fixture weather.

`npm run test:e2e` still starts the development server locally. The `chromium` project covers ordinary application journeys; `chromium-development` covers the design-system gallery, remote development origin and data-activity API/loading journeys; `chromium-race-course` runs its serial fixture mutations after `chromium` by default. The serial settings suite remains intact when sharding.

CI selects projects explicitly with `--no-deps`, so each runner has its own auth and Garmin fixtures and the course fixture cannot affect another project. For the full suite, the main and development projects are each split across two runners and the course project uses its own runner; smaller selections use one runner per project. Spec membership of the development and course lanes, and the spec areas used for pull-request selection, live in `tests/e2e/lanes.json`, which both the Playwright config and CI scope read.

Journeys sign in with `signInAs` from `tests/e2e/support/session.ts`. The first journey for each athlete in a worker uses the sign-in form; later journeys in that worker reuse its Supabase session cookies and open `/today`. Fixture sessions are static and logout does not revoke them, so reuse cannot leak a signed-out state. Keep the form in journeys whose subject is authentication.

To exercise the isolated CI groups locally:

```bash
PLAYWRIGHT_PRODUCTION=true npm run test:e2e -- --project=chromium --no-deps --shard=1/2
PLAYWRIGHT_PRODUCTION=true npm run test:e2e -- --project=chromium-race-course --no-deps
npm run test:e2e -- --project=chromium-development --no-deps
```

Production selections build and start the app inside Playwright's server command with the same environment, including public Supabase values. Both commands receive `PLAYWRIGHT_TEST=1` and use the ignored `.next-e2e` directory, outside Playwright's `test-results` output directory, so the Turbopack development cache survives between local runs. Build outputs are neither shared between CI jobs nor cached. Main application journeys run on a production build in CI so routes never compile during a test; a plain local `npm run test:e2e` still uses `next dev` for every project. Keep the development project on `next dev`: the gallery is hidden in production, the origin test exercises development behavior, and authenticated data-activity API requests need loopback cookies that Playwright's API client omits when production marks them Secure.

List projects and shards with `--list` to check selection without starting servers. See [CI design and measurements](ci.md) for required-check behavior.

## Onboarding foundation

The normal browser suite runs with `ONBOARDING_ENABLED=false` and checks the signed-out root redirect and auth behavior. `npm run test:e2e:onboarding` is separate and CI-only: it reads local Supabase CLI status without printing credentials, requires a loopback API URL, enables rollout, starts the Garmin fixture API and runs one Chromium worker. The `database-onboarding` CI job first isolates Supabase from the developer's local stack (`scripts/ci-supabase-isolate.sh`), applies Stride migrations and the pinned Garmin schema, then runs `npm run test:e2e:onboarding` with one worker. UUID athletes and Garmin state keyed by athlete subject isolate test data; athletes are deleted after the suite. The job owns the `stride-ci` Supabase stack, repeats migration reset/replay, advisors, pgTAP and generated-type checks, and stops the stack at the end. Never run it against hosted Supabase or against the local `stride` stack.

Onboarding retains the development server because authenticated Playwright API requests omit production Secure cookies over HTTP loopback. Authentication policy and assertions remain unchanged. The helper forwards additional Playwright arguments. Listing onboarding tests locally requires `CI=true` and placeholder loopback credentials in the environment and must use `--list`; it does not require or start Supabase.

Unit tests exhaust all 64 completion combinations against all six targets, resume recovery, stale revisions, authenticated identity/token ordering, idempotent first entry, owner isolation, persisted-data errors, final live connection checks and polling backoff/retention. Browser coverage exercises first entry, locked/unknown/completed routes, refresh/relogin/second context, persisted Back/sidebar actions, stale revisions, second-athlete isolation and real fixture sync counts during navigation. Screenshots use ignored `test-results/` at 1440×900 and 390×844; keyboard and reduced-motion coverage remain required. Screen-body editing tests arrive with #33–#38.
