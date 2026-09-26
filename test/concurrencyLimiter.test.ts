import { describe, expect, it } from "vitest";
import { ConcurrencyLimiter } from "../src/concurrencyLimiter.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ConcurrencyLimiter", () => {
  it("never runs more than `limit` tasks at once", async () => {
    const limiter = new ConcurrencyLimiter(2);
    let active = 0;
    let maxActive = 0;

    const task = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(20);
      active--;
    };

    await Promise.all(Array.from({ length: 6 }, () => limiter.run(task)));

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("runs every queued task exactly once and returns its result", async () => {
    const limiter = new ConcurrencyLimiter(1);
    const results = await Promise.all(
      [1, 2, 3].map((n) => limiter.run(async () => n * 10)),
    );
    expect(results).toEqual([10, 20, 30]);
  });

  it("releases the slot even when a task throws", async () => {
    const limiter = new ConcurrencyLimiter(1);
    await expect(
      limiter.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await limiter.run(async () => "ok");
    expect(result).toBe("ok");
  });
});
