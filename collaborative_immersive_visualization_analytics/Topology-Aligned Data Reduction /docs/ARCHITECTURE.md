# Architecture Guide: CIVA Reduction

This document defines the folder structure, module boundaries, and API contracts for the CIVA Reduction project. Every feature must fit cleanly into one of these modules.

## Architecture Overview

```
src/
├── core/
│   ├── renderer/      → 3D rendering (Three.js)
│   └── webxr/         → XR device integration
├── data/              → Data loading & transformation
├── interaction/       → User input & gestures
├── metrics/           → Performance & analytics
├── state/             → Application state management
├── ui/                → React UI components
└── utils/             → Pure utilities & helpers
```

## Module Responsibilities & Boundaries

### 📊 core/renderer → 3D Rendering

**Owns:**
- Three.js scene, renderer, and camera
- WebGL rendering pipeline
- Mesh and material creation
- Lighting setup
- Animation loop management
- Shader definitions
- Post-processing effects

**Exports:**
```typescript
export { RendererManager } from './renderer-manager';    // Initialize & manage renderer
export { SceneManager } from './scene-manager';          // Create & manage 3D scene
export type { RendererConfig } from './types';
```

**Example Usage:**
```typescript
import { RendererManager, SceneManager } from '@/core/renderer';

const renderer = new RendererManager(canvas);
const scene = new SceneManager();
renderer.render(scene);
```

**DO NOT:**
- ❌ Handle user input (belongs in `interaction/`)
- ❌ Store application state (belongs in `state/`)
- ❌ Load data files (belongs in `data/`)
- ❌ Track metrics (belongs in `metrics/`)

**Dependencies:**
- ✅ `Three.js`
- ✅ `utils/` (for math, constants)
- ❌ No other modules

---

### 🥽 core/webxr → XR Device Integration

**Owns:**
- WebXR session initialization
- XR device capability detection
- Input source management (controllers, hands)
- Reference space handling
- XR frame loop integration
- Device-specific workarounds

**Exports:**
```typescript
export { XRSessionManager } from './xr-session-manager';      // XR session lifecycle
export { XRInputManager } from './xr-input-manager';          // XR input events
export type { XRSessionConfig, InputSourceEvent } from './types';
```

**Example Usage:**
```typescript
import { XRSessionManager, XRInputManager } from '@/core/webxr';

const xrSession = await new XRSessionManager().init();
const inputManager = new XRInputManager(xrSession);
inputManager.onInput((event) => console.log(event));
```

**DO NOT:**
- ❌ Render anything (belongs in `renderer/`)
- ❌ Process user interaction logic (belongs in `interaction/`)
- ❌ Mutate app state (belongs in `state/`)

**Dependencies:**
- ✅ WebXR API
- ✅ `utils/` (for constants)
- ❌ No other modules

---

### 💾 data → Data Loading & Transformation

**Owns:**
- Loading data from files/APIs
- Data parsing (JSON, CSV, Binary)
- Data validation against schemas
- Data transformation pipelines
- Caching strategies
- Environment-based path resolution

**Exports:**
```typescript
export { DataLoader } from './data-loader';              // Load from sources
export { DataValidator } from './data-validator';        // Validate structure
export type { DataConfig, LoadedData } from './types';
```

**Example Usage:**
```typescript
import { DataLoader, DataValidator } from '@/data';

const loader = new DataLoader(config);
const rawData = await loader.load('training');
const validated = new DataValidator().validate(rawData);
```

**CONSTRAINTS:**
- ⚠️ **NO hardcoded paths**: Use `process.env` or `data/config.json`
- ⚠️ **Async only**: No synchronous file operations
- ⚠️ **Descriptive errors**: Always provide context

**Example: Loading Data Safely**
```typescript
// ✓ GOOD: Use environment variable
const dataPath = process.env.VITE_DATA_PATH || '/default/path';
const data = await loader.load(dataPath);

// ✓ GOOD: Use config file
import config from '@/data/config.json';
const data = await loader.load(config.datasets.training);

// ✗ BAD: Hardcoded path
const data = await loader.load('/Users/fahim_arsad/Desktop/data');
```

**DO NOT:**
- ❌ Render data (belongs in `ui/`)
- ❌ Mutate state (belongs in `state/`)
- ❌ Handle input (belongs in `interaction/`)

**Dependencies:**
- ✅ `utils/` (for validation helpers)
- ❌ No other modules

---

### 👆 interaction → User Input & Gestures

**Owns:**
- Mouse, keyboard, touch input handling
- Gesture recognition (swipe, pinch, etc.)
- Event normalization
- Raycasting & collision detection
- Input state tracking

**Exports:**
```typescript
export { InputManager } from './input-manager';          // Register & dispatch input
export { GestureRecognizer } from './gesture-recognizer'; // Recognize gestures
export type { InputEvent, GestureType } from './types';
```

**Example Usage:**
```typescript
import { InputManager } from '@/interaction';

const inputMgr = new InputManager(canvas);
inputMgr.on('click', (event) => {
  // Event is normalized (works for mouse, touch, XR)
  console.log(event.position, event.type);
});
```

**CONSTRAINTS:**
- ⚠️ **Pure event handling**: No business logic
- ⚠️ **Consistent event format**: Normalize all input types
- ⚠️ **Decouple from state**: Dispatch events, don't mutate

**DO NOT:**
- ❌ Mutate state directly (dispatch to `state/`)
- ❌ Perform rendering (belongs in `renderer/`)
- ❌ Execute domain logic
- ❌ Load data (belongs in `data/`)

**Dependencies:**
- ✅ Browser input APIs
- ✅ `utils/` (for math, type guards)
- ❌ No other modules

---

### 📈 metrics → Performance & Analytics

**Owns:**
- FPS and frame time monitoring
- Memory usage tracking
- Performance profiling
- User analytics events
- Telemetry collection
- Metrics aggregation

**Exports:**
```typescript
export { MetricsCollector } from './metrics-collector';    // Collect metrics
export { PerformanceMonitor } from './performance-monitor'; // Monitor FPS, memory
export type { MetricPoint, PerformanceMetrics } from './types';
```

**Example Usage:**
```typescript
import { MetricsCollector, PerformanceMonitor } from '@/metrics';

const monitor = new PerformanceMonitor();
monitor.startFrame();
// ... render frame ...
monitor.endFrame();

const perf = monitor.getMetrics(); // { fps, frameTime, memory }
```

**CONSTRAINTS:**
- ⚠️ **Non-blocking**: Use async collection where possible
- ⚠️ **Zero overhead**: No impact on performance
- ⚠️ **Graceful degradation**: Work even if unavailable

**DO NOT:**
- ❌ Mutate state (belongs in `state/`)
- ❌ Perform rendering (belongs in `renderer/`)
- ❌ Handle input (belongs in `interaction/`)

**Dependencies:**
- ✅ Performance API
- ✅ `utils/` (for averaging, aggregation)
- ❌ No other modules

---

### 🎛️ state → Application State Management

**Owns:**
- Global application state
- State mutations via actions
- State selectors and derived state
- State change subscriptions
- State persistence (if needed)

**Exports:**
```typescript
export { Store } from './store';                  // Central state container
export { createActions } from './actions';        // Create action creators
export { createSelectors } from './selectors';    // Create state selectors
export type { AppState, Action } from './types';
```

**State Structure:**
```typescript
interface AppState {
  // UI state
  ui: {
    activePanel: string | null;
    selectedDataset: string | null;
  };
  
  // Data state
  data: {
    loadedDatasets: Map<string, DataPoints>;
    currentView: 'scatter' | 'timeline';
  };
  
  // Interaction state
  interaction: {
    activeTool: 'select' | 'pan' | 'zoom';
    hoverTarget: string | null;
  };
  
  // Camera state
  camera: {
    position: Vector3;
    rotation: Quaternion;
  };
}
```

**Example Usage:**
```typescript
import { Store, createActions, createSelectors } from '@/state';

const store = new Store(initialState);
const actions = createActions(store);
const selectors = createSelectors(store);

// Mutate state through actions only
actions.selectDataset('training');

// Subscribe to changes
store.subscribe((state) => {
  console.log('State changed:', state);
});

// Access state through selectors
const selected = selectors.getSelectedDataset();
```

**CONSTRAINTS:**
- ⚠️ **Single source of truth**: All state in one place
- ⚠️ **Immutable updates**: Always create new objects
- ⚠️ **Actions only**: No direct state mutations
- ⚠️ **Typescript strict**: Full type safety

**DO NOT:**
- ❌ Perform rendering (belongs in `renderer/`)
- ❌ Handle input (belongs in `interaction/`)
- ❌ Load data (belongs in `data/`)

**Dependencies:**
- ✅ `utils/` (for immutable helpers)
- ❌ No other modules

---

### 🎨 ui → React Components

**Owns:**
- React UI components
- Layout and styling (CSS/Tailwind)
- Form validation UI
- Data visualization
- Modals, tooltips, notifications
- Component-local state (hooks)

**Exports:**
```typescript
export { App } from './App';
export type { ComponentProps } from './types';
```

**Component Organization:**
```
ui/
├── panels/        # Information display panels
├── controls/      # User interaction controls
├── widgets/       # Reusable UI widgets
└── hooks/         # Custom React hooks
```

**Example Usage:**
```typescript
import { App } from '@/ui';

<App 
  store={store} 
  onDatasetSelect={actions.selectDataset}
/>
```

**CONSTRAINTS:**
- ⚠️ **Dumb components**: Presentation only
- ⚠️ **Props-driven**: All data via props
- ⚠️ **No direct DOM**: Use React patterns
- ⚠️ **No business logic**: State mutations via callbacks

**DO NOT:**
- ❌ Contain business logic (belongs in `state/`)
- ❌ Perform WebGL rendering (belongs in `renderer/`)
- ❌ Load data directly (belongs in `data/`)
- ❌ Handle low-level input (belongs in `interaction/`)

**Dependencies:**
- ✅ `React`
- ✅ `state/` (subscribe to state)
- ✅ CSS/styling libraries
- ✅ Charting libraries (for data viz)

---

### 🧮 utils → Pure Utilities

**Owns:**
- Mathematical operations (vectors, matrices, calculations)
- String manipulation and formatting
- Array and object operations
- Type guards and validation
- Constants and enums
- Common algorithms

**Exports:**
```typescript
export * from './math';           // Vector/matrix operations
export * from './string';         // String formatting
export * from './array';          // Array operations
export * from './constants';      // Shared constants
export type * from './types';
```

**Submodules:**
- `math/`: `vector3()`, `quaternion()`, `interpolate()`, etc.
- `string/`: `format()`, `parse()`, `humanize()`, etc.
- `array/`: `groupBy()`, `chunk()`, `deduplicate()`, etc.
- `constants/`: `GRID_SIZE`, `MAX_ZOOM`, etc.

**Example Usage:**
```typescript
import { vector3, interpolate } from '@/utils';

const p1 = vector3(0, 0, 0);
const p2 = vector3(10, 10, 10);
const mid = interpolate(p1, p2, 0.5);
```

**CONSTRAINTS:**
- ⚠️ **Pure functions**: No side effects
- ⚠️ **No state**: Can't access global state
- ⚠️ **Reusable**: Used by all modules
- ⚠️ **Well-tested**: Every function has tests

**DO NOT:**
- ❌ Import from feature modules
- ❌ Access global state
- ❌ Perform I/O
- ❌ Contain domain logic

**Dependencies:**
- ✅ `Three.js` (only for math exports)
- ✅ No other modules

---

## Cross-Module Dependencies Map

```
ui/               ← depends on → state/ + callback props
  ↓
state/            ← depends on → utils/
  ↓
interaction/      ← depends on → utils/ + dispatches to state/
data/             ← depends on → utils/
metrics/          ← depends on → utils/
core/renderer/    ← depends on → utils/
core/webxr/       ← depends on → utils/
```

**Golden Rule:**
- ✅ All modules can depend on `utils/`
- ✅ Feature modules can depend on `state/`
- ❌ `state/` cannot depend on feature modules (no circular deps)
- ❌ No cross-dependencies between feature modules

---

## Feature Development Checklist

When adding a new feature, ask:

1. **Where does it belong?**
   - 3D rendering? → `core/renderer/`
   - User input? → `interaction/`
   - State tracking? → `state/`
   - Data handling? → `data/`
   - UI display? → `ui/`
   - Shared utility? → `utils/`

2. **Does it have clear responsibilities?**
   - Can it be tested in isolation?
   - Does it depend on other modules?
   - Are the dependencies one-way?

3. **Is the API clear?**
   - What does it export?
   - What are the types?
   - Are there examples in the docstring?

4. **Does it avoid spaghetti?**
   - No circular dependencies?
   - No cross-imports between feature modules?
   - All config from environment/files?

---

## Example: Adding a Data Visualization Feature

```
Feature: "Show data points as 3D scatter plot"

1. Design state (state/)
   - Add to AppState: activeDataset, plotType
   - Add actions: selectDataset(), setPlotType()
   - Add selectors: getPlotData()

2. Load data (data/)
   - Create DataLoader for dataset files
   - Validate format in DataValidator
   - No hardcoded paths!

3. Create geometry (core/renderer/)
   - Implement SceneBuilder
   - Create point cloud mesh
   - Apply materials and colors

4. Build UI (ui/)
   - DatasetSelector component
   - PlotTypeToggle component
   - Connect to state/actions

5. Handle interaction (interaction/)
   - Implement RaycastManager
   - Enable point selection
   - Emit 'pointSelected' events

6. Track performance (metrics/)
   - Monitor point cloud render time
   - Track user interactions
```

---

## Module API Checklists

### Each module must have:
- ✅ `index.ts` with clear exports
- ✅ `types.ts` with TypeScript definitions
- ✅ Docstring explaining purpose
- ✅ List of DO NOT items
- ✅ Example usage
- ✅ Dependency declaration

### Each exported class/function must have:
- ✅ JSDoc comments
- ✅ Parameter types
- ✅ Return type
- ✅ Example usage
- ✅ Error conditions

---

## Debugging Module Violations

**Problem:** "I'm importing X from Y module"

**Diagnostic:**
1. Is it in the cross-dependency map?
2. Should this logic be in a different module?
3. Can this be extracted to `utils/`?

**Examples:**

❌ `ui/Component.tsx` imports from `interaction/`
→ Move gesture logic to `state/`, dispatch events from `interaction/`

❌ `renderer/` imports from `state/`
→ Pass state as parameters, don't access directly

❌ `data/` imports from `interaction/`
→ Separate data loading from input handling

---

## File Structure Template

Every module should follow this pattern:

```
src/module/
├── index.ts           # Public API exports
├── types.ts           # TypeScript definitions
├── constants.ts       # Module-specific constants
├── module-core.ts     # Main implementation
└── helpers.ts         # Internal helpers (not exported)
```

Example (`src/data/`):
```
src/data/
├── index.ts                  # Exports DataLoader, DataValidator
├── types.ts                  # DataConfig, LoadedData types
├── data-loader.ts            # DataLoader class
├── data-validator.ts         # DataValidator class
└── transform-pipelines.ts    # Transform functions
```

---

## Testing Module Boundaries

Run this command to check for import violations:

```bash
# Find all imports
grep -r "^import" src/ | \
  # Remove utils (allowed everywhere)
  grep -v "from '@/utils" | \
  # Group by source
  awk -F: '{print $1}' | sort | uniq -c
```

Each line should follow these rules:
- `ui/` can import: `state/`, `utils/`, React
- `state/` can import: `utils/`
- Other modules: only `utils/`

---

## Next Steps

1. **Implement modules** following the contracts defined here
2. **Write tests** for each module's public API
3. **Document examples** in module README files
4. **Review PRs** against this architecture
5. **Update this guide** when adding new patterns
