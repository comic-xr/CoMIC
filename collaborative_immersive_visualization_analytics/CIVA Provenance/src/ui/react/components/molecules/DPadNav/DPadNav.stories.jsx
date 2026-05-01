/**
 * @file DPadNav.stories.jsx
 * @description Storybook stories for D-Pad navigation controls
 */

import React, { useState } from 'react';
import { SquareDPad, SimpleDPad } from './DPadNav';

export default {
  title: 'Molecules/DPadNav',
  component: SquareDPad,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 40,
          background: '#0c1220',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

// Interactive demo with position tracking
export const Interactive = () => {
  const [position, setPosition] = useState({ row: 0, col: 0 });
  const homePosition = { row: 0, col: 0 };

  const handleMove = (direction) => {
    setPosition((prev) => {
      switch (direction) {
        case 'up':
          return { ...prev, row: Math.max(0, prev.row - 1) };
        case 'down':
          return { ...prev, row: prev.row + 1 };
        case 'left':
          return { ...prev, col: Math.max(0, prev.col - 1) };
        case 'right':
          return { ...prev, col: prev.col + 1 };
        default:
          return prev;
      }
    });
  };

  const handleGoHome = () => {
    setPosition(homePosition);
  };

  const colToLetter = (col) => String.fromCharCode(65 + (col % 26));
  const centerLabel = `${colToLetter(position.col)}${position.row + 1}`;
  const isAtHome = position.row === homePosition.row && position.col === homePosition.col;

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
        Position: Row {position.row + 1}, Col {colToLetter(position.col)} ({centerLabel})
      </div>

      <div style={{ display: 'flex', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase' }}>
            Square D-Pad
          </span>
          <SquareDPad
            sizeMode="standard"
            onMove={handleMove}
            onGoHome={handleGoHome}
            centerLabel={centerLabel}
            isAtHome={isAtHome}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase' }}>
            Simple D-Pad
          </span>
          <SimpleDPad
            sizeMode="standard"
            onMove={handleMove}
            onGoHome={handleGoHome}
            isAtHome={isAtHome}
          />
        </div>
      </div>
    </div>
  );
};

// Size variants
export const Sizes = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ color: '#e5e7eb', fontSize: 13, marginBottom: 16 }}>SquareDPad Sizes</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Minimal</span>
            <SquareDPad sizeMode="minimal" onMove={handleMove} onGoHome={handleGoHome} centerLabel="A1" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Compact</span>
            <SquareDPad sizeMode="compact" onMove={handleMove} onGoHome={handleGoHome} centerLabel="B2" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Standard</span>
            <SquareDPad sizeMode="standard" onMove={handleMove} onGoHome={handleGoHome} centerLabel="C3" />
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ color: '#e5e7eb', fontSize: 13, marginBottom: 16 }}>SimpleDPad Sizes</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Minimal</span>
            <SimpleDPad sizeMode="minimal" onMove={handleMove} onGoHome={handleGoHome} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Compact</span>
            <SimpleDPad sizeMode="compact" onMove={handleMove} onGoHome={handleGoHome} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#9ca3af', fontSize: 10 }}>Standard</span>
            <SimpleDPad sizeMode="standard" onMove={handleMove} onGoHome={handleGoHome} />
          </div>
        </div>
      </div>
    </div>
  );
};

// At Home state
export const AtHomeState = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <div style={{ display: 'flex', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>At Home (highlighted)</span>
        <SquareDPad
          sizeMode="standard"
          onMove={handleMove}
          onGoHome={handleGoHome}
          centerLabel="A1"
          isAtHome={true}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>Away from Home</span>
        <SquareDPad
          sizeMode="standard"
          onMove={handleMove}
          onGoHome={handleGoHome}
          centerLabel="D5"
          isAtHome={false}
        />
      </div>
    </div>
  );
};

// Default export for Storybook
export const Default = () => {
  const handleMove = (dir) => console.log('Move:', dir);
  const handleGoHome = () => console.log('Go home');

  return (
    <SquareDPad
      sizeMode="standard"
      onMove={handleMove}
      onGoHome={handleGoHome}
      centerLabel="A1"
    />
  );
};
