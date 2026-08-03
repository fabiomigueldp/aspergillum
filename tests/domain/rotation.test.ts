import { describe, expect, it } from "vitest";
import { yawToSixteenWayRotation } from "../../src/domain/rotation";

describe("yawToSixteenWayRotation", () => {
  it("maps a full turn into sixteen stable sectors", () => {
    expect(yawToSixteenWayRotation(0)).toBe(0);
    expect(yawToSixteenWayRotation(22.5)).toBe(1);
    expect(yawToSixteenWayRotation(90)).toBe(4);
    expect(yawToSixteenWayRotation(180)).toBe(8);
    expect(yawToSixteenWayRotation(337.5)).toBe(15);
  });

  it("normalizes negative, wrapped, and invalid angles", () => {
    expect(yawToSixteenWayRotation(-22.5)).toBe(15);
    expect(yawToSixteenWayRotation(360)).toBe(0);
    expect(yawToSixteenWayRotation(382.5)).toBe(1);
    expect(yawToSixteenWayRotation(Number.NaN)).toBe(0);
  });
});
