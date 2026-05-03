/**
 * @file ViewGroupStrip.jsx
 * @description Adaptive ViewGroup strip - connectors for ≤5 views, grid for 6+
 */

import React, { useState, useMemo, memo, Fragment } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VIEWGROUP_TIPPING_POINT } from '../../constants';

/**
 * ColorDot - Small colored dot indicator
 */
const ColorDot = memo(function ColorDot({ color, size = 8, glow = false }) {
  return (
    <span
      className="color-dot"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: glow ? `0 0 6px ${color}` : 'none',
      }}
    />
  );
});

/**
 * GradientConnector - Link between connected views
 */
const GradientConnector = memo(function GradientConnector({ fromColor, toColor }) {
  return (
    <div
      className="gradient-connector"
      style={{
        background: `linear-gradient(90deg, ${fromColor}, ${toColor})`,
      }}
    >
      <span className="gradient-connector__icon">
        <Icon name="link" size={8} />
      </span>
    </div>
  );
});

/**
 * ViewChip - Individual view chip
 */
const ViewChip = memo(function ViewChip({ view, isActive, onClick }) {
  return (
    <button
      className={`view-chip ${isActive ? 'view-chip--active' : ''}`}
      style={{ '--view-color': view.color }}
      onClick={onClick}
    >
      <ColorDot color={view.color} size={5} glow={isActive} />
      {isActive && <span className="view-chip__name">{view.name}</span>}
      <span className="view-chip__position">{view.position}</span>
    </button>
  );
});

/**
 * ViewGroupStrip - Adaptive container for view group navigation
 */
export const ViewGroupStrip = memo(function ViewGroupStrip({
  viewGroup,
  onViewSelect,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!viewGroup) return null;

  const activeView = viewGroup.views?.find(v => v.isActive) || viewGroup.views?.[0];
  const useConnectors = viewGroup.views?.length <= VIEWGROUP_TIPPING_POINT;
  const gridSize = Math.ceil(Math.sqrt(viewGroup.views?.length || 1));

  // Find linked views
  const linkedViewIds = useMemo(() => {
    const ids = new Set();
    viewGroup.links?.forEach(link => {
      if (link.viewIds.includes(activeView?.id)) {
        link.viewIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [viewGroup.links, activeView?.id]);

  return (
    <div
      className="view-group-strip"
      style={{ '--group-color': viewGroup.color }}
    >
      {/* Header */}
      <div className="view-group-strip__header">
        <ColorDot color={viewGroup.color} size={8} glow />
        <span className="view-group-strip__name">{viewGroup.name}</span>
        {!useConnectors && (
          <span className="view-group-strip__count">{viewGroup.views?.length}</span>
        )}
        <div className="view-group-strip__spacer" />

        {/* For large groups: active chip + grid toggle */}
        {!useConnectors && activeView && (
          <>
            <button
              className="view-group-strip__active-chip"
              style={{ '--view-color': activeView.color }}
            >
              <ColorDot color={activeView.color} size={5} />
              <span>{activeView.name}</span>
              <span className="view-group-strip__active-position">{activeView.position}</span>
            </button>
            <button
              className={`view-group-strip__grid-toggle ${expanded ? 'view-group-strip__grid-toggle--expanded' : ''}`}
              onClick={() => setExpanded(!expanded)}
            >
              <div
                className="view-group-strip__mini-grid"
                style={{ gridTemplateColumns: `repeat(${Math.min(gridSize, 3)}, 4px)` }}
              >
                {viewGroup.views?.slice(0, 9).map((v, i) => (
                  <div
                    key={i}
                    className="view-group-strip__mini-cell"
                    style={{ background: v.isActive ? v.color : `${v.color}60` }}
                  />
                ))}
              </div>
            </button>
          </>
        )}

        <button className="view-group-strip__settings" title="Group Settings">
          <Icon name="settings" size={12} />
        </button>
      </div>

      {/* Connector style for ≤5 views */}
      {useConnectors && viewGroup.views && (
        <div className="view-group-strip__connectors">
          {viewGroup.views.map((view, index) => {
            const isLinked = linkedViewIds.has(view.id);
            const nextView = viewGroup.views[index + 1];
            const showConnector = isLinked && nextView && linkedViewIds.has(nextView.id);

            return (
              <Fragment key={view.id}>
                <ViewChip
                  view={view}
                  isActive={view.isActive}
                  onClick={() => onViewSelect?.(view.id)}
                />
                {showConnector && (
                  <GradientConnector
                    fromColor={view.color}
                    toColor={nextView.color}
                  />
                )}
                {!showConnector && index < viewGroup.views.length - 1 && (
                  <div className="view-group-strip__gap" />
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Expanded grid for 6+ views */}
      {!useConnectors && expanded && viewGroup.views && (
        <div className="view-group-strip__expanded-grid">
          <div
            className="view-group-strip__grid"
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {viewGroup.views.map(view => (
              <button
                key={view.id}
                className={`view-group-strip__grid-cell ${view.isActive ? 'view-group-strip__grid-cell--active' : ''}`}
                style={{ '--view-color': view.color }}
                onClick={() => onViewSelect?.(view.id)}
                title={view.name}
              >
                {view.position}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ViewGroupStrip;
