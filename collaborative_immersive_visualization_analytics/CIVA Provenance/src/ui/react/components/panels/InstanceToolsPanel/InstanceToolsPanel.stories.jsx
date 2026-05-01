/**
 * @file InstanceToolsPanel.stories.jsx
 * @description Storybook stories for Instance Tools Panel V2
 */

import React, { useState } from 'react';
import { InstanceToolsPanel } from './InstanceToolsPanel';
import { ViewGroupStrip } from './components/ViewGroupStrip/ViewGroupStrip';
import { DotNavigation } from './components/DotNavigation/DotNavigation';
import { TransformSection } from './components/ToolSections/TransformSection';
import { LayersAndWidgets } from './components/LayersAndWidgets/LayersAndWidgets';
import { TOOL_SECTIONS } from './constants';

export default {
  title: 'Panels/InstanceToolsPanel',
  component: InstanceToolsPanel,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
};

// Mock data
const SMALL_VIEWGROUP = {
  id: 'vg-1',
  name: 'Brain Analysis',
  color: '#a855f7',
  views: [
    { id: 'v-1', name: 'Axial', color: '#a855f7', position: 'A1', isActive: true },
    { id: 'v-2', name: 'Sagittal', color: '#3b82f6', position: 'A2', isActive: false },
    { id: 'v-3', name: '3D Volume', color: '#22c55e', position: 'B1', isActive: false },
  ],
  links: [{ viewIds: ['v-1', 'v-2'], type: 'camera' }],
};

const LARGE_VIEWGROUP = {
  id: 'vg-2',
  name: 'Comparison Grid',
  color: '#f59e0b',
  views: [
    { id: 'v-1', name: 'Pre-Op Axial', color: '#a855f7', position: 'A1', isActive: true },
    { id: 'v-2', name: 'Pre-Op Sag', color: '#3b82f6', position: 'A2', isActive: false },
    { id: 'v-3', name: 'Pre-Op Cor', color: '#22c55e', position: 'A3', isActive: false },
    { id: 'v-4', name: 'Post-Op Axial', color: '#ec4899', position: 'B1', isActive: false },
    { id: 'v-5', name: 'Post-Op Sag', color: '#f97316', position: 'B2', isActive: false },
    { id: 'v-6', name: 'Post-Op Cor', color: '#14b8a6', position: 'B3', isActive: false },
    { id: 'v-7', name: 'Diff Map', color: '#22d3ee', position: 'C1', isActive: false },
    { id: 'v-8', name: 'Stats', color: '#f59e0b', position: 'C2', isActive: false },
  ],
  links: [
    { viewIds: ['v-1', 'v-2', 'v-3'], type: 'camera' },
    { viewIds: ['v-4', 'v-5', 'v-6'], type: 'camera' },
  ],
};

const MOCK_LAYERS = [
  { id: 'l-1', name: 'Base Volume', type: 'data', visible: true, opacity: 100 },
  { id: 'l-2', name: 'Tumor Segmentation', type: 'overlay', visible: true, opacity: 75 },
  { id: 'l-3', name: 'Vessel Mask', type: 'overlay', visible: false, opacity: 60 },
];

const MOCK_WIDGETS = [
  { id: 'w-1', name: 'Line Measurement', type: 'line', visible: true, opacity: 100,
    value: '45.2 mm', details: { start: '(12.4, 34.8, 56.2)', end: '(57.6, 34.8, 56.2)' } },
  { id: 'w-2', name: 'Angle Tool', type: 'angle', visible: true, opacity: 80,
    value: '32.5°', details: { vertex: '(45.0, 67.2, 89.1)', angle: '32.5°' } },
];

// Panel container for stories
const PanelContainer = ({ children, width = 380 }) => (
  <div style={{
    width,
    height: 600,
    background: '#12121a',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }}>
    {children}
  </div>
);

/**
 * Full Panel - Shows complete Instance Tools Panel
 */
export const FullPanel = () => (
  <PanelContainer>
    <InstanceToolsPanel viewGroup={SMALL_VIEWGROUP} />
  </PanelContainer>
);

/**
 * ViewGroup Connectors - Small group (≤5 views) with connectors
 */
export const ViewGroupConnectors = () => (
  <PanelContainer width={400}>
    <ViewGroupStrip
      viewGroup={SMALL_VIEWGROUP}
      onViewSelect={(id) => console.log('Selected:', id)}
    />
  </PanelContainer>
);

/**
 * ViewGroup Grid - Large group (6+ views) with expandable grid
 */
export const ViewGroupGrid = () => (
  <PanelContainer width={400}>
    <ViewGroupStrip
      viewGroup={LARGE_VIEWGROUP}
      onViewSelect={(id) => console.log('Selected:', id)}
    />
  </PanelContainer>
);

/**
 * Dot Navigation - Section navigation dots
 */
export const DotNavigationDemo = () => {
  const [active, setActive] = useState('camera');
  return (
    <PanelContainer width={300}>
      <DotNavigation
        sections={TOOL_SECTIONS}
        activeSection={active}
        onNavigate={setActive}
      />
      <div style={{ padding: 16, color: '#fff', textAlign: 'center' }}>
        Active: {active}
      </div>
    </PanelContainer>
  );
};

/**
 * Transform Controls - Position, Rotation, Scale
 */
export const TransformControls = () => {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 100, y: 100, z: 100 });
  const [uniformScale, setUniformScale] = useState(true);

  return (
    <PanelContainer width={340}>
      <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
        <TransformSection
          position={position}
          rotation={rotation}
          scale={scale}
          uniformScale={uniformScale}
          onPositionChange={(axis, val) => setPosition(p => ({ ...p, [axis]: val }))}
          onRotationChange={(axis, val) => setRotation(r => ({ ...r, [axis]: val }))}
          onScaleChange={(axis, val) => {
            if (uniformScale) {
              setScale({ x: val, y: val, z: val });
            } else {
              setScale(s => ({ ...s, [axis]: val }));
            }
          }}
          onUniformScaleToggle={() => setUniformScale(!uniformScale)}
          onReset={() => {
            setPosition({ x: 0, y: 0, z: 0 });
            setRotation({ x: 0, y: 0, z: 0 });
            setScale({ x: 100, y: 100, z: 100 });
          }}
        />
      </div>
    </PanelContainer>
  );
};

/**
 * Layers and Widgets - Drag-and-drop layers, widget values
 */
export const LayersWidgets = () => {
  const [layers, setLayers] = useState(MOCK_LAYERS);
  const [widgets, setWidgets] = useState(MOCK_WIDGETS);
  const [expanded, setExpanded] = useState(true);

  return (
    <PanelContainer width={360}>
      <div style={{ flex: 1 }} />
      <LayersAndWidgets
        layers={layers}
        widgets={widgets}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
        onLayerVisibilityToggle={(id) => {
          setLayers(l => l.map(layer =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer
          ));
        }}
        onLayerOpacityChange={(id, opacity) => {
          setLayers(l => l.map(layer =>
            layer.id === id ? { ...layer, opacity } : layer
          ));
        }}
        onLayerReorder={(draggedId, targetId) => {
          setLayers(l => {
            const newLayers = [...l];
            const di = newLayers.findIndex(x => x.id === draggedId);
            const ti = newLayers.findIndex(x => x.id === targetId);
            const [d] = newLayers.splice(di, 1);
            newLayers.splice(ti, 0, d);
            return newLayers;
          });
        }}
        onWidgetVisibilityToggle={(id) => {
          setWidgets(w => w.map(widget =>
            widget.id === id ? { ...widget, visible: !widget.visible } : widget
          ));
        }}
        onWidgetOpacityChange={(id, opacity) => {
          setWidgets(w => w.map(widget =>
            widget.id === id ? { ...widget, opacity } : widget
          ));
        }}
        onWidgetDelete={(id) => {
          setWidgets(w => w.filter(widget => widget.id !== id));
        }}
      />
    </PanelContainer>
  );
};
