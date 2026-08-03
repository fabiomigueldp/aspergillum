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

    const angles = first.map((direction) => Math.acos(direction.z) * 180 / Math.PI);
    const meanAngle = angles.reduce((total, angle) => total + angle, 0) / angles.length;
    expect(meanAngle).toBeGreaterThan(9.5);
    expect(meanAngle).toBeLessThan(10);
    expect(Math.max(...angles)).toBeGreaterThan(15);
    expect(Math.max(...angles)).toBeLessThan(15.5);
  });

  it("preserves the proven lower, forward, right-side emitter origin", () => {
    const head = { x: 0, y: 1.62, z: 0 };
    const facingNorth = aspergillumTipOrigin(head, { x: 0, y: 0, z: -1 });
    const facingEast = aspergillumTipOrigin(head, { x: 1, y: 0, z: 0 });

    expect(facingNorth.x).toBeCloseTo(0.3);
    expect(facingNorth.y).toBeCloseTo(1.2);
    expect(facingNorth.z).toBeCloseTo(-0.72);
    expect(facingEast.x).toBeCloseTo(0.72);
    expect(facingEast.y).toBeCloseTo(1.2);
    expect(facingEast.z).toBeCloseTo(0.3);
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
