/**
 * @file FloatingDPad.stories.jsx
 * @description Storybook stories for the circular floating D-Pad
 */

import React, { useState } from 'react';
import { FloatingDPad } from './FloatingDPad';

export default {
  title: 'Panels/CanvasMap/Shared/FloatingDPad',
  component: FloatingDPad,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 40,
          background: '#0c1220',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

// Docked (relative positioning)
export const Docked = () => {
  const [position, setPosition] = useState({ row: 0, col: 0 });

  const handleMove = (direction) => {
    setPosition((prev) => {
      switch (direction) {
        case 'up': return { ...prev, row: Math.max(0, prev.row - 1) };
        case 'down': return { ...prev, row: prev.row + 1 };
        case 'left': return { ...prev, col: Math.max(0, prev.col - 1) };
        case 'right': return { ...prev, col: prev.col + 1 };
        default: return prev;
      }
    });
  };

  const handleGoHome = () => setPosition({ row: 0, col: 0 });

  const colToLetter = (col) => String.fromCharCode(65 + (col % 26));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(96, 165, 250, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(96, 165, 250, 0.2)',
          color: '#e5e7eb',
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      >
        Position: {colToLetter(position.col)}{position.row + 1}
      </div>

      <FloatingDPad
        sizeMode="standard"
        docked
        showHandle={false}
        onMove={handleMove}
        onGoHome={handleGoHome}
      />
    </div>
  );
};

// Floating with drag support
export const Draggable = () => {
  const [dpadPosition, setDpadPosition] = useState({ x: 100, y: 100 });
  const [navPosition, setNavPosition] = useState({ row: 0, col: 0 });

  const handleMove = (direction) => {
    setNavPosition((prev) => {
      switch (direction) {
        case 'up': return { ...prev, row: Math.max(0, prev.row - 1) };
        case 'down': return { ...prev, row: prev.row + 1 };
        case 'left': return { ...prev, col: Math.max(0, prev.col - 1) };
        case 'right': return { ...prev, col: prev.col + 1 };
        default: return prev;
      }
    });
  };

  const handleGoHome = () => setNavPosition({ row: 0, col: 0 });

  const colToLetter = (col) => String.fromCharCode(65 + (col % 26));

  return (
    <div style={{ height: 400, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '12px 20px',
          background: 'rgba(96, 165, 250, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(96, 165, 250, 0.2)',
          color: '#e5e7eb',
          fontSize: 13,
        }}
      >
        <div style={{ fontFamily: 'monospace', marginBottom: 8 }}>
          Navigation: {colToLetter(navPosition.col)}{navPosition.row + 1}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 11 }}>
          Drag the handle (top-right corner) to move the D-Pad
        </div>
      </div>

      <FloatingDPad
        sizeMode="standard"
        position={dpadPosition}
        onPositionChange={setDpadPosition}
        onMove={handleMove}
        onGoHome={handleGoHome}
        showHandle
      />
    </div>
  );
};

// Size variants
export const Sizes = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>Minimal</span>
        <FloatingDPad
          sizeMode="minimal"
          docked
          showHandle={false}
          onMove={handleMove}
          onGoHome={handleGoHome}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>Compact</span>
        <FloatingDPad
          sizeMode="compact"
          docked
          showHandle={false}
          onMove={handleMove}
          onGoHome={handleGoHome}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>Standard</span>
        <FloatingDPad
          sizeMode="standard"
          docked
          showHandle={false}
          onMove={handleMove}
          onGoHome={handleGoHome}
        />
      </div>
    </div>
  );
};

// With custom center content
export const CustomCenter = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>Default (Home icon)</span>
        <FloatingDPad
          sizeMode="standard"
          docked
          showHandle={false}
          onMove={handleMove}
          onGoHome={handleGoHome}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>Custom label</span>
        <FloatingDPad
          sizeMode="standard"
          docked
          showHandle={false}
          onMove={handleMove}
          onGoHome={handleGoHome}
          centerContent={
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#f59e0b' }}>
              A1
            </span>
          }
        />
      </div>
    </div>
  );
};

export const Default = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <FloatingDPad
      sizeMode="standard"
      docked
      showHandle={false}
      onMove={handleMove}
      onGoHome={handleGoHome}
    />
  );
};
