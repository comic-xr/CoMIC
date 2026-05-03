/**
 * PanelShell Stories
 *
 * Usage examples for the PanelShell component system.
 * These demonstrate the three chrome levels and various configurations.
 */

import React from 'react';
import { PanelShell, PanelShellProvider, CHROME_LEVELS } from './index';

// =============================================================================
// STORYBOOK META
// =============================================================================

export default {
  title: 'Panels/PanelShell',
  component: PanelShell,
  decorators: [
    (Story) => (
      <PanelShellProvider>
        <div style={{ width: '100vw', height: '100vh', background: '#020406' }}>
          <Story />
        </div>
      </PanelShellProvider>
    ),
  ],
};

// =============================================================================
// FULL CHROME EXAMPLES
// =============================================================================

/**
 * FULL chrome panel - for complex tools like Navigator, Instance Tools
 */
export const FullChrome = () => (
  <PanelShell
    panelId="demo-full"
    title="Navigator"
    icon="compass"
    chrome={CHROME_LEVELS.FULL}
    color="#60a5fa"
    defaultWidth={340}
    defaultHeight={500}
  >
    {({ width, height, sizeMode }) => (
      <div style={{ padding: 16, color: '#fff' }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Navigator Content</h3>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
          Size: {width}x{height}px
        </p>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
          Mode: {sizeMode}
        </p>
      </div>
    )}
  </PanelShell>
);

/**
 * FULL chrome with custom breakpoints
 */
export const FullChromeWithBreakpoints = () => (
  <PanelShell
    panelId="demo-breakpoints"
    title="Instance Tools"
    icon="tools"
    chrome={CHROME_LEVELS.FULL}
    color="#fbbf24"
    defaultWidth={300}
    defaultHeight={450}
    breakpoints={{
      minWidth: 200,
      compactWidth: 260,
      standardWidth: 300,
      expandedWidth: 380,
    }}
  >
    {({ width, sizeMode }) => (
      <div style={{ padding: 16, color: '#fff' }}>
        <p style={{ margin: 0, fontSize: 11 }}>
          Resize to see mode changes:
        </p>
        <p style={{
          margin: '8px 0',
          padding: '8px 12px',
          background: sizeMode === 'compact' ? '#ef4444' :
                     sizeMode === 'expanded' ? '#22c55e' : '#3b82f6',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
        }}>
          {sizeMode.toUpperCase()} MODE ({width}px)
        </p>
      </div>
    )}
  </PanelShell>
);

// =============================================================================
// COMPACT CHROME EXAMPLES
// =============================================================================

/**
 * COMPACT chrome panel - for simpler tools like Chat, People
 */
export const CompactChrome = () => (
  <PanelShell
    panelId="demo-compact"
    title="Chat"
    icon="messageSquare"
    chrome={CHROME_LEVELS.COMPACT}
    color="#22c55e"
    defaultWidth={280}
    defaultHeight={400}
  >
    <div style={{ padding: 12, color: '#fff' }}>
      <p style={{ margin: 0, fontSize: 12 }}>
        Compact chrome has a simpler header.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 11, opacity: 0.6 }}>
        No resize handle, no drag grip icon.
      </p>
    </div>
  </PanelShell>
);

// =============================================================================
// MINIMAL CHROME EXAMPLES
// =============================================================================

/**
 * MINIMAL chrome panel - for toolbars and floating buttons
 */
export const MinimalChrome = () => (
  <PanelShell
    panelId="demo-minimal"
    title="Quick Tools"
    icon="tools"
    chrome={CHROME_LEVELS.MINIMAL}
    defaultWidth={200}
    defaultHeight={48}
  >
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 4,
    }}>
      {['search', 'hand', 'ruler', 'messageSquare'].map((icon) => (
        <button
          key={icon}
          style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {icon[0].toUpperCase()}
        </button>
      ))}
    </div>
  </PanelShell>
);

// =============================================================================
// MULTIPLE PANELS
// =============================================================================

/**
 * Multiple panels at once - z-index management
 */
export const MultiplePanels = () => (
  <>
    <PanelShell
      panelId="multi-1"
      title="Panel One"
      icon="layers"
      chrome={CHROME_LEVELS.FULL}
      color="#60a5fa"
      defaultWidth={280}
      defaultHeight={300}
    >
      <div style={{ padding: 16, color: '#fff' }}>
        <p>Click panels to bring them to front.</p>
      </div>
    </PanelShell>

    <PanelShell
      panelId="multi-2"
      title="Panel Two"
      icon="settings"
      chrome={CHROME_LEVELS.COMPACT}
      color="#c084fc"
      defaultWidth={260}
      defaultHeight={280}
    >
      <div style={{ padding: 12, color: '#fff' }}>
        <p>Compact panel example.</p>
      </div>
    </PanelShell>

    <PanelShell
      panelId="multi-3"
      title="Toolbar"
      icon="tools"
      chrome={CHROME_LEVELS.MINIMAL}
      defaultWidth={180}
      defaultHeight={44}
    >
      <div style={{ display: 'flex', gap: 4, padding: 4 }}>
        <button style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff' }}>A</button>
        <button style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff' }}>B</button>
        <button style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff' }}>C</button>
      </div>
    </PanelShell>
  </>
);
