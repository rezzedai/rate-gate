/**
 * Options for configuring a RateGate instance
 */
export interface RateGateOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in milliseconds (default: 60000) */
  windowMs?: number;
  /** Category name for this limiter (used in error messages) */
  category?: string;
}

/**
 * Backend interface for storing rate limit data.
 * Implementations can be synchronous or asynchronous.
 */
export interface RateGateBackend {
  /** Get timestamps for a key */
  get(key: string): Promise<number[]> | number[];
  /** Set timestamps for a key */
  set(key: string, timestamps: number[]): Promise<void> | void;
  /** Delete a key */
  delete(key: string): Promise<void> | void;
  /** Iterate all keys */
  keys(): Promise<string[]> | string[];
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  readonly resetIn: number;
  readonly limit: number;
  readonly windowMs: number;

  constructor(
    message: string,
    options: { resetIn: number; limit: number; windowMs: number }
  ) {
    super(message);
    this.name = "RateLimitError";
    this.resetIn = options.resetIn;
    this.limit = options.limit;
    this.windowMs = options.windowMs;
  }
}

/**
 * In-memory backend using a Map for storage
 */
export class MemoryBackend implements RateGateBackend {
  private store = new Map<string, number[]>();

  get(key: string): number[] {
    return this.store.get(key) || [];
  }

  set(key: string, timestamps: number[]): void {
    this.store.set(key, timestamps);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Sliding window rate limiter with pluggable backends
 */
export class RateGate {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly category: string;
  private readonly backend: RateGateBackend;

  constructor(options: RateGateOptions, backend?: RateGateBackend) {
    this.limit = options.limit;
    this.windowMs = options.windowMs ?? 60000;
    this.category = options.category ?? "rate-limit";
    this.backend = backend ?? new MemoryBackend();
  }

  /**
   * Check if a request is allowed. Returns true if allowed.
   */
  async check(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get current timestamps and filter out expired ones
    const timestamps = await this.backend.get(key);
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if we're under the limit
    return validTimestamps.length < this.limit;
  }

  /**
   * Check and throw RateLimitError if not allowed.
   * Records the request timestamp if allowed.
   */
  async hit(key: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get current timestamps and filter out expired ones
    const timestamps = await this.backend.get(key);
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if we're over the limit
    if (validTimestamps.length >= this.limit) {
      const oldestTimestamp = validTimestamps[0];
      const resetIn = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

      throw new RateLimitError(
        `Rate limit exceeded for ${this.category}. Try again in ${resetIn}s.`,
        {
          resetIn,
          limit: this.limit,
          windowMs: this.windowMs,
        }
      );
    }

    // Record this request
    validTimestamps.push(now);
    await this.backend.set(key, validTimestamps);
  }

  /**
   * Get seconds until rate limit resets for a key.
   * Returns 0 if no rate limit is active.
   */
  async resetIn(key: string): Promise<number> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = await this.backend.get(key);
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = validTimestamps[0];
    const resetMs = oldestTimestamp + this.windowMs - now;
    return Math.max(0, Math.ceil(resetMs / 1000));
  }

  /**
   * Get remaining requests for a key in the current window.
   */
  async remaining(key: string): Promise<number> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = await this.backend.get(key);
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    return Math.max(0, this.limit - validTimestamps.length);
  }

  /**
   * Clean up expired entries. Call periodically to prevent memory growth.
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const allKeys = await this.backend.keys();

    for (const key of allKeys) {
      const timestamps = await this.backend.get(key);
      const validTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (validTimestamps.length === 0) {
        await this.backend.delete(key);
      } else if (validTimestamps.length < timestamps.length) {
        await this.backend.set(key, validTimestamps);
      }
    }
  }
}

/**
 * Convenience function to create a RateGate with default in-memory backend
 */
export function createRateGate(options: RateGateOptions): RateGate {
  return new RateGate(options);
}
