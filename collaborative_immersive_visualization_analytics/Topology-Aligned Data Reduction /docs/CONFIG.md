# Configuration System Guide

## Overview

The CIVA Reduction application uses a **centralized configuration system** with no magic numbers or hardcoded thresholds scattered throughout the code.

- **All configurable values** are defined in `src/config/`
- **All values are validated** at application startup (fail-fast)
- **Type-safe access** via TypeScript interfaces
- **Environment variables override defaults** using `VITE_*` convention

## Configuration Philosophy

> "No magic numbers in code. All settings in one place. Validation at startup."

### Benefits

✅ **Easy to tune** - Change LOD thresholds without touching code  
✅ **Fail-fast** - Invalid config caught immediately, with clear errors  
✅ **Type-safe** - Full TypeScript support, no stringly-typed config  
✅ **Documented** - Every setting has purpose and constraints  
✅ **Testable** - Test with different configs without code changes  
✅ **Reproducible** - Same config = same behavior across environments

## Configuration Files

```
src/config/
├── index.ts          # Public API exports
├── types.ts          # TypeScript type definitions
├── appConfig.ts      # Default configuration + env var loading
└── validator.ts      # Configuration validation logic

Root:
└── .env.example      # Example environment variables
```

## Using Configuration

### Accessing Configuration

```typescript
import { appConfig } from '@/config';

// Access any setting
console.log(appConfig.dataset.defaultDatasetId);
console.log(appConfig.lod.mediumThresholdM);
console.log(appConfig.rendering.targetFPS);

// Values are type-safe and auto-completed in your IDE
const opacity: number = appConfig.rendering.defaultOpacity;
```

### Setting Environment Variables

#### Development (.env.local)

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

**Important:** `.env.local` is in `.gitignore` - never commit it.

## Configuration Domains

1. **Dataset** - Where data comes from, size limits
2. **LOD (Level of Detail)** - Distance thresholds for rendering quality
3. **ROI (Region of Interest)** - Size and shape constraints
4. **Rendering** - Visual defaults, performance settings
5. **XR** - AR/VR specific configuration
6. **Logging** - Debug and telemetry settings
7. **Performance** - Monitoring and optimization thresholds

## Best Practices

### ✅ DO

- ✅ Access config via `import { appConfig } from '@/config'`
- ✅ Use environment variables for per-environment settings
- ✅ Document why a setting exists
- ✅ Validate constraints in the validator
- ✅ Use meaningful default values
- ✅ Group related settings together

### ❌ DON'T

- ❌ Hardcode thresholds in logic code
- ❌ Store config in multiple places
- ❌ Use stringly-typed config access
- ❌ Skip validation at startup
- ❌ Put business logic in config files
- ❌ Commit `.env.local` to git

## Troubleshooting

### Configuration won't load

**Problem:** "Config validation failed: dataset.basePath is required"

**Solution:** Set the environment variable
```bash
export VITE_DATA_PATH=/path/to/data
```

### Environment variable not working

**Problem:** Changed `.env.local` but changes don't apply

**Solution:** Restart dev server
```bash
# Stop: Ctrl+C
npm run dev
```
