/**
 * LayoutMiniPreview Stories
 *
 * Tiny pixel-art grid layout preview component.
 */

import React from 'react';
import { LayoutMiniPreview, DEFAULT_LAYOUTS } from './LayoutMiniPreview';

export default {
  title: 'Molecules/LayoutMiniPreview',
  component: LayoutMiniPreview,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    layoutId: {
      control: 'select',
      options: Object.keys(DEFAULT_LAYOUTS),
    },
    color: {
      control: 'color',
    },
    filledCount: {
      control: { type: 'range', min: 0, max: 9 },
    },
    size: {
      control: { type: 'range', min: 12, max: 48 },
    },
  },
};

// Default story
export const Default = {
  args: {
    layoutId: '2x2',
    color: '#a855f7',
    filledCount: 3,
    size: 16,
  },
};

// All layout types
export const AllLayouts = () => (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    {Object.keys(DEFAULT_LAYOUTS).map((layoutId) => (
      <div
        key={layoutId}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <LayoutMiniPreview
          layoutId={layoutId}
          color="#3b82f6"
          filledCount={DEFAULT_LAYOUTS[layoutId].cells}
          size={24}
        />
        <span style={{ fontSize: 10, color: '#888' }}>{layoutId}</span>
      </div>
    ))}
  </div>
);

// Fill progression
export const FillProgression = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[0, 1, 2, 3, 4].map((count) => (
      <div key={count} style={{ textAlign: 'center' }}>
        <LayoutMiniPreview
          layoutId="2x2"
          color="#22c55e"
          filledCount={count}
          size={20}
        />
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{count}</div>
      </div>
    ))}
  </div>
);

// Different sizes
export const Sizes = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
    {[12, 16, 20, 24, 32, 48].map((size) => (
      <div key={size} style={{ textAlign: 'center' }}>
        <LayoutMiniPreview
          layoutId="2x2"
          color="#f59e0b"
          filledCount={3}
          size={size}
        />
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{size}px</div>
      </div>
    ))}
  </div>
);

// Colors
export const Colors = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    {['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#22d3ee'].map(
      (color) => (
        <LayoutMiniPreview
          key={color}
          layoutId="2x2"
          color={color}
          filledCount={3}
          size={20}
        />
      )
    )}
  </div>
);

// Merged layouts
export const MergedLayouts = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <div style={{ textAlign: 'center' }}>
      <LayoutMiniPreview
        layoutId="1+2"
        color="#a855f7"
        filledCount={3}
        size={24}
      />
      <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>1+2 (top merged)</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <LayoutMiniPreview
        layoutId="2+1"
        color="#3b82f6"
        filledCount={3}
        size={24}
      />
      <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>2+1 (right merged)</div>
    </div>
  </div>
);
