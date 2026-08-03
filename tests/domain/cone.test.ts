import { describe, expect, it } from "vitest";
import { aspergillumTipOrigin, deterministicDropletDirections, isInsideCone } from "../../src/domain/cone";

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
    expect(first).toHaveLength(18);
    for (const direction of first) expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);
  });

  it("places the emitter forward, down, and on the player's right side", () => {
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
});
