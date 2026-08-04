import { describe, expect, it } from "vitest";
import {
  acquireActionLease,
  getActionLease,
  releaseActionLease,
} from "../../src/infrastructure/action-lease";

describe("action lease", () => {
  it("allows one exclusive player action and rejects a competing action", () => {
    const playerId = "lease-exclusive";
    const loading = acquireActionLease(playerId, "loading", 20);
    expect(loading.status).toBe("acquired");
    const competing = acquireActionLease(playerId, "sprinkling", 21);
    expect(competing.status).toBe("busy");
    expect(getActionLease(playerId)?.kind).toBe("loading");
    if (loading.status === "acquired") expect(releaseActionLease(playerId, loading.lease.token)).toBe(true);
  });

  it("does not let a stale token release a newer lease", () => {
    const playerId = "lease-token";
    const first = acquireActionLease(playerId, "loading", 30);
    expect(first.status).toBe("acquired");
    if (first.status !== "acquired") return;
    expect(releaseActionLease(playerId, "stale-token")).toBe(false);
    expect(getActionLease(playerId)?.token).toBe(first.lease.token);
    expect(releaseActionLease(playerId, first.lease.token)).toBe(true);

    const second = acquireActionLease(playerId, "sprinkling", 31);
    expect(second.status).toBe("acquired");
    if (second.status === "acquired") expect(releaseActionLease(playerId, second.lease.token)).toBe(true);
  });
});
