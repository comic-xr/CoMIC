/**
 * @file CompanionPanel.stories.jsx
 * @description Storybook stories for CompanionPanel V3 components
 */

import React, { useState } from 'react';
import { CompanionPanel } from './CompanionPanel';
import { ViewListItem } from './ViewListItem';
import { DatasetItem } from './DatasetItem';
import { VGItem } from './VGItem';
import { LayoutMiniPreview } from '@UI/react/components/molecules/LayoutMiniPreview';
import { GridSizePicker } from './GridSizePicker';
import { CollapsibleSection } from './CollapsibleSection';

// Mock data
const MOCK_VIEWS = [
  { id: 'v1', name: 'Brain MRI Volume', type: 'volume', datasetName: 'Patient_001', useCount: 1 },
  { id: 'v2', name: 'Axial Slice', type: 'slice', datasetName: 'Patient_001', useCount: 0 },
  { id: 'v3', name: 'Tumor Metrics', type: 'chart', datasetName: 'Patient_001', useCount: 2 },
  { id: 'v4', name: 'Segmentation Mesh', type: 'data', datasetName: 'Patient_002', useCount: 0 },
  { id: 'v5', name: 'Treatment Notes', type: 'notes', datasetName: 'Patient_002', useCount: 1 },
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
  {
    id: 'd3',
    name: 'Analysis_Results.csv',
    type: 'csv',
    viewCount: 1,
    size: '2.4 MB',
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
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    datasets: ['Patient_001'],
    placedCount: 1,
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
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    datasets: ['Patient_001', 'Patient_002'],
    placedCount: 0,
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
    lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    datasets: ['Shared_Dataset'],
    placedCount: 2,
  },
  {
    id: 'vg4',
    name: 'Project Overview',
    layoutId: '3x3',
    rows: 3,
    cols: 3,
    color: '#f59e0b',
    viewCount: 9,
    scope: 'project',
    createdBy: 'Bob',
    lastUsed: null,
    datasets: ['Project_Data', 'Results'],
    placedCount: 0,
  },
];

export default {
  title: 'Panels/CompanionPanel',
  component: CompanionPanel,
  decorators: [
    (Story) => (
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
    ),
  ],
};

/**
 * Full CompanionPanel with all tabs
 */
export const Default = {
  render: () => {
    const [activeTab, setActiveTab] = useState('datasets');

    return (
      <div style={{ height: 600, display: 'flex' }}>
        <CompanionPanel
          isOpen
          activeTab={activeTab}
          onTabChange={setActiveTab}
          views={MOCK_VIEWS}
          datasets={MOCK_DATASETS}
          viewGroups={MOCK_VIEW_GROUPS}
          onViewClick={(v) => console.log('View clicked:', v)}
          onDatasetClick={(d) => console.log('Dataset clicked:', d)}
          onViewGroupClick={(vg) => console.log('VG clicked:', vg)}
          onViewDragStart={(e, v) => console.log('View drag:', v)}
          onVGDragStart={(e, vg) => console.log('VG drag:', vg)}
        />
      </div>
    );
  },
};

/**
 * Compact mode (narrow width)
 */
export const CompactMode = {
  render: () => {
    const [activeTab, setActiveTab] = useState('views');

    return (
      <div style={{ height: 500, display: 'flex' }}>
        <CompanionPanel
          isOpen
          activeTab={activeTab}
          onTabChange={setActiveTab}
          views={MOCK_VIEWS}
          datasets={MOCK_DATASETS}
          viewGroups={MOCK_VIEW_GROUPS}
          sizeMode="compact"
          onViewClick={(v) => console.log('View clicked:', v)}
        />
      </div>
    );
  },
};

/**
 * Left side positioning
 */
export const LeftSide = {
  render: () => {
    const [activeTab, setActiveTab] = useState('viewGroups');

    return (
      <div style={{ height: 600, display: 'flex', justifyContent: 'flex-start' }}>
        <CompanionPanel
          isOpen
          activeTab={activeTab}
          onTabChange={setActiveTab}
          views={MOCK_VIEWS}
          datasets={MOCK_DATASETS}
          viewGroups={MOCK_VIEW_GROUPS}
          side="left"
          title="Add Content"
          subtitle="Drag items to canvas"
          onClose={() => console.log('Close')}
          onViewClick={(v) => console.log('View clicked:', v)}
        />
      </div>
    );
  },
};

/**
 * ViewListItem component showcase
 */
export const ViewListItems = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 200,
      padding: 16,
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: 8,
    }}>
      <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase' }}>
        View List Items
      </h4>
      <ViewListItem
        view={{ id: '1', name: 'Brain Volume', type: 'volume' }}
        datasetName="Patient_001"
        onClick={() => {}}
        onDragStart={() => {}}
      />
      <ViewListItem
        view={{ id: '2', name: 'Axial Slice', type: 'slice' }}
        datasetName="Patient_001"
        useCount={1}
        onClick={() => {}}
        onDragStart={() => {}}
      />
      <ViewListItem
        view={{ id: '3', name: 'Multi-use Chart', type: 'chart' }}
        datasetName="Analysis"
        useCount={3}
        onClick={() => {}}
        onDragStart={() => {}}
      />
      <ViewListItem
        view={{ id: '4', name: 'Disabled View', type: 'data' }}
        disabled
        onClick={() => {}}
      />
      <ViewListItem
        view={{ id: '5', name: 'Selected View', type: 'notes' }}
        isSelected
        vgColor="#8b5cf6"
        onClick={() => {}}
      />
    </div>
  ),
};

/**
 * VGItem component showcase
 */
export const VGItems = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 220,
      padding: 16,
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: 8,
    }}>
      <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase' }}>
        ViewGroup Items
      </h4>
      {MOCK_VIEW_GROUPS.map((vg) => (
        <VGItem
          key={vg.id}
          viewGroup={vg}
          onClick={() => console.log('Clicked:', vg.name)}
          onDragStart={() => {}}
          showCreator={vg.scope !== 'personal'}
        />
      ))}
    </div>
  ),
};

/**
 * LayoutMiniPreview component showcase
 */
export const LayoutPreviews = {
  render: () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      padding: 16,
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: 8,
    }}>
      <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase', width: '100%' }}>
        Layout Mini Previews
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="single" color="#3b82f6" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>single</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="side-by-side" color="#8b5cf6" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>side-by-side</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="stacked" color="#14b8a6" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>stacked</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="2x2" color="#f59e0b" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>2x2</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="1+2" color="#ec4899" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>1+2</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview layoutId="2+1" color="#06b6d4" size={40} />
        <span style={{ color: '#64748b', fontSize: 10 }}>2+1</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <LayoutMiniPreview rows={3} cols={4} viewCount={8} color="#84cc16" size={48} />
        <span style={{ color: '#64748b', fontSize: 10 }}>3x4 (8 views)</span>
      </div>
    </div>
  ),
};

/**
 * GridSizePicker component showcase
 */
export const GridSizePickerStory = {
  name: 'GridSizePicker',
  render: () => {
    const [rows, setRows] = useState(null);
    const [cols, setCols] = useState(null);
    const [mode, setMode] = useState('fits');

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: 16,
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: 8,
        width: 280,
      }}>
        <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase' }}>
          Grid Size Picker
        </h4>
        <GridSizePicker
          rows={rows}
          cols={cols}
          mode={mode}
          onRowsChange={setRows}
          onColsChange={setCols}
          onModeChange={setMode}
          onClear={() => { setRows(null); setCols(null); setMode('fits'); }}
        />
        <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
          State: rows={rows ?? 'null'}, cols={cols ?? 'null'}, mode={mode}
        </div>
      </div>
    );
  },
};

/**
 * CollapsibleSection component showcase
 */
export const CollapsibleSections = {
  render: () => {
    const [expanded, setExpanded] = useState(new Set(['recent']));

    const toggle = (id) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: 8,
        width: 200,
      }}>
        <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase' }}>
          Collapsible Sections
        </h4>
        <CollapsibleSection
          title="Recent"
          icon="clock"
          count={3}
          isExpanded={expanded.has('recent')}
          onToggle={() => toggle('recent')}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, padding: 8 }}>
            Recent content here...
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          title="My Saved"
          icon="user"
          count={5}
          isExpanded={expanded.has('saved')}
          onToggle={() => toggle('saved')}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, padding: 8 }}>
            Saved content here...
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          title="Shared"
          icon="users"
          count={12}
          isExpanded={expanded.has('shared')}
          onToggle={() => toggle('shared')}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, padding: 8 }}>
            Shared content here...
          </div>
        </CollapsibleSection>
      </div>
    );
  },
};

/**
 * DatasetItem with tree view
 */
export const DatasetTreeView = {
  render: () => {
    const [expanded, setExpanded] = useState(new Set(['d1']));

    const toggle = (id) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: 8,
        width: 220,
      }}>
        <h4 style={{ color: '#94a3b8', margin: 0, fontSize: 11, textTransform: 'uppercase' }}>
          Dataset Tree View
        </h4>
        {MOCK_DATASETS.map((dataset) => (
          <DatasetItem
            key={dataset.id}
            dataset={dataset}
            isExpanded={expanded.has(dataset.id)}
            onToggle={toggle}
            onClick={(d) => console.log('Dataset clicked:', d)}
            onDragStart={() => {}}
            onViewClick={(v) => console.log('View clicked:', v)}
            onViewDragStart={() => {}}
          />
        ))}
      </div>
    );
  },
};
