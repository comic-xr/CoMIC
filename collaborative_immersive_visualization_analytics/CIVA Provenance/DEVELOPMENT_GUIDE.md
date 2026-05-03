# CIA Web - Complete Development Guide

**Last Updated**: February 10, 2026  
**Theme**: Light (clean, minimal, high contrast)  
**Architecture**: Module-based with Atomic Design

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Module Organization](#module-organization)
4. [Import Patterns](#import-patterns)
5. [Services Reference](#services-reference)
6. [Component Imports](#component-imports)
7. [Utilities Reference](#utilities-reference)
8. [Best Practices](#best-practices)
9. [Recent Changes](#recent-changes)
10. [Dependencies Flow](#dependencies-flow)

---

## Quick Start

### Clone & Setup
```bash
cd CIA_Web
cp .env.example .env
npm install
```

### Start Backend Services
```bash
./scripts/start.sh    # Starts Docker (PostgreSQL, MinIO, Redis, API, etc.)
```

### Start Frontend
```bash
npm start             # Webpack dev server on https://localhost:8081
```

### Accept SSL Warning
Browser will warn about self-signed certificate:
1. Click **Advanced**
2. Click **Proceed to localhost (unsafe)**

---

## Project Structure

```
src/
├── ui/                          # User Interface Layer
│   └── react/
│       ├── components/          # Atomic Design components
│       │   ├── atoms/          # 20+ base components
│       │   ├── molecules/      # 27+ composed components
│       │   ├── organisms/      # 4+ complex components
│       │   ├── layout/         # Layout containers
│       │   ├── panels/         # Panel components
│       │   ├── workspace/      # Workspace UI
│       │   ├── auth/           # Auth screens
│       │   └── index.js        # Unified barrel exports
│       ├── context/            # React Context providers
│       ├── hooks/              # Custom React hooks
│       └── styles/             # Design system
│           ├── tokens/         # Color, spacing, typography
│           ├── theme.scss      # Theme configuration
│           └── global.scss     # Global styles
│
├── core/                        # Core Business Logic
│   ├── instances/              # 3D/2D visualization handlers
│   │   └── types/vtk/         # VTK implementations
│   ├── managers/               # Data managers (singletons)
│   ├── events/                 # EventBus system
│   ├── session/                # User session state
│   ├── config/                 # App configuration
│   ├── collaboration/          # Real-time features
│   ├── rendering/              # Rendering pipeline
│   └── data/                   # Data models
│
├── services/                    # Application Services
│   ├── voice/                  # LiveKit integration
│   │   ├── voiceRoomService.js
│   │   ├── voiceCommandService.js
│   │   └── voiceFeedbackService.js
│   ├── storage/                # Persistence
│   │   ├── storageService.js
│   │   ├── dataCache.js
│   │   └── dataCleanup.js
│   ├── thumbnails/             # Image caching
│   ├── tensorflow/             # ML features
│   ├── authService.js          # Keycloak auth
│   ├── apiClient.js            # HTTP client
│   ├── syncService.js          # State sync
│   └── index.js                # Unified exports
│
├── utils/                       # Shared Utilities
│   ├── colorHelpers.js         # Color functions ⭐
│   ├── formatters.js           # Text formatting
│   ├── logger.js               # Logging
│   ├── idGenerator.js          # UUID generation
│   └── colorUtils.js           # Additional color utilities
│
├── algorithms/                  # Computation
│   └── dimensionality/         # t-SNE, UMAP, PCA
│
├── vr/                         # VR/WebXR features
│   └── vrModeManager.js
│
└── init/                       # Application boot
    └── appInitializer.js       # Initialization sequence
```

---

## Module Organization

### 1. **UI Module** (`src/ui/`)
Handles all user-facing components and styling.

- **Components**: Atomic design system (atoms → molecules → organisms)
- **Styles**: Design tokens, SCSS mixins, light theme
- **Light Theme**: Clean, minimal color palette for readability
- **Hooks**: Reusable React logic (useAdaptive, useVTKScene, etc.)
- **Context**: Global state providers

**Color Palette:**
- **Backgrounds**: White (#ffffff) to light gray (#f8f9fa)
- **Text**: Dark gray (#1e293b) for high contrast
- **Canvas**: Off-white (#fcfcfd) for visualization
- **Accents**: Vibrant primary colors (blue #2563eb, green #16a34a, etc.)
- **Status**: Green (success), Amber (warning), Red (error), Blue (info)

### 2. **Core Module** (`src/core/`)
Business logic and data management.

- **Instances**: 3D/2D visualization handlers by type
- **Managers**: Centralized data managers (singletons)
- **Events**: EventBus for pub/sub communication
- **Session**: User session and authentication state
- **Collaboration**: Presence, cursors, shared editing
- **Rendering**: VTK pipeline and scene management

### 3. **Services Module** (`src/services/`)
High-level operations coordinating between managers.

#### **Voice Services** (`voice/`)
- `voiceRoomService` - Room management with LiveKit
- `voiceCommandService` - Voice command recognition
- `voiceFeedbackService` - Audio feedback

#### **Storage Services** (`storage/`)
- `storageService` - IndexedDB operations
- `dataCache` - Query result caching
- `dataCleanup` - Garbage collection

#### **Thumbnail Services** (`thumbnails/`)
- `ThumbnailCacheService` - In-memory cache
- `ThumbnailCaptureService` - Snapshot generation

#### **Core Services**
- `authService` - Keycloak authentication
- `apiClient` - HTTP requests
- `syncService` - State synchronization
- `serverSync` - Server state reconciliation

### 4. **Utils Module** (`src/utils/`)
Shared utility functions.

- `colorHelpers.js` ⭐ - **NEW**: Centralized color utility
  - `hexToRgb()` - Hex to RGB conversion
  - `rgbToHex()` - RGB to hex conversion
  - `clamp()` - Clamp value in range
  - `lerpColor()` - Linear color interpolation

- `formatters.js` - Date, number, text formatting
- `logger.js` - Logging with categories
- `idGenerator.js` - UUID generation
- `colorUtils.js` - Legacy color functions

---

## Import Patterns

### ✅ Correct Imports

#### Components
```javascript
// Atoms, Molecules, Organisms
import { Button, Icon, Badge } from '@UI/react/components';
import { SearchInput, ToggleGroup } from '@UI/react/components';
import { FloatingPanel } from '@UI/react/components/layout';
import { Bootstrap } from '@UI/react/components';
```

#### Services
```javascript
// Core services
import { 
  viewLifecycleService, 
  viewLinkingService,
  authService,
  apiClient,
  syncService 
} from '@Services';

// Voice services
import { voiceRoomService, voiceCommandService } from '@Services/voice';
import { voiceRoomService } from '@Services/voice/voiceRoomService.js';

// Data & storage
import { storageService, dataCache } from '@Services';
import { ThumbnailCacheService } from '@Services/thumbnails';
```

#### Utilities
```javascript
// Color utilities (RECOMMENDED - use this!)
import { hexToRgb, rgbToHex, clamp, lerpColor } from '@Utils/colorHelpers.js';

// Other utilities
import { formatDateShort, formatNumber } from '@Utils/formatters.js';
import { logger, log } from '@Utils/logger.js';
import { generateId } from '@Utils/idGenerator.js';

// Legacy (still available)
import { darkenColor, lightenColor } from '@Utils/colorUtils.js';
```

#### Core & Events
```javascript
// Managers (use services instead when possible)
import { viewConfigurationManager, datasetManager } from '@Core/managers';

// Events (use services, but available if needed)
import { eventBus, BUS_EVENTS } from '@Services';

// Session
import { sessionManager } from '@Core/session/sessionManager.js';

// Configuration
import { config } from '@Core/config/clientConfig.js';
```

#### Hooks
```javascript
// Adaptive layout
import { useAdaptive } from '@UI/react/context/AdaptiveContext.jsx';

// VTK
import { useVTKScene } from '@VTK/hooks/useVTKScene.js';

// Component utilities
import { useDropdown } from '@UI/react/components/atoms/Dropdown/useDropdown.js';
```

### ❌ Avoid These
```javascript
// Don't use full paths for components
import Button from '@UI/react/components/atoms/Button/Button.jsx';  // ❌

// Don't duplicate utility functions
function hexToRgb(hex) { /* ... */ }  // ❌ Use colorHelpers instead

// Don't import managers directly for UI operations
import { viewConfigurationManager } from '@Core/managers';  // ❌ Use services

// Don't create internal circular dependencies
// (services shouldn't call each other horizontally)
```

---

## Services Reference

### View Lifecycle Service
```javascript
import { viewLifecycleService } from '@Services';

// Create and place a new view
const view = await viewLifecycleService.createAndPlaceView({
  datasetId: 'dataset-123',
  owner: userId,
});

// Get all views
const allViews = await viewLifecycleService.getAllViews();
```

### View Linking Service
```javascript
import { viewLinkingService } from '@Services';

// Link two views
await viewLinkingService.linkViews(viewId1, viewId2, {
  mode: 'follow',
  properties: ['camera', 'filters']
});
```

### Auth Service
```javascript
import { authService } from '@Services';

// Login
await authService.login();

// Get current user
const user = await authService.getUser();

// Get access token
const token = await authService.getAccessToken();

// Logout
await authService.logout();
```

### API Client
```javascript
import { apiClient } from '@Services';

// GET request
const data = await apiClient.get('/api/datasets');

// POST request
await apiClient.post('/api/views', { name: 'New View' });

// PUT request
await apiClient.put(`/api/views/${id}`, updates);

// DELETE request
await apiClient.delete(`/api/views/${id}`);
```

### Voice Room Service
```javascript
import { voiceRoomService } from '@Services/voice';

// Initialize
await voiceRoomService.initialize();

// Join room
await voiceRoomService.joinRoom('main-room');

// Listen for participant updates
voiceRoomService.onParticipantUpdate((participants) => {
  console.log('Participants:', participants);
});

// Mute/unmute
await voiceRoomService.setMuted(true);

// Leave room
await voiceRoomService.leaveRoom();
```

---

## Component Imports

### Quick Reference
```javascript
// Buttons & Inputs
import { Button, IconButton, Input, Select, Checkbox, Radio } from '@UI/react/components';

// Display
import { Badge, StatusDot, Chip, Tag, Text, Divider, Spinner } from '@UI/react/components';

// Toggles & Controls
import { Toggle, Slider, Tooltip, Icon, Dropdown } from '@UI/react/components';

// Molecules
import { SearchInput, ToggleGroup, TabButton, PanelHeader } from '@UI/react/components';

// Organisms
import { FilterBar, PropertyPanel, ToolPanel, ResizableSections } from '@UI/react/components';

// Layout
import { FloatingPanel } from '@UI/react/components/layout';
```

### Usage Examples
```javascript
import React from 'react';
import { Button, Icon, Badge, useAdaptive } from '@UI/react/components';

export function MyComponent() {
  const { colors } = useAdaptive();
  
  return (
    <Button 
      variant="primary" 
      onClick={handleClick}
      style={{ background: colors.accentPrimary }}
    >
      <Icon name="save" />
      Save Changes
      <Badge>New</Badge>
    </Button>
  );
}
```

---

## Utilities Reference

### Color Helpers ⭐
```javascript
import { hexToRgb, rgbToHex, clamp, lerpColor } from '@Utils/colorHelpers.js';

// Hex to RGB (returns [0-1] array)
const rgb = hexToRgb('#2563eb');  // [0.145, 0.388, 0.933]

// RGB to hex
const hex = rgbToHex([0.145, 0.388, 0.933]);  // '#2563eb'

// Clamp value
const clamped = clamp(150, 0, 100);  // 100

// Linear interpolation between colors
const interpolated = lerpColor(
  [0.145, 0.388, 0.933],  // blue
  [0.22, 0.876, 0.459],   // green
  0.5  // 50% between them
);
```

### Formatters
```javascript
import { formatDateShort, formatNumber } from '@Utils/formatters.js';

// Date formatting
const date = formatDateShort(new Date());  // "Feb 10"

// Number formatting
const num = formatNumber(1234567);  // "1.2M"
```

### Logger
```javascript
import { logger } from '@Utils/logger.js';

logger.info('User logged in');
logger.warn('Slow operation detected');
logger.error('Failed to save', error);
```

### ID Generator
```javascript
import { generateId } from '@Utils/idGenerator.js';

const uuid = generateId();  // "550e8400-e29b-41d4-a716-446655440000"
```

---

## Best Practices

### 1. Use Services for Operations
```javascript
// ❌ DON'T: Use managers directly
viewConfigurationManager.getViews();

// ✅ DO: Use services
const views = await viewLifecycleService.getAllViews();
```

### 2. Consolidate Utilities
```javascript
// ❌ DON'T: Duplicate functions
function myHexToRgb(hex) { /* ... */ }

// ✅ DO: Use shared utilities
import { hexToRgb } from '@Utils/colorHelpers.js';
```

### 3. Use Unified Component Exports
```javascript
// ❌ DON'T: Long import paths
import Button from '@UI/react/components/atoms/Button/Button.jsx';

// ✅ DO: Use barrel exports
import { Button } from '@UI/react/components';
```

### 4. Theme Tokens Instead of Hardcoded Colors
```javascript
// ❌ DON'T: Hardcode colors
background: '#2563eb';

// ✅ DO: Use theme
import { useAdaptive } from '@UI/react/context';
const { colors } = useAdaptive();
background: colors.accentPrimary;
```

### 5. Event-Driven Communication
```javascript
// ❌ DON'T: Direct service calls
viewLifecycleService.createView();
someOtherService.processView();

// ✅ DO: Use EventBus
import { eventBus } from '@Services';

eventBus.on('view:created', (view) => {
  // React to view creation
});
```

### 6. Proper Dependency Direction
```
UI Components
    ↓
Services (high-level operations)
    ↓
Managers (data management)
    ↓
Core (EventBus, models, infrastructure)
    ↓
Utils (pure functions, no dependencies)
```

---

## Path Aliases

All these paths are configured in `webpack.config.js`:

| Alias | Points To |
|-------|-----------|
| `@UI` | `src/ui/react/` |
| `@Services` | `src/services/` |
| `@Utils` | `src/utils/` |
| `@Core` | `src/core/` |
| `@VTK` | `src/core/instances/types/vtk/` |
| `@Init` | `src/init/` |
| `@Collab` | `src/core/collaboration/` |
| `@Algorithms` | `src/algorithms/` |
| `@VR` | `src/vr/` |

---

## Recent Changes (Feb 10, 2026)

### Theme Migration: Dark → Light ✅
- **Before**: Dark theme with blue-tinted UI chrome (#020406)
- **After**: Clean light theme (#ffffff backgrounds, #1e293b text)
- **Files Changed**: 7
- **Breaking Changes**: None

### Color Utilities Consolidated ✅
- **New**: `src/utils/colorHelpers.js`
- **Functions**: `hexToRgb()`, `rgbToHex()`, `clamp()`, `lerpColor()`
- **Removed Duplication**: Eliminated duplicate functions from VTKInstanceCursors.js
- **Code Saved**: ~60 lines

### Services Reorganized ✅
- **New Structure**: Grouped by feature area
- **Updated**: `src/services/index.js`
- **Better Organization**: Voice, Storage, Thumbnails, Auth categories

### Component Exports Unified ✅
- **New**: `src/ui/react/components/index.js`
- **Benefit**: Cleaner imports across the app
- **Example**: Before long path → After: `import { Button } from '@UI/react/components'`

---

## Running & Testing

### Start Development Server
```bash
npm start
# Opens https://localhost:8081
```

### Run Tests
```bash
npm test              # Run all tests
npm run test:run      # Run once (no watch)
npm run test:coverage # With coverage report
```

### Build for Production
```bash
npm run build         # Create optimized bundle
```

### Type Checking
```bash
npm run typecheck     # TypeScript/JSDoc validation
```

### Storybook
```bash
npm run storybook     # Component development environment
```

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | https://localhost:8081 | N/A |
| **API** | http://localhost:3001 | N/A |
| **MinIO Console** | http://localhost:9002 | minioadmin / minioadmin |
| **PostgreSQL** | localhost:5432 | ciauser / ciadevpassword |
| **Redis** | localhost:6379 | N/A |
| **Keycloak** | http://localhost:8080 | admin / admin123 |
| **Y.js WebSocket** | ws://localhost:9001 | N/A |

---

## Common Tasks

### Add a New Component
1. Create component in `src/ui/react/components/atoms/` (or molecules/organisms)
2. Follow Atomic Design structure
3. Export from `src/ui/react/components/index.js`
4. Use across app: `import { MyComponent } from '@UI/react/components'`

### Create a New Service
1. Create file in `src/services/`
2. Implement singleton pattern
3. Export from `src/services/index.js`
4. Use: `import { myService } from '@Services'`

### Add Utility Function
1. If color-related: Add to `src/utils/colorHelpers.js`
2. Otherwise: Create appropriate utility file
3. Export from appropriate barrel export
4. Use: `import { myFunction } from '@Utils/my-utility.js'`

### Listen to Events
```javascript
import { eventBus, BUS_EVENTS } from '@Services';
import { useEffect } from 'react';

export function MyComponent() {
  useEffect(() => {
    const unsubscribe = eventBus.on(
      BUS_EVENTS.VIEW_CREATED,
      (view) => console.log('View created:', view)
    );
    
    return unsubscribe;  // Cleanup
  }, []);
  
  return <div>...</div>;
}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill all processes on ports 8080, 3000, 3001, 8000
npm run stop

# Or manually
lsof -i :8081 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Docker Services Not Starting
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### Build Errors
```bash
# Clear cache
npm run clean:cache

# Reinstall dependencies
rm node_modules package-lock.json
npm install

# Rebuild
npm run build:check
```

### Module Not Found
- Check path aliases in webpack.config.js
- Verify file exists at expected location
- Check barrel export from index.js files
- Clear node_modules cache

---

## Key Principles

1. **Module-Based**: Organized by feature, not layer
2. **Unidirectional**: Dependencies flow down the stack
3. **No Circular**: Never import up the dependency chain
4. **Service Layer**: UI calls services, not managers
5. **Consolidated**: Single source of truth for utilities
6. **Event-Driven**: Use EventBus for async communication
7. **Light Theme**: Clean, minimal design for readability
8. **Atomic Design**: Components from atoms up to organisms

---

## For More Information

- **Architecture Details**: See code comments in `src/core/managers/`
- **Component Library**: Run `npm run storybook`
- **API Documentation**: See `server/API-DOCUMENTATION.md`
- **Database Schema**: See `server/database/init.sql`

---

**Last Updated**: February 10, 2026  
**Theme**: Light (clean, high contrast)  
**Architecture**: Module-based with Atomic Design  
**Status**: Production Ready ✅
