/**
 * @file CanvasMapV2Spec.stories.jsx
 * @description Storybook stories for the spec-driven Canvas Map V2.
 */

import React, { useState } from 'react';
import { CanvasMapV2Spec } from './CanvasMapV2Spec';
import { CanvasMapContent } from './CanvasMapContent';

// Breakpoint presets for testing responsiveness
const SIZE_PRESETS = [
  { name: 'Minimal', width: 300, height: 500, description: 'Smallest usable size' },
  { name: 'Compact', width: 360, height: 580, description: 'Mobile/narrow panel' },
  { name: 'Standard', width: 480, height: 650, description: 'Default panel size' },
  { name: 'Wide', width: 560, height: 720, description: 'Comfortable workspace' },
  { name: 'Large', width: 640, height: 800, description: 'Large display' },
  { name: 'Max', width: 720, height: 900, description: 'Maximum supported' },
];

const tokens = {
  colors: {
    bg: { base: '#020406', secondary: '#0c1220', tertiary: '#121a2e' },
    glass: { subtle: 'rgba(96, 165, 250, 0.04)', medium: 'rgba(96, 165, 250, 0.10)' },
    border: { subtle: 'rgba(96, 165, 250, 0.10)', default: 'rgba(96, 165, 250, 0.18)' },
    text: { primary: 'rgba(248, 250, 252, 0.95)', secondary: 'rgba(203, 213, 225, 0.8)', muted: 'rgba(148, 163, 184, 0.6)' },
    accent: { blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e' },
  },
  radius: { sm: '4px', md: '6px', lg: '8px' },
  fontSize: { xs: '9px', sm: '10px', md: '11px' },
};

export default {
  title: 'Panels/CanvasMap/V2 Spec',
  component: CanvasMapV2Spec,
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', background: '#020406', padding: 24, boxSizing: 'border-box', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    width: 480,
    height: 650,
    showDebugControls: false,
  },
  argTypes: {
    width: { control: { type: 'range', min: 280, max: 800, step: 10 } },
    height: { control: { type: 'range', min: 400, max: 1000, step: 10 } },
    showDebugControls: { control: 'boolean' },
  },
};

// Interactive story with built-in size controls
export const Default = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    const [width, setWidth] = useState(args.width);
    const [height, setHeight] = useState(args.height);
    const [activePreset, setActivePreset] = useState('Standard');

    // Determine current size mode
    const sizeMode = width < 320 ? 'minimal' : width < 400 ? 'compact' : 'standard';

    const handlePresetClick = (preset) => {
      setWidth(preset.width);
      setHeight(preset.height);
      setActivePreset(preset.name);
    };

    const handleWidthChange = (e) => {
      setWidth(Number(e.target.value));
      setActivePreset(null);
    };

    const handleHeightChange = (e) => {
      setHeight(Number(e.target.value));
      setActivePreset(null);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Responsive Testing Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.colors.border.default}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Responsive Testing
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '4px 10px',
                  background: tokens.colors.glass.medium,
                  borderRadius: tokens.radius.md,
                  fontSize: tokens.fontSize.sm,
                  color: tokens.colors.accent.cyan,
                  fontFamily: 'monospace',
                }}
              >
                {width} × {height}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  background: sizeMode === 'minimal' ? `${tokens.colors.accent.blue}30` : sizeMode === 'compact' ? `${tokens.colors.accent.cyan}30` : `${tokens.colors.accent.green}30`,
                  borderRadius: tokens.radius.md,
                  fontSize: tokens.fontSize.sm,
                  color: sizeMode === 'minimal' ? tokens.colors.accent.blue : sizeMode === 'compact' ? tokens.colors.accent.cyan : tokens.colors.accent.green,
                  fontWeight: 600,
                }}
              >
                {sizeMode}
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SIZE_PRESETS.map((preset) => {
              const isActive = activePreset === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  title={`${preset.width}×${preset.height} - ${preset.description}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: tokens.radius.md,
                    border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                    background: isActive ? `${tokens.colors.accent.blue}20` : tokens.colors.glass.subtle,
                    color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.sm,
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted, minWidth: 45 }}>Width:</span>
              <input
                type="range"
                min="280"
                max="800"
                step="10"
                value={width}
                onChange={handleWidthChange}
                style={{ flex: 1, accentColor: tokens.colors.accent.blue }}
              />
              <input
                type="number"
                min="280"
                max="800"
                step="10"
                value={width}
                onChange={handleWidthChange}
                style={{
                  width: 60,
                  padding: '4px 6px',
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  background: tokens.colors.bg.tertiary,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.fontSize.sm,
                  textAlign: 'center',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted, minWidth: 45 }}>Height:</span>
              <input
                type="range"
                min="400"
                max="1000"
                step="10"
                value={height}
                onChange={handleHeightChange}
                style={{ flex: 1, accentColor: tokens.colors.accent.blue }}
              />
              <input
                type="number"
                min="400"
                max="1000"
                step="10"
                value={height}
                onChange={handleHeightChange}
                style={{
                  width: 60,
                  padding: '4px 6px',
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  background: tokens.colors.bg.tertiary,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.fontSize.sm,
                  textAlign: 'center',
                }}
              />
            </div>
          </div>
        </div>

        {/* Reopen button when closed */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.colors.border.default}`,
              background: tokens.colors.glass.medium,
              color: tokens.colors.text.primary,
              cursor: 'pointer',
              fontSize: 12,
              alignSelf: 'flex-start',
            }}
          >
            Reopen Canvas Map
          </button>
        )}

        {/* The component */}
        {isOpen && (
          <CanvasMapV2Spec
            width={width}
            height={height}
            showDebugControls={args.showDebugControls}
            onClose={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  },
};

export const ProductionParity = {
  render: (args) => {
    const [width, setWidth] = useState(args.width);
    const [height, setHeight] = useState(args.height);
    const [activePreset, setActivePreset] = useState('Standard');

    const sizeMode = width < 320 ? 'minimal' : width < 400 ? 'compact' : 'standard';

    const handlePresetClick = (preset) => {
      setWidth(preset.width);
      setHeight(preset.height);
      setActivePreset(preset.name);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.colors.border.default}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Production Parity
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '4px 10px',
                  background: tokens.colors.glass.medium,
                  borderRadius: tokens.radius.md,
                  fontSize: tokens.fontSize.sm,
                  color: tokens.colors.accent.cyan,
                  fontFamily: 'monospace',
                }}
              >
                {width} × {height}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  background: sizeMode === 'minimal' ? `${tokens.colors.accent.blue}30` : sizeMode === 'compact' ? `${tokens.colors.accent.cyan}30` : `${tokens.colors.accent.green}30`,
                  borderRadius: tokens.radius.md,
                  fontSize: tokens.fontSize.sm,
                  color: sizeMode === 'minimal' ? tokens.colors.accent.blue : sizeMode === 'compact' ? tokens.colors.accent.cyan : tokens.colors.accent.green,
                  fontWeight: 600,
                }}
              >
                {sizeMode}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetClick(preset)}
                style={{
                  padding: '6px 12px',
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  background: activePreset === preset.name ? tokens.colors.glass.medium : 'transparent',
                  color: activePreset === preset.name ? tokens.colors.text.primary : tokens.colors.text.muted,
                  cursor: 'pointer',
                  fontSize: tokens.fontSize.sm,
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width, height, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
          <CanvasMapContent workspaceId="story-workspace" width={width} height={height} />
        </div>
      </div>
    );
  },
};

// Story with all preset sizes shown side by side for comparison
export const AllSizes = {
  render: () => {
    const previewPresets = SIZE_PRESETS.slice(0, 4); // Show first 4 to fit

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            padding: '12px 16px',
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.colors.border.default}`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Size Comparison (Scroll horizontally →)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
          {previewPresets.map((preset) => (
            <div key={preset.name} style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: tokens.fontSize.md, fontWeight: 600, color: tokens.colors.text.primary }}>
                  {preset.name}
                </span>
                <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
                  {preset.width}×{preset.height}
                </span>
              </div>
              <CanvasMapV2Spec
                width={preset.width}
                height={preset.height}
                onClose={() => {}}
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
};
