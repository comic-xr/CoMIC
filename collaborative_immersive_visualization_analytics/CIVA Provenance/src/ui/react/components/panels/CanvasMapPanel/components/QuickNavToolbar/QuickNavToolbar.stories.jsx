/**
 * @file QuickNavToolbar.stories.jsx
 * @description Storybook stories for the QuickNavToolbar component (V2 MapSidebar design)
 */

import React, { useState } from 'react';
import { QuickNavToolbar } from './QuickNavToolbar';

export default {
  title: 'Panels/CanvasMap/Components/QuickNavToolbar',
  component: QuickNavToolbar,
  decorators: [
    (Story) => (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#020406',
        padding: 24,
        boxSizing: 'border-box',
        display: 'flex',
      }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    position: {
      control: { type: 'radio' },
      options: ['left', 'right'],
    },
  },
};

/**
 * Interactive story with all features
 */
export const Interactive = {
  render: (args) => {
    const [position, setPosition] = useState('left');
    const [companionOpen, setCompanionOpen] = useState(false);
    const [showVGOutlines, setShowVGOutlines] = useState(true);
    const [showViews, setShowViews] = useState(false);
    const [showViewports, setShowViewports] = useState(true);
    const [showCollaborators, setShowCollaborators] = useState(false);

    return (
      <div style={{ display: 'flex', height: 400, gap: 24 }}>
        <QuickNavToolbar
          position={position}
          onTogglePosition={() => setPosition(p => p === 'left' ? 'right' : 'left')}
          companionOpen={companionOpen}
          onToggleCompanion={() => setCompanionOpen(!companionOpen)}
          showVGOutlines={showVGOutlines}
          onToggleVGOutlines={() => setShowVGOutlines(!showVGOutlines)}
          showViews={showViews}
          onToggleViews={() => setShowViews(!showViews)}
          showViewports={showViewports}
          onToggleViewports={() => setShowViewports(!showViewports)}
          showCollaborators={showCollaborators}
          onToggleCollaborators={() => setShowCollaborators(!showCollaborators)}
        />

        {/* State display for debugging */}
        <div style={{
          padding: 16,
          background: 'rgba(96, 165, 250, 0.08)',
          border: '1px solid rgba(96, 165, 250, 0.18)',
          borderRadius: 8,
          color: 'rgba(248, 250, 252, 0.7)',
          fontSize: 12,
          fontFamily: 'monospace',
          minWidth: 200,
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'rgba(248, 250, 252, 0.9)' }}>
            Current State
          </div>
          <div>position: {position}</div>
          <div>companionOpen: {String(companionOpen)}</div>
          <div>showVGOutlines: {String(showVGOutlines)}</div>
          <div>showViews: {String(showViews)}</div>
          <div>showViewports: {String(showViewports)}</div>
          <div>showCollaborators: {String(showCollaborators)}</div>
        </div>
      </div>
    );
  },
};

/**
 * Left position (default)
 */
export const LeftPosition = {
  args: {
    position: 'left',
    companionOpen: false,
    showVGOutlines: true,
    showViews: false,
    showViewports: true,
    showCollaborators: false,
  },
  render: (args) => (
    <div style={{ height: 350 }}>
      <QuickNavToolbar {...args} />
    </div>
  ),
};

/**
 * Right position
 */
export const RightPosition = {
  args: {
    position: 'right',
    companionOpen: false,
    showVGOutlines: true,
    showViews: false,
    showViewports: true,
    showCollaborators: false,
  },
  render: (args) => (
    <div style={{ height: 350 }}>
      <QuickNavToolbar {...args} />
    </div>
  ),
};

/**
 * With companion panel open
 */
export const CompanionOpen = {
  args: {
    position: 'left',
    companionOpen: true,
    showVGOutlines: true,
    showViews: true,
    showViewports: true,
    showCollaborators: true,
  },
  render: (args) => (
    <div style={{ height: 350 }}>
      <QuickNavToolbar {...args} />
    </div>
  ),
};

/**
 * All toggles active
 */
export const AllActive = {
  args: {
    position: 'left',
    companionOpen: true,
    showVGOutlines: true,
    showViews: true,
    showViewports: true,
    showCollaborators: true,
  },
  render: (args) => (
    <div style={{ height: 350 }}>
      <QuickNavToolbar {...args} />
    </div>
  ),
};

/**
 * Without position toggle (fixed position)
 */
export const FixedPosition = {
  args: {
    position: 'left',
    companionOpen: false,
    showVGOutlines: true,
    showViews: false,
    showViewports: true,
    showCollaborators: false,
  },
  render: (args) => (
    <div style={{ height: 300 }}>
      <QuickNavToolbar
        {...args}
        onTogglePosition={undefined}
      />
    </div>
  ),
};

/**
 * Without companion toggle
 */
export const NoCompanionToggle = {
  args: {
    position: 'left',
    showVGOutlines: true,
    showViews: false,
    showViewports: true,
    showCollaborators: false,
  },
  render: (args) => (
    <div style={{ height: 300 }}>
      <QuickNavToolbar
        {...args}
        onToggleCompanion={undefined}
      />
    </div>
  ),
};
