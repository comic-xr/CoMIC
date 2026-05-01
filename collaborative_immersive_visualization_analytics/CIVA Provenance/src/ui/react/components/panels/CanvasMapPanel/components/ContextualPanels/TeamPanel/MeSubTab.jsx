/**
 * @file MeSubTab.jsx
 * @description "Me" sub-tab for TeamPanel - shows user's viewports, cursor settings, and status
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { ViewportItem } from '../../shared';
import { PanelSection } from '../../shared';

/**
 * Available cursor colors
 */
const CURSOR_COLORS = [
  '#22d3ee', // cyan
  '#34d399', // green
  '#fbbf24', // amber
  '#fb7185', // pink
  '#c084fc', // purple
  '#60a5fa', // blue
  '#f87171', // red
  '#7dd3fc', // teal
];

/**
 * MeSubTab - User's viewports, cursor settings, and broadcasting status
 */
export const MeSubTab = memo(function MeSubTab({
  viewports = [],
  selectedViewportId,
  isBroadcasting,
  followingUser,
  myCursorVisible = true,
  myCursorColor = '#22d3ee',
  onViewportClick,
  onAddViewport,
  onDeleteViewport,
  onSetPrimaryViewport,
  onStartBroadcast,
  onStopBroadcast,
  onStopFollowing,
  onToggleCursorVisible,
  onChangeCursorColor,
  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';

  return (
    <div className="team-subtab">
      {/* My Viewports */}
      <PanelSection
        title="My Viewports"
        icon="frame"
        actions={
          <>
            <Badge count={viewports.length} size="sm" />
            <button className="contextual-panel__icon-btn" onClick={onAddViewport} title="New viewport">
              <Icon name="plus" size={14} />
            </button>
          </>
        }
        sizeMode={sizeMode}
      >
        <div className="contextual-panel__list">
          {viewports.map(vp => (
            <ViewportItem
              key={vp.id}
              viewport={vp}
              isSelected={selectedViewportId === vp.id}
              onClick={onViewportClick}
              onDelete={onDeleteViewport}
              onSetPrimary={onSetPrimaryViewport}
            />
          ))}
        </div>
      </PanelSection>

      {/* Broadcasting */}
      <PanelSection title="Broadcast" icon="radio" sizeMode={sizeMode}>
        <div className="team-subtab__status-row">
          <span className="team-subtab__status-label">
            Broadcasting to team
          </span>
          <Toggle
            checked={isBroadcasting}
            onChange={isBroadcasting ? onStopBroadcast : onStartBroadcast}
            size="sm"
          />
        </div>
        {isBroadcasting && (
          <p className="contextual-panel__hint contextual-panel__hint--success">
            <Icon name="radio" size={12} /> Team members can follow your view
          </p>
        )}
      </PanelSection>

      {/* My Cursor */}
      <PanelSection title="My Cursor" icon="mousePointer" sizeMode={sizeMode}>
        <div className="team-subtab__status-row">
          <span className="team-subtab__status-label">
            Visible to team
          </span>
          <Toggle
            checked={myCursorVisible}
            onChange={onToggleCursorVisible}
            size="sm"
          />
        </div>

        {/* Cursor Color Picker */}
        <div className="team-subtab__cursor-colors">
          <span className="team-subtab__status-label">Color</span>
          <div className="team-subtab__color-picker">
            {CURSOR_COLORS.map(color => (
              <button
                key={color}
                className={`team-subtab__color-btn ${myCursorColor === color ? 'team-subtab__color-btn--active' : ''}`}
                style={{ '--color': color }}
                onClick={() => onChangeCursorColor?.(color)}
                title={`Set cursor color to ${color}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </PanelSection>

      {/* Following Status */}
      <PanelSection title="Following" icon="eye" sizeMode={sizeMode}>
        <div className="team-subtab__status-row">
          <span className="team-subtab__status-label">
            Currently following
          </span>
          {followingUser ? (
            <div className="team-subtab__following">
              <span
                className="team-subtab__following-user"
                style={{ '--user-color': followingUser.color }}
              >
                {followingUser.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon="x"
                onClick={onStopFollowing}
              >
                {!isCompact && 'Stop'}
              </Button>
            </div>
          ) : (
            <span className="team-subtab__status-value">Nobody</span>
          )}
        </div>
      </PanelSection>
    </div>
  );
});

export default MeSubTab;
