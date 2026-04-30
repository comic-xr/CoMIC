# Quick Reference Guide

## Essential Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build           # Production build
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Check for linting errors (zero-warning enforcement)
npm run format          # Auto-format code with Prettier
npm run format:check    # Check formatting without changes
npm run type-check      # Validate TypeScript types

# Testing
npm run test            # Run tests (setup required)
```

## Before Committing

```bash
# 1. Format your code
npm run format

# 2. Check for issues
npm run lint
npm run type-check

# 3. Verify production build
npm run build

# 4. Commit changes
git add .
git commit -m "Your descriptive commit message"
```

## Strict Rules Summary

| Rule | Enforcement | Why |
|------|------------|-----|
| No `any` types | Error | Prevents accidental type unsafety |
| No unused variables | Error | Keeps code clean and maintainable |
| No implicit `any` | Error | Enforces explicit type declarations |
| Prettier formatting | Error | Consistent code style across team |
| Zero warnings on build | Fail | No technical debt accumulation |
| Node version 18+ | Required | Modern language features available |
| ESM only | Required | No CommonJS mixing, future-proof |

## File Organization

### Source Code (`src/`)
- TypeScript/TSX files
- React components
- Utilities and helpers
- All ESM imports/exports
- Full type safety required

### Data (`data/`)
- **Never** hardcode paths here
- Use these patterns instead:
  ```typescript
  // ✓ Good: Configuration file
  import config from './data.config.json';
  const dataPath = config.paths.dataset;
  
  // ✓ Good: Environment variable
  const dataPath = process.env.DATA_PATH;
  
  // ✗ Bad: Hardcoded path
  const dataPath = '/Users/fahim_arsad/Desktop/data/file.csv';
  ```

### Documentation (`docs/`)
- Architecture decisions
- Setup guides
- API documentation
- Engineering standards

## TypeScript Best Practices

```typescript
// ✓ Always add return types
function calculateSum(a: number, b: number): number {
  return a + b;
}

// ✗ Never use implicit any
function calculateSum(a, b) { // Error!
  return a + b;
}

// ✓ Use const by default
const count = 0;

// ✗ Avoid var and let unless reassignment needed
var count = 0; // Error!

// ✓ Explicit error handling
try {
  // code
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

// ✓ Type guards
function process(value: unknown): void {
  if (typeof value === 'string') {
    console.log(value.toUpperCase());
  }
}
```

## Troubleshooting

**Build failing with type errors?**
```bash
npm run type-check    # See detailed TypeScript errors
# Fix errors in your code
```

**Lint issues?**
```bash
npm run lint          # See all issues
npm run format        # Auto-fix formatting issues
# Manually fix remaining issues
```

**Need to update dependencies?**
```bash
npm install           # Install updates from package.json
npm run build         # Verify build still works
npm run lint          # Verify code still passes
```

**Forgetting Node version?**
```bash
# Automatically use correct version with nvm
nvm use              # Uses .nvmrc (18.20.7)
```

## Common Patterns

### Loading Data from Configuration
```typescript
// data/config.json
{
  "datasets": {
    "training": "/path/to/training/data",
    "validation": "/path/to/validation/data"
  }
}

// src/dataLoader.ts
import config from '../data/config.json';

export function loadTrainingData(): string {
  return config.datasets.training;
}
```

### Environment Variable Pattern
```bash
# .env.local
DATA_PATH=/Users/fahim_arsad/Desktop/CIVA_Reduction/data
```

```typescript
// src/dataLoader.ts
function getDataPath(): string {
  const path = process.env.DATA_PATH;
  if (!path) {
    throw new Error('DATA_PATH environment variable not set');
  }
  return path;
}
```

## Key Files Reference

| File | Purpose | Edit? |
|------|---------|-------|
| `.eslintrc.json` | ESLint rules | ⚠️ With care |
| `.prettierrc.json` | Formatting | ⚠️ With care |
| `tsconfig.json` | TypeScript config | ⚠️ With care |
| `vite.config.ts` | Build config | ⚠️ With care |
| `.nvmrc` | Node version | Rarely |
| `package.json` | Dependencies/scripts | Regularly |
| `src/` | Your code | Constantly |
