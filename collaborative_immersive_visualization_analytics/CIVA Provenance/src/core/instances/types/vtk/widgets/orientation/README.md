# Orientation Widget

A 3D orientation marker for VTK instances showing XYZ axes as a labeled cube.

## 📁 Location

```
src/core/instances/types/vtk/widgets/orientation/
├── VTKOrientationWidget.js  ← Widget implementation
└── README.md                 ← This file
```

## 🎯 Purpose

The orientation widget provides visual feedback about the current 3D camera orientation by displaying a small rotating cube in the corner of the viewport. Each face is labeled (+X, -X, +Y, -Y, +Z, -Z) and color-coded, making it easy for users to understand their viewpoint.

## 🏗️ Architecture Pattern

This widget demonstrates the **contributor pattern** for VTK widgets:

### ✅ What This Pattern Achieves

- **Per-Instance State**: Each instance gets its own widget (no global singletons)
- **Lifecycle Management**: Widget created/destroyed with instance
- **Clean Separation**: Widget logic is isolated from VTKInstanceHandler
- **Easy Configuration**: Settings passed at initialization
- **Type Safety**: Well-defined API with clear responsibilities

### 📋 File Structure

For a widget named `MyWidget`, create:

```
widgets/mywidget/
├── VTKMyWidget.js        ← Core widget class
├── VTKMyWidgetUI.js      ← UI controls (if complex)
├── VTKMyWidgetSync.js    ← Y.js sync (if collaborative)
└── README.md             ← Documentation
```

**Orientation widget only needs `VTKOrientationWidget.js`** because:

- No custom UI controls needed (just toggle on/off)
- No collaboration needed (camera orientation is already synced)

## 🔌 Usage in VTKInstanceHandler

```javascript
import { vtkOrientationWidget } from './widgets/orientation/VTKOrientationWidget.js';

// In initialize()
vtkOrientationWidget.initialize(instanceId, sceneObjects, {
  corner: 'BOTTOM_RIGHT',
  viewportSize: 0.12,
  minPixelSize: 80,
  maxPixelSize: 280,
});

// In cleanup()
vtkOrientationWidget.cleanup(instanceId);

// In _createTools() - add toggle button
{
  id: "toggle-orientation",
  type: "toggle",
  icon: "compass",
  label: "Orientation Cube",
  isActive: (instanceData) => {
    return vtkOrientationWidget.isEnabled(instanceData.instanceId);
  },
  onClick: (instanceData) => {
    const enabled = vtkOrientationWidget.isEnabled(instanceData.instanceId);
    vtkOrientationWidget.setVisible(instanceData.instanceId, !enabled);
    return !enabled;
  },
}
```

## ⚙️ Configuration Options

```javascript
{
  enabled: true,              // Widget starts enabled
  corner: 'BOTTOM_RIGHT',     // Position: TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT
  viewportSize: 0.1,          // Size relative to viewport (0.1 = 10%)
  minPixelSize: 100,          // Minimum size in pixels
  maxPixelSize: 300,          // Maximum size in pixels

  // Custom face colors (optional)
  xPlusColor: '#0096FF',
  xMinusColor: '#FFD700',
  yPlusColor: '#00FF00',
  yMinusColor: '#00FFFF',
  zPlusColor: '#FF0000',
  zMinusColor: '#FF00FF',
}
```

## 📖 API Reference

### `initialize(instanceId, sceneObjects, config)`

Creates widget for an instance.

- **instanceId**: Unique instance identifier
- **sceneObjects**: VTK components `{ interactor, renderer, ... }`
- **config**: Configuration options (see above)

### `setVisible(instanceId, visible)`

Show or hide the widget.

- **visible**: `true` to show, `false` to hide

### `updateConfig(instanceId, newConfig)`

Update widget settings at runtime.

### `getConfig(instanceId)`

Get current configuration for an instance.

- **Returns**: Configuration object or `null`

### `isEnabled(instanceId)`

Check if widget is currently enabled.

- **Returns**: `boolean`

### `cleanup(instanceId)`

Remove widget and free resources for an instance.

### `destroy()`

Clean up all widgets (app shutdown).

## 🎨 Customization Examples

### Change Corner Position

```javascript
vtkOrientationWidget.updateConfig(instanceId, {
  corner: "TOP_LEFT",
});
```

### Make Widget Larger

```javascript
vtkOrientationWidget.updateConfig(instanceId, {
  viewportSize: 0.15,
  maxPixelSize: 400,
});
```

### Custom Color Scheme

```javascript
vtkOrientationWidget.initialize(instanceId, sceneObjects, {
  xPlusColor: "#FF0000", // Red
  xMinusColor: "#00FF00", // Green
  yPlusColor: "#0000FF", // Blue
  // ... etc
});
```

## 🧪 Testing the Widget

```javascript
// Create instance
const instanceId = await instanceManager.createInstance(container);

// Widget should be initialized automatically
console.log("Enabled?", vtkOrientationWidget.isEnabled(instanceId));

// Toggle visibility
vtkOrientationWidget.setVisible(instanceId, false);
vtkOrientationWidget.setVisible(instanceId, true);

// Change position
vtkOrientationWidget.updateConfig(instanceId, { corner: "TOP_LEFT" });

// Clean up
vtkOrientationWidget.cleanup(instanceId);
```

## 🚀 Creating Similar Widgets

Use this widget as a template:

1. **Copy the structure**: Class with per-instance storage Map
2. **Implement lifecycle**: `initialize()`, `cleanup()`, `destroy()`
3. **Add API methods**: What operations does your widget need?
4. **Document config options**: What can users customize?
5. **Integrate with handler**: Import and call in initialize/cleanup
6. **Add toolbar button**: Create toggle in \_createTools()

## ❓ Common Questions

**Q: Why not use a global singleton like the old code?**
A: Per-instance design means multiple viewports can have different configurations. It's also cleaner and prevents bugs from shared state.

**Q: Does the widget sync across users?**
A: No - the camera already syncs, so the orientation cube automatically stays in sync because it tracks the camera. No additional sync needed!

**Q: Can I make the cube interactive (click faces to rotate)?**
A: Yes! Add click handlers in `_createCubeActor()` and implement rotation logic. Consider adding this as a config option.

**Q: What if I want multiple orientation styles?**
A: Extract `_createCubeActor()` into a factory, then pass different factories via config. Example: cube vs. axes vs. compass rose.

## 📝 Contributing

When adding new widgets:

1. Follow this pattern exactly
2. Create in `widgets/yourwidget/`
3. Add comprehensive README
4. Include usage examples
5. Test with multiple instances
6. Document all config options
