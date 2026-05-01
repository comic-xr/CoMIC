/**
 * @file VGEditorPanelContent.stories.jsx
 * @description Storybook stories for VGEditorPanelContent component
 */

import React from 'react';
import { VGEditorPanelContent } from './VGEditorPanelContent';
import { VGEditorProvider } from '@UI/react/context/VGEditorContext';
import './VGEditorPanel.scss';

// Mock ViewGroup data
const MOCK_VIEW_GROUP = {
  id: 'vg-123',
  name: 'Analysis Dashboard',
  color: '#a855f7',
  layoutId: '2x2',
  views: [
    { id: 'v1', name: 'Brain Volume', type: 'volume', datasetName: 'Patient_001' },
    { id: 'v2', name: 'Axial Slice', type: 'slice', datasetName: 'Patient_001' },
    { id: 'v3', name: 'Metrics Chart', type: 'chart', datasetName: 'Analysis' },
    null, // Empty slot
  ],
};

const MOCK_NEW_VG = {
  id: 'vg-new',
  name: 'New ViewGroup',
  color: '#3b82f6',
  layoutId: 'single',
  views: [],
};

const MOCK_PARTIAL_VG = {
  id: 'vg-partial',
  name: 'Work in Progress',
  color: '#14b8a6',
  layoutId: '1+2',
  views: [
    { id: 'v1', name: 'Main View', type: 'vtk', datasetName: 'Dataset_A' },
  ],
};

export default {
  title: 'Panels/VGEditor/VGEditorPanelContent',
  component: VGEditorPanelContent,
  decorators: [
    (Story) => (
      <VGEditorProvider>
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
      </VGEditorProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Editing an existing ViewGroup with some views
 */
export const ExistingViewGroup = {
  render: () => (
    <div style={{ width: 400, height: 600 }}>
      <VGEditorPanelContent
        initialVG={MOCK_VIEW_GROUP}
        panelId="vg-editor-story-1"
        onClose={() => console.log('Close')}
        onSave={(vg) => console.log('Save:', vg)}
        onDelete={(id) => console.log('Delete:', id)}
      />
    </div>
  ),
};

/**
 * Creating a new ViewGroup
 */
export const NewViewGroup = {
  render: () => (
    <div style={{ width: 400, height: 600 }}>
      <VGEditorPanelContent
        initialVG={MOCK_NEW_VG}
        isNewVG
        panelId="vg-editor-story-2"
        onClose={() => console.log('Close')}
        onSave={(vg) => console.log('Save:', vg)}
      />
    </div>
  ),
};

/**
 * Partially filled ViewGroup with merged layout
 */
export const PartiallyFilled = {
  render: () => (
    <div style={{ width: 400, height: 600 }}>
      <VGEditorPanelContent
        initialVG={MOCK_PARTIAL_VG}
        panelId="vg-editor-story-3"
        onClose={() => console.log('Close')}
        onSave={(vg) => console.log('Save:', vg)}
        onDelete={(id) => console.log('Delete:', id)}
      />
    </div>
  ),
};

/**
 * Multiple VG editors open (demonstrating multi-editor context)
 */
export const MultipleEditors = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ width: 380, height: 550 }}>
        <VGEditorPanelContent
          initialVG={MOCK_VIEW_GROUP}
          panelId="vg-editor-1"
          onClose={() => console.log('Close 1')}
          onSave={(vg) => console.log('Save 1:', vg)}
        />
      </div>
      <div style={{ width: 380, height: 550 }}>
        <VGEditorPanelContent
          initialVG={{
            id: 'vg-second',
            name: 'Second Editor',
            color: '#22c55e',
            layoutId: 'side-by-side',
            views: [
              { id: 'v-a', name: 'View A', type: 'data', datasetName: 'Data_1' },
            ],
          }}
          panelId="vg-editor-2"
          onClose={() => console.log('Close 2')}
          onSave={(vg) => console.log('Save 2:', vg)}
        />
      </div>
    </div>
  ),
};

/**
 * Different layout configurations
 */
export const LayoutVariations = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {[
        { layoutId: 'single', name: 'Single', color: '#3b82f6' },
        { layoutId: 'side-by-side', name: 'Side by Side', color: '#22c55e' },
        { layoutId: 'stacked', name: 'Stacked', color: '#f59e0b' },
        { layoutId: '2x2', name: '2x2 Grid', color: '#a855f7' },
        { layoutId: '1+2', name: '1+2 Layout', color: '#ec4899' },
        { layoutId: '2+1', name: '2+1 Layout', color: '#22d3ee' },
      ].map((config, i) => (
        <div key={config.layoutId} style={{ width: 300, height: 400 }}>
          <VGEditorPanelContent
            initialVG={{
              id: `vg-layout-${i}`,
              name: config.name,
              color: config.color,
              layoutId: config.layoutId,
              views: [],
            }}
            panelId={`vg-editor-layout-${i}`}
            onClose={() => {}}
            onSave={() => {}}
          />
        </div>
      ))}
    </div>
  ),
};

/**
 * Compact width
 */
export const CompactWidth = {
  render: () => (
    <div style={{ width: 320, height: 500 }}>
      <VGEditorPanelContent
        initialVG={MOCK_VIEW_GROUP}
        panelId="vg-editor-compact"
        onClose={() => console.log('Close')}
        onSave={(vg) => console.log('Save:', vg)}
      />
    </div>
  ),
};
