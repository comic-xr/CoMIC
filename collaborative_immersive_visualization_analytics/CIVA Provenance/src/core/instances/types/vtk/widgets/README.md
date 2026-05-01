# [Widget Name] Widget

Brief description of what this widget does (1-2 sentences).

## 📁 Location

```
src/core/instances/types/vtk/widgets/[widgetname]/
├── VTK[WidgetName]Widget.js  ← Widget implementation
└── README.md                  ← This file
```

## 🎯 Purpose

Detailed explanation of the widget's purpose, use cases, and when users would want to use it.

## 🏗️ Architecture Pattern

This widget demonstrates the **contributor pattern** for VTK widgets:

### ✅ What This Pattern Achieves

- **Per-Instance State**: Each instance gets its own widget (no global singletons)
- **Lifecycle Management**: Widget created/destroyed with instance
- **Clean Separation**: Widget logic is isolated from VTKInstanceHandler
- **Easy Configuration**: Settings passed at initialization
- **Type Safety**: Well-defined API with clear responsibilities

### 📋 File Structure

```
widgets/[widgetname]/
├── VTK[WidgetName]Widget.js  ← Core widget class
├── VTK[WidgetName]WidgetUI.js  ← UI controls (if complex)
├── VTK[WidgetName]WidgetSync.js ← Y.js sync (if collaborative)
└── README.md                  ← Documentation
```

**This widget needs:**

- ✅ VTK[WidgetName]Widget.js - Core implementation
- ❌ UI controls - [Reason why not needed / or include if needed]
- ❌ Collaboration sync - [Reason why not needed / or include if needed]

## 🔌 Usage in VTKInstanceHandler

```javascript
import { vtk[WidgetName]Widget } from './widgets/[widgetname]/VTK[WidgetName]Widget.js';

// In initialize()
vtk[WidgetName]Widget.initialize(instanceId, {
  widgetManager: tools.widgetManager,
  sceneObjects: tools.sceneObjects,
  // ... other config
});

// In cleanup()
vtk[WidgetName]Widget.cleanup(instanceId);

// In _createTools() - add toggle button
{
  id: "widget-[widgetname]",
  type: "button", // or "menu"
  icon: "[icon-name]",
  label: "[Widget Name]",
  description: "Brief description",
  active: vtk[WidgetName]Widget.isEnabled(instanceId),
  onClick: () => {
    instanceTools.toggle[WidgetName](instanceId);
    this._emitToolsUpdate(instanceId);
  },
}
```

## ⚙️ Configuration Options

```javascript
{
  // Document all configuration options here
  enabled: true,              // Widget starts enabled
  option1: 'value1',          // Description of option1
  option2: 123,               // Description of option2

  // Callbacks
  onEvent: (data) => {},      // Description of callback
}
```

## 📖 API Reference

### `initialize(instanceId, config)`

Creates widget for an instance.

**Parameters:**

- `instanceId` (string) - Unique instance identifier
- `config` (Object) - Configuration object
  - `widgetManager` (vtkWidgetManager) - Required
  - `sceneObjects` (Object) - Required VTK components
  - Other config options as documented above

**Returns:** `void`

**Example:**

```javascript
vtk[WidgetName]Widget.initialize('instance-123', {
  widgetManager: tools.widgetManager,
  sceneObjects: tools.sceneObjects,
  option1: 'custom-value',
});
```

### `isEnabled(instanceId)`

Check if widget is currently enabled for an instance.

**Parameters:**

- `instanceId` (string) - Instance to check

**Returns:** `boolean` - True if enabled

**Example:**

```javascript
const isActive = vtk[WidgetName]Widget.isEnabled('instance-123');
```

### `getConfig(instanceId)`

Get current configuration for an instance.

**Parameters:**

- `instanceId` (string) - Instance to query

**Returns:** `Object|null` - Configuration object or null if not found

### `updateConfig(instanceId, newConfig)` _(optional)_

Update widget settings at runtime.

**Parameters:**

- `instanceId` (string) - Instance to update
- `newConfig` (Object) - Configuration changes

**Returns:** `void`

### `cleanup(instanceId)`

Remove widget and free resources for an instance.

**Parameters:**

- `instanceId` (string) - Instance to clean up

**Returns:** `void`

### `destroy()`

Clean up all widgets (app shutdown).

**Returns:** `void`

## 🎨 Customization Examples

### Example 1: [Describe customization]

```javascript
vtk[WidgetName]Widget.initialize(instanceId, {
  // Custom configuration
});
```

### Example 2: [Describe another customization]

```javascript
vtk[WidgetName]Widget.updateConfig(instanceId, {
  // Runtime changes
});
```

## 🔄 Collaboration Support _(if applicable)_

**Does this widget need to sync across users?**

- ❌ **No** - Widget state is ephemeral / local only
- ✅ **Yes** - Widget state should sync

**If yes, sync implementation:**

```javascript
// In VTK[WidgetName]WidgetSync.js
export function syncWidgetState(instanceId, yMap) {
  const widgetState = vtk[WidgetName]Widget.getState(instanceId);
  yMap.set('widgetState', widgetState);
}
```

## 🧪 Testing the Widget

```javascript
// 1. Create instance
const instanceId = await instanceManager.createInstance(container);

// 2. Widget should be available
console.log("Enabled?", vtk[WidgetName]Widget.isEnabled(instanceId));

// 3. Initialize widget
vtk[WidgetName]Widget.initialize(instanceId, config);

// 4. Test functionality
// [Add specific test steps]

// 5. Clean up
vtk[WidgetName]Widget.cleanup(instanceId);
```

## 🐛 Troubleshooting

### Issue: Widget not appearing

**Cause:** [Describe common cause]

**Solution:** [Describe solution]

### Issue: Widget not responding to interaction

**Cause:** [Describe common cause]

**Solution:** [Describe solution]

## 🚀 Creating Similar Widgets

Use this widget as a template:

1. **Copy the structure**: Class with per-instance storage Map
2. **Implement lifecycle**: `initialize()`, `cleanup()`, `destroy()`
3. **Add API methods**: What operations does your widget need?
4. **Document config options**: What can users customize?
5. **Integrate with handler**: Import and call in initialize/cleanup
6. **Add toolbar button**: Create toggle in \_createTools()
7. **Write tests**: Verify lifecycle and functionality

## ❓ Common Questions

**Q: [Common question]**  
A: [Answer]

**Q: Why not use a global singleton like the old code?**  
A: Per-instance design means multiple viewports can have different configurations. It's also cleaner and prevents bugs from shared state.

**Q: Can I make the widget collaborative?**  
A: Yes! Add `getState()` / `setState()` methods and sync through Y.js. See VTK[WidgetName]WidgetSync.js for the pattern.

**Q: What if I need custom UI controls?**  
A: Create VTK[WidgetName]WidgetUI.js with React components. Import in InstanceViewport and pass instanceId as prop.

## 📝 Contributing

When modifying this widget:

1. Follow the established pattern
2. Update this README
3. Add tests for new functionality
4. Document breaking changes
5. Update integration examples

## 🔗 Related

- [VTKOrientationWidget](../orientation/README.md) - Reference implementation
- [VTKLineWidget](../line/README.md) - Measurement example
- [Plugin Architecture Guide](../../docs/PLUGIN_ARCHITECTURE.md)
- [Widget Integration Guide](../../docs/WIDGET_INTEGRATION.md)

## 📊 Metrics _(optional)_

- **Performance Impact**: [Low/Medium/High]
- **Memory Usage**: [Estimate per instance]
- **Render Overhead**: [None/Low/Medium/High]

## 🎓 Learning Resources

- [VTK.js Widgets Documentation](https://kitware.github.io/vtk-js/docs/concepts_widgets.html)
- [VTK.js Examples](https://kitware.github.io/vtk-js/examples/)
- [Widget Architecture Guide](../../docs/WIDGET_ARCHITECTURE.md)
