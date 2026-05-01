/**
 * @file CanvasMapPanel.jsx
 * @description Canvas Map Panel - Floating panel for unified navigation and editing control
 *
 * Uses PanelShell architecture (floating-first) rather than docked LeftPanel tabs.
 *
 * Primary Functions:
 * - Navigate the infinite canvas
 * - Manage ViewGroups (create, edit, merge, split, link)
 * - Visualize and follow collaborators
 * - Understand linking relationships between VGs and Views
 */

import React, { useEffect, useCallback } from 'react';
import { PanelShell, CHROME_LEVELS, usePanelShell } from '@UI/react/components/panels/PanelShell';
import { Icon } from '@UI/react/components/atoms/Icon';
import { COMPANION_PANEL_ID } from '@UI/react/components/panels/CompanionPanel';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { CanvasMapContent } from './CanvasMapContent';

// Panel ID constant for external access
export const CANVAS_MAP_PANEL_ID = 'canvas-map';

// Breakpoints for responsive sizing
const CANVAS_MAP_BREAKPOINTS = {
  minWidth: 350,
  compactWidth: 350,
  standardWidth: 380,
  expandedWidth: 480,
};

/**
 * CanvasMapPanel - Floating panel wrapper for Canvas Map
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 */
const MIN_PANEL_WIDTH = 350;
const MIN_PANEL_HEIGHT = 520;
const PANEL_CONTENT_PADDING = 8;
const PANEL_HEADER_HEIGHT = 40;

export function CanvasMapPanel({ workspaceId }) {
  const { togglePanel, getPanelState, updateSize } = usePanelShell();
  const canvasMapContext = useCanvasMap();
  const companionState = getPanelState(COMPANION_PANEL_ID);
  const companionOpen = companionState?.isOpen || false;

  const handleCompanionToggle = useCallback(() => {
    togglePanel(COMPANION_PANEL_ID);
  }, [togglePanel]);

  // Listen for toggle event (keyboard shortcut 'm')
  useEffect(() => {
    const handleToggle = () => {
      togglePanel(CANVAS_MAP_PANEL_ID);
    };

    window.addEventListener('cia:toggle-canvas-map', handleToggle);
    return () => window.removeEventListener('cia:toggle-canvas-map', handleToggle);
  }, [togglePanel]);

  const panelState = getPanelState(CANVAS_MAP_PANEL_ID);

  useEffect(() => {
    if (!canvasMapContext) return;
    if (panelState?.isOpen) {
      canvasMapContext.activateCanvasMap();
    } else {
      canvasMapContext.deactivateCanvasMap();
    }
    return () => canvasMapContext.deactivateCanvasMap();
  }, [canvasMapContext, panelState?.isOpen]);

  useEffect(() => {
    if (!panelState?.size) return;
    const nextWidth = Math.max(panelState.size.width, MIN_PANEL_WIDTH);
    const nextHeight = Math.max(panelState.size.height, MIN_PANEL_HEIGHT);
    if (nextWidth !== panelState.size.width || nextHeight !== panelState.size.height) {
      updateSize(CANVAS_MAP_PANEL_ID, { width: nextWidth, height: nextHeight });
    }
  }, [panelState?.size, updateSize]);

  return (
    <PanelShell
      panelId={CANVAS_MAP_PANEL_ID}
      title="Canvas"
      icon="map"
      chrome={CHROME_LEVELS.FULL}
      color="#3b82f6"
      headerActions={(
        <button
          className="panel-header__button"
          onClick={handleCompanionToggle}
          title={companionOpen ? 'Hide companion panel' : 'Show companion panel'}
          type="button"
        >
          <Icon name={companionOpen ? 'panelRightClose' : 'panelRightOpen'} size={12} />
        </button>
      )}
      defaultWidth={380}
      defaultHeight={600}
      minWidth={350}
      minHeight={520}
      maxWidth={600}
      maxHeight={900}
      breakpoints={CANVAS_MAP_BREAKPOINTS}
    >
      {({ width, height, sizeMode }) => {
        const contentWidth = Math.max(0, width - PANEL_CONTENT_PADDING * 2);
        const contentHeight = Math.max(
          0,
          height - PANEL_HEADER_HEIGHT - PANEL_CONTENT_PADDING * 2
        );
        return (
        <CanvasMapContent
          workspaceId={workspaceId}
          width={contentWidth}
          height={contentHeight}
          sizeMode={sizeMode}
        />
        );
      }}
    </PanelShell>
  );
}

export default CanvasMapPanel;
