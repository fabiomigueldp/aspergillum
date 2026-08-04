import { describe, expect, it } from "vitest";
import {
  aspergillumTipOrigin,
  createSprayBasis,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
  isInsideCone,
  steerDirection,
  transportSprayBasis,
} from "../../src/domain/cone";
import { STANDARD_SPRAY_PROFILE } from "../../src/domain/spray-profile";

describe("sprinkle cone", () => {
  it("includes targets in front and excludes targets behind or too far away", () => {
    const origin = { x: 0, y: 1, z: 0 };
    const forward = { x: 0, y: 0, z: 1 };
    expect(isInsideCone(origin, forward, { x: 0.3, y: 1, z: 3 }, 6, 20)).toBe(true);
    expect(isInsideCone(origin, forward, { x: 0, y: 1, z: -1 }, 6, 20)).toBe(false);
    expect(isInsideCone(origin, forward, { x: 0, y: 1, z: 7 }, 6, 20)).toBe(false);
  });

  it("builds normalized, repeatable droplet directions", () => {
    const first = deterministicDropletDirections({ x: 0, y: 0, z: 1 });
    const second = deterministicDropletDirections({ x: 0, y: 0, z: 1 });
    expect(first).toEqual(second);
    expect(first).toHaveLength(36);
    for (const direction of first) expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);

    const horizontalAngles = first.map((direction) => Math.atan2(Math.abs(direction.x), direction.z) * 180 / Math.PI);
    const verticalAngles = first.map((direction) => Math.atan2(Math.abs(direction.y), direction.z) * 180 / Math.PI);
    const horizontalMean = horizontalAngles.reduce((total, angle) => total + angle, 0) / horizontalAngles.length;
    const verticalMean = verticalAngles.reduce((total, angle) => total + angle, 0) / verticalAngles.length;
    expect(horizontalMean).toBeGreaterThan(7.4);
    expect(horizontalMean).toBeLessThan(7.6);
    expect(verticalMean).toBeGreaterThan(2.3);
    expect(verticalMean).toBeLessThan(2.5);
    expect(Math.max(...horizontalAngles)).toBeGreaterThan(14.4);
    expect(Math.max(...horizontalAngles)).toBeLessThan(14.6);
    expect(Math.max(...verticalAngles)).toBeLessThan(5.2);
  });

  it("preserves the proven lower, forward, right-side emitter origin", () => {
    const head = { x: 0, y: 1.62, z: 0 };
    const facingNorth = aspergillumTipOrigin(head, { x: 0, y: 0, z: -1 });
    const facingEast = aspergillumTipOrigin(head, { x: 1, y: 0, z: 0 });

    expect(facingNorth.x).toBeCloseTo(0.48);
    expect(facingNorth.y).toBeCloseTo(1.47);
    expect(facingNorth.z).toBeCloseTo(-0.55);
    expect(facingEast.x).toBeCloseTo(0.55);
    expect(facingEast.y).toBeCloseTo(1.47);
    expect(facingEast.z).toBeCloseTo(0.48);
  });

  it("distributes every droplet exactly once across six balanced emission frames", () => {
    const frames = Array.from({ length: 6 }, (_, frame) => dropletIndicesForFrame(36, 6, frame));
    expect(frames.every((indices) => indices.length === 6)).toBe(true);
    expect(frames.flat()).toEqual(Array.from({ length: 36 }, (_, index) => index));
    expect(dropletIndicesForFrame(36, 6, 6)).toEqual([]);

    for (const indices of frames) {
      const speeds = indices.map((index) => deterministicDropletSpeed(index));
      expect(new Set(speeds).size).toBe(5);
      expect(Math.min(...speeds)).toBeGreaterThanOrEqual(12.7);
      expect(Math.max(...speeds)).toBeLessThanOrEqual(13.98);
    }
  });

  it("steers successive pulses smoothly toward camera movement", () => {
    const initial = { x: 0, y: 0, z: 1 };
    const right = { x: 1, y: 0, z: 0 };
    const first = steerDirection(initial, right);
    const firstTurn = Math.acos(first.z) * 180 / Math.PI;
    expect(firstTurn).toBeCloseTo(30, 5);

    let tracked = initial;
    for (let pulse = 0; pulse < 5; pulse += 1) tracked = steerDirection(tracked, right);
    expect(tracked.x).toBeGreaterThan(0.999);
    expect(Math.hypot(tracked.x, tracked.y, tracked.z)).toBeCloseTo(1);
  });

  it("remains finite through a complete camera reversal", () => {
    let tracked = { x: 0, y: 0, z: 1 };
    for (let pulse = 0; pulse < 6; pulse += 1) {
      tracked = steerDirection(tracked, { x: 0, y: 0, z: -1 });
      expect(Number.isFinite(tracked.x + tracked.y + tracked.z)).toBe(true);
      expect(Math.hypot(tracked.x, tracked.y, tracked.z)).toBeCloseTo(1);
    }
    expect(tracked.z).toBeLessThan(-0.99);
  });

  it("transports the fan basis through vertical aim without a roll flip", () => {
    let basis = createSprayBasis({ x: 0, y: 0, z: 1 });
    let previousRight = basis.right;
    for (const degrees of [30, 60, 85, 89, 91, 95, 120, 150]) {
      const radians = degrees * Math.PI / 180;
      basis = transportSprayBasis(basis, { x: 0, y: Math.sin(radians), z: Math.cos(radians) });
      expect(Math.hypot(basis.forward.x, basis.forward.y, basis.forward.z)).toBeCloseTo(1);
      expect(Math.hypot(basis.right.x, basis.right.y, basis.right.z)).toBeCloseTo(1);
      expect(Math.abs(basis.forward.x * basis.right.x + basis.forward.y * basis.right.y + basis.forward.z * basis.right.z)).toBeLessThan(1e-6);
      expect(basis.right.x * previousRight.x + basis.right.y * previousRight.y + basis.right.z * previousRight.z).toBeGreaterThan(0.99);
      previousRight = basis.right;
    }
  });

  it("keeps the standard spray profile explicit and internally balanced", () => {
    expect(STANDARD_SPRAY_PROFILE.id).toBe("standard");
    expect(STANDARD_SPRAY_PROFILE.dropletCount).toBe(36);
    expect(STANDARD_SPRAY_PROFILE.pulseCount).toBe(6);
    expect(STANDARD_SPRAY_PROFILE.releaseDelayTicks).toBe(4);
    expect(STANDARD_SPRAY_PROFILE.actionDurationTicks).toBe(18);
    expect(STANDARD_SPRAY_PROFILE.steeringResponsiveness).toBe(0.8);
    expect(STANDARD_SPRAY_PROFILE.maximumTurnDegrees).toBe(30);
  });
});
