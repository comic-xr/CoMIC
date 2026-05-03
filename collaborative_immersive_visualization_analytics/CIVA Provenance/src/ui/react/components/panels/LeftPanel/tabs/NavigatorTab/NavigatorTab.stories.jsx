/**
 * @file NavigatorTab.stories.jsx
 * @description Storybook stories for Navigator Tab V5
 */

import React from 'react';
import { NavigatorTab } from './NavigatorTab';

export default {
  title: 'Panels/LeftPanel/Tabs/NavigatorTab',
  component: NavigatorTab,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0a0f' }],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 700, background: '#0a0a0f' }}>
        <Story />
      </div>
    ),
  ],
};

// Sample data
const SAMPLE_VIEW_GROUPS = [
  {
    id: 'vg-1',
    name: 'Brain Analysis',
    color: '#a855f7',
    row: 0,
    col: 0,
    rowSpan: 2,
    colSpan: 2,
  },
  {
    id: 'vg-2',
    name: 'Tumor Review',
    color: '#ec4899',
    row: 0,
    col: 2,
    rowSpan: 1,
    colSpan: 2,
  },
  {
    id: 'vg-3',
    name: 'Data Tables',
    color: '#22d3ee',
    row: 1,
    col: 2,
    rowSpan: 1,
    colSpan: 2,
  },
  {
    id: 'vg-4',
    name: 'Comparison',
    color: '#f59e0b',
    row: 2,
    col: 0,
    rowSpan: 2,
    colSpan: 3,
  },
];

const SAMPLE_VIEWS = [
  {
    id: 'v-1',
    name: 'Axial Slice',
    color: '#a855f7',
    instanceType: 'vtk-slice',
    position: 'A1',
    groupId: 'vg-1',
    starredWorkspace: true,
    linkedCount: 2,
  },
  {
    id: 'v-2',
    name: 'Sagittal',
    color: '#3b82f6',
    instanceType: 'vtk-slice',
    position: 'B1',
    groupId: 'vg-1',
    linkedCount: 2,
  },
  {
    id: 'v-3',
    name: '3D Volume',
    color: '#22c55e',
    instanceType: 'vtk-volume',
    position: 'A2',
    groupId: 'vg-1',
    starredWorkspace: true,
    starredPersonal: true,
  },
  {
    id: 'v-4',
    name: 'Tumor Overlay',
    color: '#ec4899',
    instanceType: 'vtk-volume',
    position: 'C1',
    groupId: 'vg-2',
    starredPersonal: true,
    isShared: true,
  },
  {
    id: 'v-5',
    name: 'Data Table',
    color: '#22d3ee',
    instanceType: 'table',
    position: 'C2',
    groupId: 'vg-3',
  },
  {
    id: 'v-6',
    name: 'Full Skull',
    color: '#f97316',
    instanceType: 'vtk-mesh',
    position: 'A3',
    groupId: 'vg-4',
    isLocked: true,
  },
  {
    id: 'v-7',
    name: 'Vessel Tree',
    color: '#14b8a6',
    instanceType: 'vtk-mesh',
    position: 'B3',
    groupId: 'vg-4',
  },
  {
    id: 'v-8',
    name: 'Coronal View',
    color: '#f59e0b',
    instanceType: 'vtk-slice',
    position: null,
    groupId: null,
    starredPersonal: true,
  },
];

const SAMPLE_COLLABORATORS = [
  { id: 'c-1', name: 'Alice', position: { row: 0, col: 2 }, avatar: 'A' },
  { id: 'c-2', name: 'Bob', position: { row: 2, col: 1 }, avatar: 'B' },
];

const SAMPLE_BOOKMARKS = [
  { id: 'bm-1', name: 'Pre-surgery baseline', viewGroupId: 'vg-1', isStarred: true },
  { id: 'bm-2', name: 'Tumor boundary review', viewGroupId: 'vg-2', isStarred: true },
  { id: 'bm-3', name: 'Final approval state', viewGroupId: 'vg-1', isStarred: false },
];

// Stories
export const Default = {
  args: {
    viewGroups: SAMPLE_VIEW_GROUPS,
    views: SAMPLE_VIEWS,
    bookmarks: SAMPLE_BOOKMARKS,
    collaborators: SAMPLE_COLLABORATORS,
    onNavigateToView: (viewId) => console.log('Navigate to view:', viewId),
    onPlaceView: (viewId) => console.log('Place view:', viewId),
    onFocusGroup: (groupId) => console.log('Focus group:', groupId),
    onLoadBookmark: (bmId) => console.log('Load bookmark:', bmId),
    onCreateBookmark: () => console.log('Create bookmark'),
  },
};

export const EmptyState = {
  args: {
    viewGroups: [],
    views: [],
    bookmarks: [],
    collaborators: [],
  },
};

export const ViewsOnly = {
  args: {
    viewGroups: [],
    views: SAMPLE_VIEWS.map((v) => ({ ...v, groupId: null })),
    bookmarks: [],
    collaborators: [],
  },
};

export const WithManyViews = {
  args: {
    viewGroups: SAMPLE_VIEW_GROUPS,
    views: [
      ...SAMPLE_VIEWS,
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `extra-${i}`,
        name: `Extra View ${i + 1}`,
        color: `hsl(${(i * 36) % 360}, 70%, 60%)`,
        instanceType: 'vtk-volume',
        position: null,
        groupId: null,
      })),
    ],
    bookmarks: SAMPLE_BOOKMARKS,
    collaborators: SAMPLE_COLLABORATORS,
  },
};
