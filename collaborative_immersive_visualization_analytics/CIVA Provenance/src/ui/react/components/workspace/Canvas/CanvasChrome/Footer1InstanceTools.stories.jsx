// src/ui/react/components/workspace/Canvas/CanvasChrome/Footer1InstanceTools.stories.jsx
import React from 'react';
import { Footer1InstanceTools } from './Footer1InstanceTools';

const mockActiveView = { id: 'view-1', name: 'Axial Slice', type: 'vtk-slice' };
const mockOnCanvasViews = [
    mockActiveView,
    { id: 'view-2', name: 'Sagittal Slice', type: 'vtk-slice' },
    { id: 'view-3', name: '3D Volume', type: 'vtk-volume' },
];
const mockAvailableViews = [
    { id: 'view-4', name: 'Overlay', type: 'vtk-volume' },
    { id: 'view-5', name: 'Histogram', type: 'plotly-chart' },
];

const mockToolSections = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'camera', label: 'Camera' },
    { id: 'interaction', label: 'Interaction' },
];

const mockTools = [
    { id: 'zoomIn', icon: 'zoomIn', label: 'Zoom In', section: 'navigation', placement: 'notch' },
    { id: 'zoomOut', icon: 'zoomOut', label: 'Zoom Out', section: 'navigation', placement: 'notch' },
    { id: 'fit', icon: 'fitView', label: 'Fit', section: 'navigation', placement: 'notch' },
    { id: 'rotate', icon: 'rotate3d', label: 'Rotate', section: 'camera', placement: 'notch' },
    { id: 'reset', icon: 'refresh', label: 'Reset', section: 'camera', placement: 'notch' },
    { id: 'pan', icon: 'pan', label: 'Pan', section: 'interaction', placement: 'notch' },
    { id: 'select', icon: 'boxSelect', label: 'Select', section: 'interaction', placement: 'notch' },
];

export default {
    title: 'Canvas/Footer1InstanceTools',
    component: Footer1InstanceTools,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onUndo: { action: 'undo' },
        onRedo: { action: 'redo' },
        onSelectView: { action: 'select view' },
        onPlaceView: { action: 'place view' },
        onSelectTool: { action: 'select tool' },
        onOpenMoreTools: { action: 'more tools' },
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#0a0a0f', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        canUndo: true,
        canRedo: false,
        activeView: mockActiveView,
        onCanvasViews: mockOnCanvasViews,
        availableViews: mockAvailableViews,
        tools: mockTools,
        toolSections: mockToolSections,
    },
};

export const NoTools = {
    args: {
        canUndo: false,
        canRedo: false,
        activeView: mockActiveView,
        onCanvasViews: mockOnCanvasViews,
        availableViews: [],
        tools: [],
        toolSections: [],
    },
};
