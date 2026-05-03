// src/core/instances/types/vtk/features/index.js

/**
 * VTK Feature Exports
 *
 * Features are optional functionality modules that can be added to VTK instances.
 * Each feature manages its own state and provides toolbar tools.
 *
 * Features follow the FeatureInterface pattern:
 * - initialize(instanceId, instanceData) - Set up per-instance state
 * - cleanup(instanceId) - Clean up resources
 * - getState(instanceId) - Get current state
 * - getTools(instanceId) - Get toolbar tool definitions
 */

// Core features
export { VTKReductionFeature } from './VTKReductionFeature.js';

// Scene features
export { VTKSceneFeature, vtkSceneFeature } from './VTKSceneFeature.js';

// Volume and slice features
export { VTKVolumeFeature, vtkVolumeFeature } from './VTKVolumeFeature.js';
export { VTKSliceFeature, vtkSliceFeature } from './VTKSliceFeature.js';

// Data visualization features
export { VTKScalarColoringFeature, vtkScalarColoringFeature } from './VTKScalarColoringFeature.js';
export { VTKIsosurfaceFeature, vtkIsosurfaceFeature } from './VTKIsosurfaceFeature.js';
export { VTKGlyphFeature, vtkGlyphFeature } from './VTKGlyphFeature.js';

// Interaction features
export { VTKClippingFeature, vtkClippingFeature } from './VTKClippingFeature.js';
export { VTKThresholdFeature, vtkThresholdFeature } from './VTKThresholdFeature.js';

// Animation features
export { VTKTimeSeriesFeature, vtkTimeSeriesFeature } from './VTKTimeSeriesFeature.js';

// Material features
export { VTKPBRFeature, vtkPBRFeature } from './VTKPBRFeature.js';

// Transfer function and scalar bar
export { VTKTransferFunctionFeature, vtkTransferFunctionFeature } from './VTKTransferFunctionFeature.js';
export { VTKScalarBarFeature, vtkScalarBarFeature } from './VTKScalarBarFeature.js';

// Mesh processing features
export { VTKNormalsFeature, vtkNormalsFeature } from './VTKNormalsFeature.js';
export { VTKCleanPolyDataFeature, vtkCleanPolyDataFeature } from './VTKCleanPolyDataFeature.js';

// Cutting and filtering features
export { VTKCutterFeature, vtkCutterFeature } from './VTKCutterFeature.js';
export { VTKThresholdPointsFeature, vtkThresholdPointsFeature } from './VTKThresholdPointsFeature.js';

// Widget features
export { VTKAnnotationWidgetsFeature, vtkAnnotationWidgetsFeature } from './VTKAnnotationWidgetsFeature.js';
export { VTKResliceCursorFeature, vtkResliceCursorFeature } from './VTKResliceCursorFeature.js';
export { VTKMeasurementWidgetsFeature, vtkMeasurementWidgetsFeature } from './VTKMeasurementWidgetsFeature.js';
export { VTKImplicitPlaneFeature, vtkImplicitPlaneFeature } from './VTKImplicitPlaneFeature.js';

// Volume-specific widget features
export { VTKImageCroppingFeature, vtkImageCroppingFeature } from './VTKImageCroppingFeature.js';
