/**
 * Caps how many calls to `run` execute at once, queueing the rest. Used to
 * keep outbound Overpass requests polite regardless of how many inbound API
 * requests arrive — a separate concern from the inbound rate limiter, which
 * only throttles clients calling this service.
 */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
