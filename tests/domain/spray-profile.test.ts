import { describe, expect, it } from "vitest";
import {
  CONTAINED_SPRAY_PROFILE,
  PROCESSIONAL_SPRAY_PROFILE,
  SPRAY_PROFILES,
  STANDARD_SPRAY_PROFILE,
  resolveSprayProfile,
} from "../../src/domain/spray-profile";

describe("spray profiles", () => {
  it("preserves the approved standard profile", () => {
    expect(STANDARD_SPRAY_PROFILE).toMatchObject({
      id: "standard",
      dropletCount: 36,
      pulseCount: 6,
      releaseDelayTicks: 5,
      actionDurationTicks: 18,
      steeringResponsiveness: 0.8,
      maximumTurnDegrees: 30,
      horizontalSpread: 0.26,
      minimumSpeed: 12.7,
    });
  });

  it("adds two bounded profiles without changing resource economy", () => {
    expect(SPRAY_PROFILES.map((profile) => profile.id)).toEqual(["standard", "processional", "contained"]);
    for (const profile of [PROCESSIONAL_SPRAY_PROFILE, CONTAINED_SPRAY_PROFILE]) {
      expect(profile.dropletCount).toBe(36);
      expect(profile.pulseCount).toBe(6);
      expect(profile.releaseDelayTicks).toBe(5);
      expect(profile.actionDurationTicks).toBe(18);
      expect(Object.values(profile).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
    }
  });

  it("falls back to the classic baseline for unknown profile ids", () => {
    expect(resolveSprayProfile("contained")).toBe(CONTAINED_SPRAY_PROFILE);
    expect(resolveSprayProfile("future-profile")).toBe(STANDARD_SPRAY_PROFILE);
    expect(resolveSprayProfile(undefined)).toBe(STANDARD_SPRAY_PROFILE);
  });
});
