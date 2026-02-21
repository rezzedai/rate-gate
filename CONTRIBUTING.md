# Contributing to @rezzed.ai/rate-gate

Thank you for your interest in contributing to rate-gate! We welcome contributions that improve the library's functionality, performance, and documentation.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher

### Setup

1. Clone the repository:
```bash
git clone https://github.com/rezzedai/rate-gate.git
cd rate-gate
```

2. Install dependencies:
```bash
npm install
```

3. Run tests to verify your setup:
```bash
npm test
```

4. Build the project:
```bash
npm run build
```

## Development Workflow

### Branch Naming

Use conventional branch prefixes:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks

Example: `feat/redis-backend` or `fix/cleanup-memory-leak`

### Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Redis backend support
fix: prevent memory leak in cleanup method
docs: update API reference for hit() method
chore: upgrade TypeScript to 5.x
```

### Testing

Run the test suite before submitting your changes:

```bash
npm test
```

The project uses Node's built-in test runner (`node --test`). Add tests for new features and ensure all tests pass.

### Building

The project uses a dual ESM+CJS build system with TypeScript:

```bash
npm run build
```

This generates:
- `dist/esm/` - ES modules
- `dist/cjs/` - CommonJS modules
- Type definitions for both

## Pull Request Process

1. Create a feature branch from `master`
2. Make your changes with clear, conventional commits
3. Ensure all tests pass (`npm test`)
4. Run the build to verify no type errors (`npm run build`)
5. Push your branch and open a pull request
6. One approval is required before merging
7. Address any review feedback promptly

### PR Checklist

- [ ] Tests pass
- [ ] Code follows TypeScript best practices
- [ ] New features include tests
- [ ] Documentation is updated if needed
- [ ] Commits follow conventional format

## Code Style

- TypeScript with strict mode enabled
- ESM-first, CJS-compatible
- Zero runtime dependencies (dev dependencies are fine)
- Prefer async/await over callbacks
- Use meaningful variable names

## Questions?

Open an issue for discussion before starting work on major changes.

---

Built by [Rezzed.ai](https://rezzed.ai)
