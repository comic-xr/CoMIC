/**
 * @file MapToolbar.jsx
 * @description Mode-specific toolbar for Canvas Map Panel
 *
 * Shows different controls based on current mode:
 * - Navigate: Zoom, grid labels, display mode, viewports, collaborators, bookmarks
 * - Layout: Zoom, grid labels, display mode, internals, snap, add/merge/split
 * - Links: Zoom, VG/View sub-tabs, create/break link
 * - Collaborate: Zoom, Me/Team sub-tabs, cursors toggle
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ToggleGroup } from '@UI/react/components/molecules/ToggleGroup';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { AdaptiveTooltip } from '@UI/react/components/atoms/AdaptiveTooltip';
import {
  MAP_MODES,
  LINKS_SUB_TABS,
  COLLABORATE_SUB_TABS,
} from '../../utils/constants';
import './MapToolbar.scss';

/**
 * Small toolbar button with adaptive tooltip
 */
const ToolbarBtn = memo(function ToolbarBtn({
  icon,
  onClick,
  active,
  activeColor,
  disabled,
  title,
  size = 14,
}) {
  const { isVR } = useAdaptive();

  const button = (
    <button
      className={`map-toolbar__btn ${active ? 'map-toolbar__btn--active' : ''}`}
      style={active && activeColor ? { '--active-color': activeColor } : undefined}
      onClick={onClick}
      disabled={disabled}
      type="button"
      data-vr={isVR}
    >
      <Icon name={icon} size={isVR ? size + 4 : size} />
    </button>
  );

  if (!title) return button;

  return (
    <AdaptiveTooltip content={title} placement="bottom" delay={400}>
      {button}
    </AdaptiveTooltip>
  );
});

/**
 * Toolbar separator
 */
const Separator = memo(function Separator() {
  return <div className="map-toolbar__separator" />;
});

/**
 * MapToolbar - Mode-specific controls
 */
export const MapToolbar = memo(function MapToolbar({
  mapMode,
  showViews,
  showVGs,
  minimapZoom,
  showViewports,
  showCollaborators,
  showBookmarks,
  showInternals,
  linksSubTab,
  setLinksSubTab,
  collaborateSubTab,
  setCollaborateSubTab,
  onlineCollaboratorsCount,

  // Handlers
  onZoomIn,
  onZoomOut,
  onResetView,
  toggleShowViewports,
  toggleShowCollaborators,
  toggleShowBookmarks,
  toggleShowInternals,
  toggleShowViews,
  toggleShowVGs,

  // Action handlers
  onAddVG,
  onMergeVG,
  onSplitVG,
  onCreateLink,
  onBreakLink,

  // Companion panel

  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';
  const showLabels = !isCompact;

  return (
    <div className="map-toolbar" data-size-mode={sizeMode}>
      {/* Zoom controls - always visible */}
      <ToolbarBtn icon="zoomOut" onClick={onZoomOut} title="Zoom out" />
      <span className="map-toolbar__zoom-value">{minimapZoom}%</span>
      <ToolbarBtn icon="zoomIn" onClick={onZoomIn} title="Zoom in" />
      {onResetView && (
        <ToolbarBtn icon="aspectRatio" onClick={onResetView} title="Reset view" />
      )}

      <Separator />

      {/* View layer toggles */}
      <ToolbarBtn
        icon="viewGroup"
        active={showVGs}
        onClick={toggleShowVGs}
        title="ViewGroups"
        activeColor="var(--accent-purple)"
      />
      <ToolbarBtn
        icon="view"
        active={showViews}
        onClick={toggleShowViews}
        title="Views"
        activeColor="var(--accent-blue)"
      />

      <Separator />

      {/* Mode-specific controls */}
      {(mapMode === MAP_MODES.NAVIGATE || mapMode === MAP_MODES.LAYOUT) && (
        <ToolbarBtn
          icon="iframe"
          active={showViewports}
          onClick={toggleShowViewports}
          title="Viewports"
          activeColor="var(--accent-cyan)"
        />
      )}

      {mapMode === MAP_MODES.NAVIGATE && (
        <>
          <ToolbarBtn
            icon="users"
            active={showCollaborators}
            onClick={toggleShowCollaborators}
            title="Collaborators"
            activeColor="var(--accent-green)"
          />
          <ToolbarBtn
            icon="bookmark"
            active={showBookmarks}
            onClick={toggleShowBookmarks}
            title="Bookmarks"
            activeColor="var(--accent-amber)"
          />
        </>
      )}

      {mapMode === MAP_MODES.LAYOUT && (
        <>
          <ToolbarBtn
            icon="grid3x3"
            active={showInternals}
            onClick={toggleShowInternals}
            title="Internal layouts"
            activeColor="var(--accent-green)"
          />
          {!isCompact && (
            <>
              <Separator />
              <ToolbarBtn icon="plus" onClick={onAddVG} title="Add VG" />
              <ToolbarBtn icon="combine" onClick={onMergeVG} title="Merge VGs" />
              <ToolbarBtn icon="split" onClick={onSplitVG} title="Split VG" />
            </>
          )}
        </>
      )}

      {mapMode === MAP_MODES.LINKS && (
        <>
          <ToggleGroup
            options={[
              { value: LINKS_SUB_TABS.VG, label: showLabels ? 'VG' : undefined, icon: 'package' },
              { value: LINKS_SUB_TABS.VIEW, label: showLabels ? 'View' : undefined, icon: 'layers' },
            ]}
            value={linksSubTab}
            onChange={setLinksSubTab}
            variant="segmented"
            size="sm"
          />
          {!isCompact && (
            <>
              <Separator />
              <ToolbarBtn icon="link2" onClick={onCreateLink} title="Create link" />
              <ToolbarBtn icon="unlink2" onClick={onBreakLink} title="Break link" />
            </>
          )}
        </>
      )}

      {mapMode === MAP_MODES.TEAM && (
        <>
          <ToggleGroup
            options={[
              { value: COLLABORATE_SUB_TABS.ME, label: showLabels ? 'Me' : undefined },
              { value: COLLABORATE_SUB_TABS.TEAM, label: showLabels ? `Team (${onlineCollaboratorsCount})` : undefined },
            ]}
            value={collaborateSubTab}
            onChange={setCollaborateSubTab}
            variant="segmented"
            size="sm"
          />
        </>
      )}

      <div className="map-toolbar__spacer" />

      {isCompact && <ToolbarBtn icon="moreHorizontal" title="More options" />}
    </div>
  );
});

export default MapToolbar;
