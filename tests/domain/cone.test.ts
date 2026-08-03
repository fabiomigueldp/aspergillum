import { describe, expect, it } from "vitest";
import {
  aspergillumTipOrigin,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
  isInsideCone,
} from "../../src/domain/cone";

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
});
