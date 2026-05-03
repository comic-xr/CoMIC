/**
 * @file CanvasMapV2Prototype.stories.jsx
 * @description Storybook stories for the Canvas Map V2 prototype
 */

import React from 'react';
import { PanelShellProvider, PanelShell, CHROME_LEVELS } from '@UI/react/components/panels/PanelShell';
import { CanvasMapV2Prototype } from './CanvasMapV2Prototype';

const STORY_SURFACE_STYLE = {
  width: '100vw',
  height: '100vh',
  background: 'var(--color-bg-base, #020406)',
  padding: 24,
};

const REOPEN_BUTTON_STYLE = {
  marginBottom: 12,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12))',
  background: 'color-mix(in srgb, var(--color-accent-blue, #60a5fa) 14%, transparent)',
  color: 'var(--color-text-primary, #e2e8f0)',
  cursor: 'pointer',
  fontSize: 12,
};

export default {
  title: 'Panels/CanvasMap/V2 Prototype',
  component: CanvasMapV2Prototype,
  decorators: [
    (Story) => (
      <PanelShellProvider>
        <div style={STORY_SURFACE_STYLE}>
          <Story />
        </div>
      </PanelShellProvider>
    ),
  ],
  args: {
    width: 420,
    height: 620,
  },
  argTypes: {
    width: { control: { type: 'number', min: 280, max: 700, step: 10 } },
    height: { control: { type: 'number', min: 420, max: 900, step: 10 } },
  },
};

export const Default = {
  render: (args) => {
    const [isOpen, setIsOpen] = React.useState(true);

    return (
      <div>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={REOPEN_BUTTON_STYLE}
          >
            Reopen Canvas Map
          </button>
        )}

        {isOpen && (
          <PanelShell
            panelId="canvas-map-v2-prototype"
            title="Canvas Map"
            icon="map"
            chrome={CHROME_LEVELS.FULL}
            color="#60a5fa"
            defaultWidth={args.width}
            defaultHeight={args.height}
            onClose={() => setIsOpen(false)}
          >
            {({ width, height, sizeMode }) => (
              <CanvasMapV2Prototype width={width} height={height} sizeMode={sizeMode} />
            )}
          </PanelShell>
        )}
      </div>
    );
  },
};
