/**
 * @file CanvasMapContent.stories.jsx
 * @description Storybook stories for the production Canvas Map Content component
 */

import React, { useState } from 'react';
import { CanvasMapContent } from './CanvasMapContent';

// Size presets for responsive testing
const SIZE_PRESETS = [
  { name: 'Compact', width: 340, height: 550 },
  { name: 'Standard', width: 480, height: 650 },
  { name: 'Wide', width: 580, height: 720 },
];

export default {
  title: 'Panels/CanvasMap/Production',
  component: CanvasMapContent,
  decorators: [
    (Story) => (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#020406',
        padding: 24,
        boxSizing: 'border-box',
      }}>
        <Story />
      </div>
    ),
  ],
  args: {
    width: 480,
    height: 650,
  },
  argTypes: {
    width: { control: { type: 'range', min: 300, max: 720, step: 10 } },
    height: { control: { type: 'range', min: 450, max: 900, step: 10 } },
  },
};

export const Default = {
  render: (args) => {
    const [width, setWidth] = useState(args.width);
    const [height, setHeight] = useState(args.height);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Size controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          background: 'rgba(96, 165, 250, 0.08)',
          borderRadius: 8,
          border: '1px solid rgba(96, 165, 250, 0.18)',
        }}>
          <span style={{ color: 'rgba(248, 250, 252, 0.7)', fontSize: 12 }}>Presets:</span>
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => { setWidth(preset.width); setHeight(preset.height); }}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(96, 165, 250, 0.2)',
                background: width === preset.width ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: width === preset.width ? '#3b82f6' : 'rgba(248, 250, 252, 0.7)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {preset.name} ({preset.width}x{preset.height})
            </button>
          ))}
          <span style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            background: 'rgba(96, 165, 250, 0.1)',
            borderRadius: 6,
            color: '#22d3ee',
            fontSize: 11,
            fontFamily: 'monospace',
          }}>
            {width} x {height}
          </span>
        </div>

        {/* The production component */}
        <div style={{
          width,
          height,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}>
          <CanvasMapContent
            workspaceId="story-workspace"
            width={width}
            height={height}
          />
        </div>
      </div>
    );
  },
};

export const CompactSize = {
  args: {
    width: 340,
    height: 550,
  },
  render: (args) => (
    <div style={{
      width: args.width,
      height: args.height,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    }}>
      <CanvasMapContent
        workspaceId="story-workspace"
        width={args.width}
        height={args.height}
      />
    </div>
  ),
};

export const WideSize = {
  args: {
    width: 580,
    height: 720,
  },
  render: (args) => (
    <div style={{
      width: args.width,
      height: args.height,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    }}>
      <CanvasMapContent
        workspaceId="story-workspace"
        width={args.width}
        height={args.height}
      />
    </div>
  ),
};
