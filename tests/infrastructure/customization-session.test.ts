import { afterEach, describe, expect, it } from "vitest";
import {
  acquireCustomizationSession,
  releaseCustomizationSession,
  releaseCustomizationAtBlock,
} from "../../src/infrastructure/customization-session";

describe("customization sessions", () => {
  afterEach(() => {
    releaseCustomizationSession("a");
    releaseCustomizationSession("b");
  });

  it("keeps one editor per player and per table", () => {
    expect(acquireCustomizationSession("a", "overworld", { x: 1, y: 2, z: 3 }, 10).status).toBe("acquired");
    expect(acquireCustomizationSession("a", "overworld", { x: 2, y: 2, z: 3 }, 11).status).toBe("player_busy");
    expect(acquireCustomizationSession("b", "overworld", { x: 1, y: 2, z: 3 }, 11)).toMatchObject({
      status: "block_busy",
      ownerId: "a",
    });
  });

  it("releases the table lock by player or block lifecycle", () => {
    expect(acquireCustomizationSession("a", "overworld", { x: -0.1, y: 2, z: -0.1 }, 10).status).toBe("acquired");
    expect(releaseCustomizationAtBlock("overworld", { x: -1, y: 2, z: -1 })).toBe(true);
    expect(acquireCustomizationSession("b", "overworld", { x: -1, y: 2, z: -1 }, 12).status).toBe("acquired");
    expect(releaseCustomizationSession("b")).toBe(true);
  });
});
