import { describe, expect, it } from "vitest";
import { RequestGuard } from "../src/requestGuard";

describe("RequestGuard", () => {
  it("is not stale if nothing changed since the snapshot", () => {
    const guard = new RequestGuard();
    const snapshot = guard.snapshot();
    expect(guard.isStale(snapshot)).toBe(false);
  });

  it("is stale after an invalidation (new selection, radius, or categories)", () => {
    const guard = new RequestGuard();
    const snapshot = guard.snapshot();
    guard.invalidate();
    expect(guard.isStale(snapshot)).toBe(true);
  });

  it("treats a fresh snapshot taken after invalidation as current", () => {
    const guard = new RequestGuard();
    guard.invalidate();
    const snapshot = guard.snapshot();
    expect(guard.isStale(snapshot)).toBe(false);
  });

  it("only the latest of several in-flight snapshots matches after invalidation", () => {
    const guard = new RequestGuard();
    const snapshotA = guard.snapshot();
    guard.invalidate();
    const snapshotB = guard.snapshot();

    expect(guard.isStale(snapshotA)).toBe(true);
    expect(guard.isStale(snapshotB)).toBe(false);
  });
});
