/**
 * @file LinksPanel.jsx
 * @description Links mode panel content for Canvas Map V2
 *
 * Shows:
 * - VG Links list (when VG sub-tab active)
 * - View Links list (when View sub-tab active)
 */

import React, { memo } from 'react';
import { Badge } from '@UI/react/components/atoms/Badge';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { LinkItem, PanelSection } from '../shared';
import { LINKS_SUB_TABS } from '../../utils/constants';
import { getVGDisplayName } from '../../utils/gridUtils';

/**
 * LinksPanel - Links mode content
 */
export const LinksPanel = memo(function LinksPanel({
  linksSubTab,
  vgLinks = [],
  viewLinks = [],
  viewGroups = [],
  allViews = [],
  highlightedLinkId,
  onLinkClick,
  onLinkDelete,
  sizeMode = 'standard',
}) {
  if (linksSubTab === LINKS_SUB_TABS.VG) {
    return (
      <div className="contextual-panel">
        <PanelSection
          title="ViewGroup Links"
          icon="gitBranch"
          actions={<Badge count={vgLinks.length} size="sm" />}
          sizeMode={sizeMode}
        >
          <p className="contextual-panel__hint">
            Click a link line on the map to highlight
          </p>
          <div className="contextual-panel__list">
            {vgLinks.map(link => {
              const fromVG = viewGroups.find(v => v.id === link.from);
              const toVG = viewGroups.find(v => v.id === link.to);
              return (
                <LinkItem
                  key={link.id}
                  link={link}
                  fromName={fromVG ? getVGDisplayName(fromVG) : '?'}
                  toName={toVG ? getVGDisplayName(toVG) : '?'}
                  fromColor={fromVG?.color}
                  toColor={toVG?.color}
                  isHighlighted={highlightedLinkId === link.id}
                  onClick={onLinkClick}
                  onDelete={onLinkDelete}
                />
              );
            })}
            {vgLinks.length === 0 && (
              <EmptyState
                icon="link2"
                title="No ViewGroup links defined"
                size="sm"
              />
            )}
          </div>
        </PanelSection>
      </div>
    );
  }

  // View links sub-tab
  return (
    <div className="contextual-panel">
      <PanelSection
        title="View Links"
        icon="layers"
        actions={<Badge count={viewLinks.length} size="sm" />}
        sizeMode={sizeMode}
      >
        <p className="contextual-panel__hint">
          Links between individual views across VGs
        </p>
        <div className="contextual-panel__list">
          {viewLinks.map(link => {
            // For view links, get the view names
            const fromView = allViews.find(v => v.id === link.from);
            const toView = allViews.find(v => v.id === link.to);
            return (
              <LinkItem
                key={link.id}
                link={link}
                fromName={fromView?.name || '?'}
                toName={toView?.name || '?'}
                fromColor={fromView?.vgColor}
                toColor={toView?.vgColor}
                isHighlighted={highlightedLinkId === link.id}
                onClick={onLinkClick}
                onDelete={onLinkDelete}
              />
            );
          })}
          {viewLinks.length === 0 && (
            <EmptyState
              icon="layers"
              title="No View links defined"
              size="sm"
            />
          )}
        </div>
      </PanelSection>
    </div>
  );
});

export default LinksPanel;
