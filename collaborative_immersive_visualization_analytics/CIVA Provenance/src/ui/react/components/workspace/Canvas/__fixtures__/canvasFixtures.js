// src/ui/react/components/workspace/Canvas/__fixtures__/canvasFixtures.js
// Shared mock data for Canvas-related Storybook stories.

export const mockWorkspace = {
    id: 'ws-1',
    name: 'MRI Analysis',
    type: 'project',
    tags: ['clinical', 'priority'],
    updatedAt: Date.now(),
};
export const mockWorkspaces = [
    mockWorkspace,
    { id: 'ws-2', name: 'Tumor Review', type: 'project', tags: ['review'], updatedAt: Date.now() - 3600_000 },
    { id: 'ws-3', name: 'Remote Session', type: 'breakout', tags: ['collab'], updatedAt: Date.now() - 7200_000 },
];

export const mockViewGroup = {
    id: 'vg-1',
    name: 'Axial Slices',
    color: '#c084fc',
    linkedTo: 'vg-2',
    views: ['view-1', 'view-2'],
    tags: ['clinical', 'primary'],
};
export const mockViewGroups = [
    mockViewGroup,
    { id: 'vg-2', name: 'Coronal Stack', color: '#34d399', views: ['view-3'], tags: ['review'] },
    { id: 'vg-3', name: '3D Volume', color: '#fbbf24', views: ['view-4', 'view-5', 'view-6'] },
];

export const mockViewGroupsWithPositions = [
    { id: 'vg-1', name: 'Axial', color: 'var(--color-accent-purple)', canvasPosition: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
    { id: 'vg-2', name: 'Coronal', color: 'var(--color-accent-teal)', canvasPosition: { row: 0, col: 2, rowSpan: 2, colSpan: 3 } },
    { id: 'vg-3', name: '3D', color: 'var(--color-accent-amber)', canvasPosition: { row: 2, col: 1, rowSpan: 2, colSpan: 3 } },
];

export const mockActiveView = { id: 'view-1', name: 'Axial Slice', type: 'vtk-slice' };

export const mockToolSections = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'interaction', label: 'Interaction' },
];

export const mockTools = [
    { id: 'zoomIn', icon: 'zoomIn', label: 'Zoom In', section: 'navigation', placement: 'notch' },
    { id: 'zoomOut', icon: 'zoomOut', label: 'Zoom Out', section: 'navigation', placement: 'notch' },
    { id: 'fit', icon: 'fitView', label: 'Fit', section: 'navigation', placement: 'notch' },
    { id: 'pan', icon: 'pan', label: 'Pan', section: 'interaction', placement: 'notch' },
    { id: 'select', icon: 'boxSelect', label: 'Select', section: 'interaction', placement: 'notch' },
];

export const mockLinks = {
    camera: { targetId: 'view-2' },
    cursors: { targetId: 'view-3' },
    annotationDisplay: { targetId: 'view-4' },
};
