/**
 * Tracks whether search inputs (location/radius/categories) changed since a
 * request was started, so a response that arrives after the user has moved
 * on can be detected and discarded instead of rendered as if current.
 */
export class RequestGuard {
  private token = 0;

  /** Call whenever the search inputs change (new selection, radius, categories). */
  invalidate(): void {
    this.token += 1;
  }

  /** Snapshot to keep alongside a request; compare later with `isStale`. */
  snapshot(): number {
    return this.token;
  }

  /** True if the inputs changed since `snapshot` was taken. */
  isStale(snapshot: number): boolean {
    return snapshot !== this.token;
  }
}
