/**
 * @file UnifiedCompanionPanel.stories.jsx
 * @description Storybook stories for UnifiedCompanionPanel component
 */

import React, { useState, useEffect } from 'react';
import { UnifiedCompanionPanel } from './UnifiedCompanionPanel';
import { VGEditorProvider, useVGEditor } from '@UI/react/context/VGEditorContext';
import { CanvasMapProvider, useCanvasMap } from '@UI/react/context/CanvasMapContext';

// Mock data
const MOCK_VIEWS = [
  { id: 'v1', name: 'Brain MRI Volume', type: 'volume', datasetName: 'Patient_001', datasetId: 'd1', useCount: 1 },
  { id: 'v2', name: 'Axial Slice', type: 'slice', datasetName: 'Patient_001', datasetId: 'd1', useCount: 0 },
  { id: 'v3', name: 'Tumor Metrics', type: 'chart', datasetName: 'Patient_001', datasetId: 'd1', useCount: 2 },
  { id: 'v4', name: 'Segmentation Mesh', type: 'data', datasetName: 'Patient_002', datasetId: 'd2', useCount: 0 },
  { id: 'v5', name: 'Treatment Notes', type: 'notes', datasetName: 'Patient_002', datasetId: 'd2', useCount: 1 },
];

const MOCK_DATASETS = [
  {
    id: 'd1',
    name: 'Patient_001_MRI',
    type: 'dicom',
    viewCount: 3,
    views: [
      { id: 'v1', name: 'Brain Volume', type: 'volume' },
      { id: 'v2', name: 'Axial Slice', type: 'slice' },
      { id: 'v3', name: 'Metrics Chart', type: 'chart' },
    ],
  },
  {
    id: 'd2',
    name: 'Patient_002_CT',
    type: 'dicom',
    viewCount: 2,
    views: [
      { id: 'v4', name: 'CT Volume', type: 'volume' },
      { id: 'v5', name: 'Notes', type: 'notes' },
    ],
  },
];

const MOCK_VIEW_GROUPS = [
  {
    id: 'vg1',
    name: 'Comparison Layout',
    layoutId: 'side-by-side',
    rows: 1,
    cols: 2,
    color: '#3b82f6',
    viewCount: 2,
    scope: 'personal',
    createdBy: 'me',
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    datasets: ['Patient_001'],
    views: MOCK_VIEWS.slice(0, 2),
  },
  {
    id: 'vg2',
    name: 'Full Analysis',
    layoutId: '2x2',
    rows: 2,
    cols: 2,
    color: '#8b5cf6',
    viewCount: 4,
    scope: 'personal',
    createdBy: 'me',
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    datasets: ['Patient_001', 'Patient_002'],
    views: MOCK_VIEWS.slice(0, 4),
  },
  {
    id: 'vg3',
    name: 'Team Dashboard',
    layoutId: '1+2',
    rows: 2,
    cols: 2,
    color: '#14b8a6',
    viewCount: 3,
    scope: 'team',
    createdBy: 'Alice',
    lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    datasets: ['Shared_Dataset'],
    views: MOCK_VIEWS.slice(0, 3),
  },
];

const MOCK_TEMPLATES = [
  { id: 't1', name: 'Single View', layoutId: 'single', color: '#3b82f6', viewSlots: 1 },
  { id: 't2', name: 'Comparison', layoutId: 'side-by-side', color: '#22c55e', viewSlots: 2 },
  { id: 't3', name: 'Quad View', layoutId: '2x2', color: '#a855f7', viewSlots: 4 },
];

// Helper component to simulate VG Editor mode
function VGEditorModeSimulator({ children }) {
  const editorContext = useVGEditor();

  useEffect(() => {
    // Register a fake editor on mount
    editorContext?.registerEditor('story-editor', {
      id: 'vg1',
      name: 'Comparison Layout',
      color: '#a855f7',
      isNew: false,
    });
    return () => {
      editorContext?.unregisterEditor('story-editor');
    };
  }, []);

  return children;
}

// Helper component to simulate Canvas Map mode
function CanvasMapModeSimulator({ children }) {
  const canvasMapContext = useCanvasMap();

  useEffect(() => {
    canvasMapContext?.activateCanvasMap();
    canvasMapContext?.setPlacedVGs(['vg1']);
    return () => {
      canvasMapContext?.deactivateCanvasMap();
    };
  }, []);

  return children;
}

export default {
  title: 'Panels/CompanionPanel/UnifiedCompanionPanel',
  component: UnifiedCompanionPanel,
  decorators: [
    (Story) => (
      <VGEditorProvider>
        <CanvasMapProvider>
          <div style={{
            width: '100vw',
            height: '100vh',
            background: '#020406',
            padding: 24,
            boxSizing: 'border-box',
            display: 'flex',
            gap: 24,
          }}>
            <Story />
          </div>
        </CanvasMapProvider>
      </VGEditorProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Idle mode - no editors or canvas map active
 * Shows: Datasets, Views tabs
 */
export const IdleMode = {
  render: () => (
    <div style={{ height: 600, display: 'flex' }}>
      <UnifiedCompanionPanel
        isOpen
        views={MOCK_VIEWS}
        datasets={MOCK_DATASETS}
        viewGroups={MOCK_VIEW_GROUPS}
        onViewClick={(v) => console.log('View clicked:', v)}
        onDatasetClick={(d) => console.log('Dataset clicked:', d)}
        onViewDragStart={(e, v) => console.log('View drag:', v)}
      />
    </div>
  ),
};

/**
 * VG Editor mode - when a VG editor panel is open
 * Shows: Datasets, Views, VGs tabs (with expand/collapse for importing)
 */
export const VGEditorMode = {
  render: () => (
    <VGEditorModeSimulator>
      <div style={{ height: 600, display: 'flex' }}>
        <UnifiedCompanionPanel
          isOpen
          views={MOCK_VIEWS}
          datasets={MOCK_DATASETS}
          viewGroups={MOCK_VIEW_GROUPS}
          onViewClick={(v) => console.log('View clicked:', v)}
          onDatasetClick={(d) => console.log('Dataset clicked:', d)}
          onViewGroupClick={(vg) => console.log('VG clicked:', vg)}
          onViewDragStart={(e, v) => console.log('View drag:', v)}
          onVGDragStart={(e, vg) => console.log('VG import drag:', vg)}
        />
      </div>
    </VGEditorModeSimulator>
  ),
};

/**
 * Canvas Map mode - when the canvas map panel is active
 * Shows: VGs, Templates tabs (flat list with placement badges)
 */
export const CanvasMapMode = {
  render: () => (
    <CanvasMapModeSimulator>
      <div style={{ height: 600, display: 'flex' }}>
        <UnifiedCompanionPanel
          isOpen
          views={MOCK_VIEWS}
          datasets={MOCK_DATASETS}
          viewGroups={MOCK_VIEW_GROUPS}
          templates={MOCK_TEMPLATES}
          onViewClick={(v) => console.log('View clicked:', v)}
          onViewGroupClick={(vg) => console.log('VG clicked:', vg)}
          onVGDragStart={(e, vg) => console.log('VG place drag:', vg)}
          onTemplateDragStart={(e, t) => console.log('Template drag:', t)}
        />
      </div>
    </CanvasMapModeSimulator>
  ),
};

/**
 * Mode switching demonstration
 */
export const ModeSwitching = {
  render: () => {
    const [mode, setMode] = useState('idle');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMode('idle')}
            style={{
              padding: '8px 16px',
              background: mode === 'idle' ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Idle Mode
          </button>
          <button
            onClick={() => setMode('vg-editor')}
            style={{
              padding: '8px 16px',
              background: mode === 'vg-editor' ? '#a855f7' : '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            VG Editor Mode
          </button>
          <button
            onClick={() => setMode('canvas-map')}
            style={{
              padding: '8px 16px',
              background: mode === 'canvas-map' ? '#14b8a6' : '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Canvas Map Mode
          </button>
        </div>

        <ModeRenderer mode={mode} />
      </div>
    );
  },
};

// Helper component for mode switching story
function ModeRenderer({ mode }) {
  const editorContext = useVGEditor();
  const canvasMapContext = useCanvasMap();

  useEffect(() => {
    // Clear previous mode
    if (editorContext?.openEditors?.size > 0) {
      for (const id of editorContext.openEditors.keys()) {
        editorContext.unregisterEditor(id);
      }
    }
    canvasMapContext?.deactivateCanvasMap();

    // Apply new mode
    if (mode === 'vg-editor') {
      editorContext?.registerEditor('mode-switch-editor', {
        id: 'vg-mode-switch',
        name: 'Editing ViewGroup',
        color: '#a855f7',
      });
    } else if (mode === 'canvas-map') {
      canvasMapContext?.activateCanvasMap();
      canvasMapContext?.setPlacedVGs(['vg1']);
    }
  }, [mode]);

  return (
    <div style={{ height: 550, display: 'flex' }}>
      <UnifiedCompanionPanel
        isOpen
        views={MOCK_VIEWS}
        datasets={MOCK_DATASETS}
        viewGroups={MOCK_VIEW_GROUPS}
        templates={MOCK_TEMPLATES}
        onViewClick={(v) => console.log('View clicked:', v)}
        onDatasetClick={(d) => console.log('Dataset clicked:', d)}
        onViewGroupClick={(vg) => console.log('VG clicked:', vg)}
      />
    </div>
  );
}

/**
 * Compact size mode
 */
export const CompactSize = {
  render: () => (
    <div style={{ height: 500, display: 'flex' }}>
      <UnifiedCompanionPanel
        isOpen
        sizeMode="compact"
        views={MOCK_VIEWS}
        datasets={MOCK_DATASETS}
        viewGroups={MOCK_VIEW_GROUPS}
        onViewClick={(v) => console.log('View clicked:', v)}
      />
    </div>
  ),
};

/**
 * Left side positioning
 */
export const LeftSide = {
  render: () => (
    <div style={{ height: 600, display: 'flex', justifyContent: 'flex-start' }}>
      <UnifiedCompanionPanel
        isOpen
        side="left"
        views={MOCK_VIEWS}
        datasets={MOCK_DATASETS}
        viewGroups={MOCK_VIEW_GROUPS}
        onViewClick={(v) => console.log('View clicked:', v)}
        onClose={() => console.log('Close')}
      />
    </div>
  ),
};
