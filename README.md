# @rezzed/rate-gate

[![npm version](https://img.shields.io/npm/v/@rezzed/rate-gate.svg)](https://www.npmjs.com/package/@rezzed/rate-gate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@rezzed/rate-gate.svg)](https://nodejs.org)

A lightweight, flexible sliding window rate limiter with pluggable storage backends.

## Installation

```bash
npm install @rezzed/rate-gate
```

## Quick Start

```typescript
import { createRateGate } from '@rezzed/rate-gate';

// Create a rate limiter: 10 requests per minute
const gate = createRateGate({
  limit: 10,
  windowMs: 60000,
  category: 'api'
});

// Check and record a request
try {
  await gate.hit('user-123');
  // Request allowed - process it
} catch (error) {
  // Rate limit exceeded
  console.error(`Rate limited. Try again in ${error.resetIn}s`);
}

// Or check without recording
if (await gate.check('user-123')) {
  // Request would be allowed
}
```

## Features

- **Sliding window algorithm** - More accurate than fixed windows
- **Zero dependencies** - Lightweight and fast
- **Pluggable backends** - Use in-memory storage or bring your own (Redis, etc.)
- **TypeScript first** - Full type definitions included
- **Dual ESM/CJS** - Works in both module systems

## API Reference

### `createRateGate(options)`

Convenience function to create a `RateGate` instance with the default in-memory backend.

```typescript
const gate = createRateGate({
  limit: 100,           // Maximum requests allowed
  windowMs: 60000,      // Time window in milliseconds (default: 60000)
  category: 'api'       // Category name for error messages (default: 'rate-limit')
});
```

### `new RateGate(options, backend?)`

Create a rate limiter with a custom backend.

```typescript
import { RateGate, MemoryBackend } from '@rezzed/rate-gate';

const gate = new RateGate(
  { limit: 100, windowMs: 60000 },
  new MemoryBackend()
);
```

### Methods

#### `hit(key: string): Promise<void>`

Check if a request is allowed and record it. Throws `RateLimitError` if the limit is exceeded.

```typescript
try {
  await gate.hit('user-123');
  // Request allowed
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Try again in ${error.resetIn} seconds`);
  }
}
```

#### `check(key: string): Promise<boolean>`

Check if a request would be allowed without recording it.

```typescript
if (await gate.check('user-123')) {
  // Request would be allowed
}
```

#### `remaining(key: string): Promise<number>`

Get the number of requests remaining in the current window.

```typescript
const remaining = await gate.remaining('user-123');
console.log(`${remaining} requests remaining`);
```

#### `resetIn(key: string): Promise<number>`

Get the number of seconds until the rate limit resets for a key.

```typescript
const resetIn = await gate.resetIn('user-123');
console.log(`Resets in ${resetIn} seconds`);
```

#### `cleanup(): Promise<void>`

Remove expired entries from storage. Call this periodically to prevent memory growth.

```typescript
// Run cleanup every hour
setInterval(() => gate.cleanup(), 3600000);
```

### `RateLimitError`

Error thrown when the rate limit is exceeded.

```typescript
class RateLimitError extends Error {
  readonly resetIn: number;    // Seconds until reset
  readonly limit: number;      // The rate limit
  readonly windowMs: number;   // Window size in ms
}
```

## Custom Backends

Implement the `RateGateBackend` interface to use custom storage:

```typescript
import { RateGate, RateGateBackend } from '@rezzed/rate-gate';

class RedisBackend implements RateGateBackend {
  constructor(private redis: RedisClient) {}

  async get(key: string): Promise<number[]> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : [];
  }

  async set(key: string, timestamps: number[]): Promise<void> {
    await this.redis.set(key, JSON.stringify(timestamps));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async keys(): Promise<string[]> {
    return await this.redis.keys('*');
  }
}

const gate = new RateGate(
  { limit: 100, windowMs: 60000 },
  new RedisBackend(redisClient)
);
```

Backends can be synchronous or asynchronous - the interface supports both.

## Use Cases

- **API rate limiting** - Limit requests per user, IP, or API key
- **Abuse prevention** - Prevent spam and automated attacks
- **Resource protection** - Control access to expensive operations
- **Fair usage** - Ensure equitable resource distribution

## License

MIT

---

Built by [Rezzed.ai](https://rezzed.ai)
