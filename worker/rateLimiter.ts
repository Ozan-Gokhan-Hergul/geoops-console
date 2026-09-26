export interface FixedWindowOptions {
  max: number;
  windowMs: number;
}

/**
 * Fixed-window request counter keyed by an arbitrary string (typically a
 * client IP). This is scoped to whichever single Worker isolate happens to
 * hold it in memory: Cloudflare may run many isolates for the same Worker
 * concurrently across its network, and can evict/recycle an isolate (and
 * this state with it) at any time. It is a best-effort, per-isolate guard,
 * NOT a distributed rate limit — see DECISIONS.md for the full rationale.
 */
export class FixedWindowRateLimiter {
  private readonly counts = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly options: FixedWindowOptions) {}

  /** Returns true if the request is allowed, false if the key is over limit. */
  allow(key: string, now: number = Date.now()): boolean {
    const entry = this.counts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.counts.set(key, { count: 1, resetAt: now + this.options.windowMs });
      return true;
    }

    if (entry.count >= this.options.max) {
      return false;
    }

    entry.count += 1;
    return true;
  }
}
