/**
 * @file ViewportsPanel.jsx
 * @description Viewports mode panel content for Canvas Map V2
 *
 * Shows:
 * - Your Viewports: cards with focus + follow actions
 * - My Status: broadcasting + following summary
 * - Bottom Actions: new viewport shortcuts
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { PanelSection } from '../shared';
import { formatRangeRef } from '../../utils/gridUtils';
import './ContextualPanels.scss';

export const ViewportsPanel = memo(function ViewportsPanel({
  viewports = [],
  selectedViewportId,
  onViewportClick,
  onFollowViewport,
  onAddViewport,
  onAddViewportAndFollow,
  isBroadcasting = false,
  followingUser,
  onStartBroadcast,
  onStopBroadcast,
  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';

  return (
    <div className="contextual-panel viewports-panel">
      <PanelSection
        title="Your Viewports"
        icon="iframe"
        actions={<Badge count={viewports.length} size="sm" />}
        sizeMode={sizeMode}
      >
        <div className="viewports-panel__list">
          {viewports.map((vp) => {
            const isSelected = vp.id === selectedViewportId;
            const positionLabel = vp.position && vp.size
              ? formatRangeRef(vp.position.row, vp.position.col, vp.size.rows, vp.size.cols)
              : '—';
            const followingLabel = vp.followingUser?.name;

            return (
              <div
                key={vp.id}
                className={`viewports-panel__card ${isSelected ? 'viewports-panel__card--selected' : ''}`}
                onClick={() => onViewportClick?.(vp.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onViewportClick?.(vp.id);
                  }
                }}
              >
                <div className="viewports-panel__card-main">
                  <Icon name="iframe" size={14} />
                  <div className="viewports-panel__card-meta">
                    <span className="viewports-panel__card-name">{vp.name}</span>
                    <span className="viewports-panel__card-position">{positionLabel}</span>
                  </div>
                </div>
                <div className="viewports-panel__card-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="focus"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewportClick?.(vp.id);
                    }}
                  >
                    {!isCompact && 'Focus'}
                  </Button>
                  {followingLabel ? (
                    <span className="viewports-panel__chip" title={`Following ${followingLabel}`}>
                      {followingLabel}
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="eye"
                      onClick={(event) => {
                        event.stopPropagation();
                        onFollowViewport?.(vp.id);
                      }}
                    >
                      {!isCompact && 'Follow'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="My Status" icon="radio" sizeMode={sizeMode}>
        <div className="viewports-panel__status-row">
          <span className="viewports-panel__status-label">
            <Icon name="radio" size={12} />
            Broadcasting
          </span>
          <Toggle
            checked={isBroadcasting}
            onChange={isBroadcasting ? onStopBroadcast : onStartBroadcast}
            size="sm"
          />
        </div>
        <div className="viewports-panel__status-row">
          <span className="viewports-panel__status-label">
            <Icon name="eye" size={12} />
            Following
          </span>
          <span className="viewports-panel__status-value">
            {followingUser?.name || 'Nobody'}
          </span>
        </div>
      </PanelSection>

      <PanelSection title="Actions" icon="plus" sizeMode={sizeMode}>
        <div className="contextual-panel__actions">
          <Button variant="ghost" size="sm" icon="plus" onClick={onAddViewport}>
            {!isCompact && 'New Viewport'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="users"
            onClick={onAddViewportAndFollow || onAddViewport}
          >
            {!isCompact && 'New + Follow'}
          </Button>
        </div>
      </PanelSection>
    </div>
  );
});

export default ViewportsPanel;
