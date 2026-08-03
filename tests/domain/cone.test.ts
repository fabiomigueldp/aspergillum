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
    expect(first).toHaveLength(30);
    for (const direction of first) expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);
  });

  it("sweeps the emitter forward and inward from the player's right side", () => {
    const head = { x: 0, y: 1.62, z: 0 };
    const northStart = aspergillumTipOrigin(head, { x: 0, y: 0, z: -1 }, 0);
    const northMiddle = aspergillumTipOrigin(head, { x: 0, y: 0, z: -1 }, 0.5);
    const northEnd = aspergillumTipOrigin(head, { x: 0, y: 0, z: -1 }, 1);
    const eastMiddle = aspergillumTipOrigin(head, { x: 1, y: 0, z: 0 }, 0.5);

    expect(northStart).toEqual({ x: 0.36, y: 1.52, z: -0.62 });
    expect(northMiddle.x).toBeCloseTo(0.3);
    expect(northMiddle.y).toBeCloseTo(1.58);
    expect(northMiddle.z).toBeCloseTo(-0.68);
    expect(northEnd).toEqual({ x: 0.24, y: 1.52, z: -0.74 });
    expect(eastMiddle.x).toBeCloseTo(0.68);
    expect(eastMiddle.y).toBeCloseTo(1.58);
    expect(eastMiddle.z).toBeCloseTo(0.3);
  });

  it("distributes every droplet exactly once across six balanced emission frames", () => {
    const frames = Array.from({ length: 6 }, (_, frame) => dropletIndicesForFrame(30, 6, frame));
    expect(frames.every((indices) => indices.length === 5)).toBe(true);
    expect(frames.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, index) => index));
    expect(dropletIndicesForFrame(30, 6, 6)).toEqual([]);

    for (const [frameIndex, indices] of frames.entries()) {
      const speeds = indices.map((index) => deterministicDropletSpeed(index, 6, frameIndex));
      expect(new Set(speeds).size).toBe(5);
      expect(Math.min(...speeds)).toBeGreaterThanOrEqual(11.4);
      expect(Math.max(...speeds)).toBeLessThanOrEqual(13.22);
    }
  });
});
