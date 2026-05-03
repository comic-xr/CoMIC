/**
 * @file QuickNavToolbar.jsx
 * @description Side navigation toolbar for Canvas Map Panel V2
 *
 * Matches V2Spec MapSidebar design with:
 * - Panel toggle (open/close companion panel)
 * - Show section (VG Outlines, Views, Viewport, Team)
 * - Move to left/right button
 *
 * Uses existing Tooltip atom for VR-compatible tooltips
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './QuickNavToolbar.scss';

/**
 * Toolbar button component with tooltip support
 */
const ToolbarBtn = memo(function ToolbarBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
  accentColor,
  placement = 'right',
}) {
  const { isVR } = useAdaptive();
  const iconSize = isVR ? 18 : 14;

  const button = (
    <button
      className={[
        'quick-nav-toolbar__btn',
        active && 'quick-nav-toolbar__btn--active',
        accentColor && `quick-nav-toolbar__btn--${accentColor}`,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      type="button"
      data-vr={isVR}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );

  return (
    <Tooltip content={label} placement={placement}>
      {button}
    </Tooltip>
  );
});

/**
 * QuickNavToolbar - Side navigation toolbar matching V2Spec MapSidebar
 *
 * @param {Object} props
 * @param {string} [props.position='left'] - Toolbar position ('left' or 'right')
 * @param {Function} props.onTogglePosition - Toggle toolbar to other side
 *
 * Panel Toggle:
 * @param {boolean} props.companionOpen - Whether companion panel is open
 * @param {Function} props.onToggleCompanion - Toggle companion panel
 *
 * Show Toggles:
 * @param {boolean} props.showVGOutlines - Show VG outlines on minimap
 * @param {Function} props.onToggleVGOutlines - Toggle VG outlines
 * @param {boolean} props.showViews - Show individual views on minimap
 * @param {Function} props.onToggleViews - Toggle views
 * @param {boolean} props.showViewports - Show viewport indicators
 * @param {Function} props.onToggleViewports - Toggle viewports
 * @param {boolean} props.showCollaborators - Show team viewports
 * @param {Function} props.onToggleCollaborators - Toggle team display
 */
export const QuickNavToolbar = memo(function QuickNavToolbar({
  position = 'left',
  onTogglePosition,
  // Panel toggle
  companionOpen = false,
  onToggleCompanion,
  // Show toggles
  showVGOutlines = true,
  onToggleVGOutlines,
  showViews = false,
  onToggleViews,
  showViewports = true,
  onToggleViewports,
  showCollaborators = false,
  onToggleCollaborators,
}) {
  const tooltipPlacement = position === 'left' ? 'right' : 'left';

  return (
    <div className={`quick-nav-toolbar quick-nav-toolbar--${position}`}>
      <div className="quick-nav-toolbar__inner">
        {/* Panel Toggle - Top section */}
        {onToggleCompanion && (
          <>
            <ToolbarBtn
              icon={companionOpen ? 'panelRightClose' : 'panelRightOpen'}
              label={companionOpen ? 'Close Panel' : 'Open Panel'}
              onClick={onToggleCompanion}
              active={companionOpen}
              accentColor="cyan"
              placement={tooltipPlacement}
            />
            <div className="quick-nav-toolbar__divider" />
          </>
        )}

        {/* Show Section */}
        <div className="quick-nav-toolbar__section">
          <span className="quick-nav-toolbar__label">Show</span>
          <div className="quick-nav-toolbar__group">
            <ToolbarBtn
              icon="grid3x3"
              label="VG Outlines"
              onClick={onToggleVGOutlines}
              active={showVGOutlines}
              accentColor="blue"
              placement={tooltipPlacement}
            />
            <ToolbarBtn
              icon="layers"
              label="Views"
              onClick={onToggleViews}
              active={showViews}
              accentColor="blue"
              placement={tooltipPlacement}
            />
            <ToolbarBtn
              icon="scan"
              label="Viewport"
              onClick={onToggleViewports}
              active={showViewports}
              accentColor="blue"
              placement={tooltipPlacement}
            />
            <ToolbarBtn
              icon="users"
              label="Team"
              onClick={onToggleCollaborators}
              active={showCollaborators}
              accentColor="blue"
              placement={tooltipPlacement}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="quick-nav-toolbar__spacer" />

        {/* Move Position - Bottom */}
        {onTogglePosition && (
          <>
            <div className="quick-nav-toolbar__divider" />
            <ToolbarBtn
              icon="arrowLeftRight"
              label={`Move to ${position === 'left' ? 'right' : 'left'}`}
              onClick={onTogglePosition}
              placement={tooltipPlacement}
            />
          </>
        )}
      </div>
    </div>
  );
});

export default QuickNavToolbar;
