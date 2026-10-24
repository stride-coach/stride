import { describe, expect, it } from "vitest";
import {
  formatConsentDate,
  hasHealthConsent,
  healthConsentStatus,
  onboardingNeedsHealthConsent,
} from "../../src/features/consent/health-consent";

const grant = (
  granted_at: string,
  withdrawn_at: string | null = null,
  policy_version = "2026-10-24",
) => ({ granted_at, withdrawn_at, policy_version });

describe("health consent status", () => {
  it("is missing for athletes who never consented", () => {
    const status = healthConsentStatus([]);
    expect(status).toEqual({ kind: "missing" });
    expect(hasHealthConsent(status)).toBe(false);
  });
  it("is active with the grant time and policy version", () => {
    const status = healthConsentStatus([grant("2026-10-24T08:00:00Z")]);
    expect(status).toEqual({
      kind: "active",
      grantedAt: "2026-10-24T08:00:00Z",
      policyVersion: "2026-10-24",
    });
    expect(hasHealthConsent(status)).toBe(true);
  });
  it("reports the latest withdrawal once every grant is withdrawn", () => {
    const status = healthConsentStatus([
      grant("2026-10-26T08:00:00Z", "2026-10-27T09:00:00Z"),
      grant("2026-10-24T08:00:00Z", "2026-10-25T09:00:00Z"),
    ]);
    expect(status).toEqual({
      kind: "withdrawn",
      withdrawnAt: "2026-10-27T09:00:00Z",
    });
    expect(hasHealthConsent(status)).toBe(false);
  });
  it("is active again when the athlete consents after a withdrawal", () => {
    const status = healthConsentStatus([
      grant("2026-10-24T08:00:00Z", "2026-10-25T09:00:00Z"),
      grant("2026-10-26T08:00:00Z", null, "2026-11-02"),
    ]);
    expect(status).toEqual({
      kind: "active",
      grantedAt: "2026-10-26T08:00:00Z",
      policyVersion: "2026-11-02",
    });
  });
});

describe("onboarding consent gate", () => {
  it("collects consent on the Garmin intro rather than blocking it", () => {
    expect(onboardingNeedsHealthConsent("welcome", false)).toBe(false);
    expect(onboardingNeedsHealthConsent("garmin", false)).toBe(false);
  });
  it("requires consent once Garmin is connected and for every later step", () => {
    expect(onboardingNeedsHealthConsent("garmin", true)).toBe(true);
    for (const step of ["history", "about", "goals", "profile"] as const)
      expect(onboardingNeedsHealthConsent(step, false)).toBe(true);
  });
});

describe("consent dates", () => {
  it("formats timestamps and policy versions as JJ/MM/AAAA in Paris time", () => {
    expect(formatConsentDate("2026-10-24T22:30:00Z")).toBe("25/10/2026");
    expect(formatConsentDate("2026-10-24")).toBe("24/10/2026");
  });
});
