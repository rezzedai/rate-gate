# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-20

### Added
- Initial release of @rezzed/rate-gate
- Sliding window rate limiting algorithm for accurate request throttling
- Pluggable backend system supporting custom storage implementations
- Built-in MemoryBackend for zero-dependency usage
- Zero runtime dependencies
- Full TypeScript support with complete type definitions
- Dual ESM and CommonJS module support
- Core API methods:
  - `hit()` - Check and record requests
  - `check()` - Verify without recording
  - `remaining()` - Get remaining request quota
  - `resetIn()` - Get time until reset
  - `cleanup()` - Remove expired entries
- `RateLimitError` with detailed limit information
- Comprehensive test suite using Node.js built-in test runner

---

Built by [Rezzed.ai](https://rezzed.ai)
