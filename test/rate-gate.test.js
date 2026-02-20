import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RateGate,
  RateLimitError,
  MemoryBackend,
  createRateGate,
} from "../dist/esm/index.js";

// Helper to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("creates a rate gate with custom limits", () => {
  const gate = new RateGate({ limit: 5, windowMs: 1000, category: "test" });
  assert.ok(gate instanceof RateGate);
});

test("allows requests within limit", async () => {
  const gate = new RateGate({ limit: 3, windowMs: 1000 });

  await gate.hit("user1");
  await gate.hit("user1");
  await gate.hit("user1");

  // Should not throw
  assert.ok(true);
});

test("blocks requests over limit", async () => {
  const gate = new RateGate({ limit: 2, windowMs: 1000, category: "test" });

  await gate.hit("user1");
  await gate.hit("user1");

  await assert.rejects(
    async () => await gate.hit("user1"),
    (err) => {
      assert.ok(err instanceof RateLimitError);
      assert.match(err.message, /Rate limit exceeded/);
      return true;
    }
  );
});

test("sliding window: old timestamps expire", async () => {
  const gate = new RateGate({ limit: 2, windowMs: 100 });

  await gate.hit("user1");
  await gate.hit("user1");

  // Should fail immediately
  await assert.rejects(async () => await gate.hit("user1"), RateLimitError);

  // Wait for window to expire
  await sleep(150);

  // Should succeed after window expires
  await gate.hit("user1");
  assert.ok(true);
});

test("resetIn returns correct value", async () => {
  const gate = new RateGate({ limit: 1, windowMs: 1000 });

  await gate.hit("user1");

  const resetIn = await gate.resetIn("user1");
  assert.ok(resetIn > 0 && resetIn <= 1, `resetIn should be ~1s, got ${resetIn}`);

  // After waiting, resetIn should be 0
  await sleep(1100);
  const resetInAfter = await gate.resetIn("user1");
  assert.equal(resetInAfter, 0);
});

test("remaining returns correct count", async () => {
  const gate = new RateGate({ limit: 3, windowMs: 1000 });

  const before = await gate.remaining("user1");
  assert.equal(before, 3);

  await gate.hit("user1");
  const after1 = await gate.remaining("user1");
  assert.equal(after1, 2);

  await gate.hit("user1");
  const after2 = await gate.remaining("user1");
  assert.equal(after2, 1);

  await gate.hit("user1");
  const after3 = await gate.remaining("user1");
  assert.equal(after3, 0);
});

test("hit throws RateLimitError when over limit", async () => {
  const gate = new RateGate({ limit: 1, windowMs: 1000, category: "api" });

  await gate.hit("user1");

  await assert.rejects(
    async () => await gate.hit("user1"),
    (err) => {
      assert.ok(err instanceof RateLimitError);
      assert.equal(err.name, "RateLimitError");
      assert.ok(err.resetIn > 0);
      assert.equal(err.limit, 1);
      assert.equal(err.windowMs, 1000);
      return true;
    }
  );
});

test("RateLimitError has correct properties", async () => {
  const gate = new RateGate({ limit: 1, windowMs: 5000, category: "api" });

  await gate.hit("user1");

  try {
    await gate.hit("user1");
    assert.fail("Should have thrown RateLimitError");
  } catch (err) {
    assert.ok(err instanceof RateLimitError);
    assert.equal(err.name, "RateLimitError");
    assert.ok(err.resetIn > 0 && err.resetIn <= 5);
    assert.equal(err.limit, 1);
    assert.equal(err.windowMs, 5000);
    assert.match(err.message, /Rate limit exceeded for api/);
  }
});

test("cleanup removes expired entries", async () => {
  const backend = new MemoryBackend();
  const gate = new RateGate({ limit: 2, windowMs: 100 }, backend);

  await gate.hit("user1");
  await gate.hit("user2");

  // Both keys should exist
  const keysBefore = backend.keys();
  assert.equal(keysBefore.length, 2);

  // Wait for entries to expire
  await sleep(150);

  await gate.cleanup();

  // All entries should be removed
  const keysAfter = backend.keys();
  assert.equal(keysAfter.length, 0);
});

test("multiple keys are independent", async () => {
  const gate = new RateGate({ limit: 1, windowMs: 1000 });

  await gate.hit("user1");
  await gate.hit("user2");

  // user1 should be limited
  await assert.rejects(async () => await gate.hit("user1"), RateLimitError);

  // user2 should be limited
  await assert.rejects(async () => await gate.hit("user2"), RateLimitError);

  // But they don't affect each other
  const remaining1 = await gate.remaining("user1");
  const remaining2 = await gate.remaining("user2");
  assert.equal(remaining1, 0);
  assert.equal(remaining2, 0);
});

test("custom backend works", async () => {
  class CustomBackend {
    constructor() {
      this.data = new Map();
    }

    get(key) {
      return this.data.get(key) || [];
    }

    set(key, timestamps) {
      this.data.set(key, timestamps);
    }

    delete(key) {
      this.data.delete(key);
    }

    keys() {
      return Array.from(this.data.keys());
    }
  }

  const backend = new CustomBackend();
  const gate = new RateGate({ limit: 2, windowMs: 1000 }, backend);

  await gate.hit("user1");
  await gate.hit("user1");

  // Check that backend was used
  const timestamps = backend.get("user1");
  assert.equal(timestamps.length, 2);

  // Should be limited
  await assert.rejects(async () => await gate.hit("user1"), RateLimitError);
});

test("check method works correctly", async () => {
  const gate = new RateGate({ limit: 2, windowMs: 1000 });

  // Should allow before hitting limit
  assert.equal(await gate.check("user1"), true);

  await gate.hit("user1");
  assert.equal(await gate.check("user1"), true);

  await gate.hit("user1");
  assert.equal(await gate.check("user1"), false);

  // After window expires, should allow again
  await sleep(1100);
  assert.equal(await gate.check("user1"), true);
});

test("createRateGate convenience function", async () => {
  const gate = createRateGate({ limit: 1, windowMs: 1000 });

  assert.ok(gate instanceof RateGate);
  await gate.hit("user1");
  await assert.rejects(async () => await gate.hit("user1"), RateLimitError);
});
