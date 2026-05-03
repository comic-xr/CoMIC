/**
 * @file CanvasMapBottomPanel.jsx
 * @description Bottom panel layout for CanvasMap V2 (search, tabs, d-pad)
 */

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { FilterToolbar } from '@UI/react/components/organisms/FilterToolbar';
import { SquareDPad } from '@UI/react/components/molecules/DPadNav';
import { MODE_CONFIG } from '../../utils/constants';
import { tokens } from '@UI/react/styles/tokens';

const getModeIconName = (modeConfig) => modeConfig.icon || 'layoutGrid';

export const CanvasMapBottomPanel = memo(function CanvasMapBottomPanel({
  mapMode,
  onModeChange,
  sizeMode,
  searchQuery,
  setSearchQuery,
  filter,
  filterConfig,
  tagOptions = [],
  quickFilterDefs = [],
  quickFilterCounts = {},
  minimapZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onMove,
  onGoHome,
  onSetHome,
  onFitAll,
  onAddBookmark,
  currentPositionLabel,
  isAtHome,
  minHeight,
  children,
  // Stats for footer
  totalVGCount = 0,
  activeVGCount = 0,
  filteredVGCount = 0,
}) {
  // Balanced sizes to match SquareDPad
  const dpadSize = sizeMode === 'compact' ? 72 : sizeMode === 'minimal' ? 64 : 84;
  const deckWidth = dpadSize + 28;
  const showTabLabels = sizeMode === 'expanded';
  const showQuickLabel = sizeMode !== 'compact';

  const quickFilters = useMemo(() => quickFilterDefs, [quickFilterDefs]);
  const toolbarConfig = useMemo(
    () => ({
      quickFilterDefs: quickFilters,
      sortOptions: filterConfig?.sortOptions || [],
      typeCategories: filterConfig?.typeCategories || [],
    }),
    [filterConfig, quickFilters]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: minHeight || 0,
        background: tokens.colors.bg.secondary,
        borderTop: `1px solid ${tokens.colors.border.subtle}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: tokens.spacing.sm,
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          background: tokens.colors.bg.secondary,
        }}
      >
        <FilterToolbar
          filter={{
            ...filter,
            searchQuery,
            setSearchQuery: (next) => {
              setSearchQuery?.(next);
              filter?.setSearchQuery?.(next);
            },
          }}
          config={toolbarConfig}
          tags={tagOptions}
          quickFilterCounts={quickFilterCounts}
          variant="embedded"
          showQuickFilters={false}
          showTypeFilter
          showTagFilter
          showSortFilter={(toolbarConfig.sortOptions || []).length > 0}
          searchPlaceholder="Search views, datasets..."
        />

        {quickFilterDefs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              marginTop: tokens.spacing.xs,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              paddingBottom: 2,
            }}
          >
            {showQuickLabel && (
              <span
                style={{
                  fontSize: tokens.fontSize.xs,
                  color: tokens.colors.text.muted,
                  marginRight: tokens.spacing.xs,
                  flexShrink: 0,
                }}
              >
                Quick:
              </span>
            )}
            {quickFilterDefs.map((def) => {
              const isActive = filter?.quickFilters?.includes(def.id);
              const count = quickFilterCounts?.[def.id];
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => filter?.toggleQuickFilter?.(def.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: '2px 8px',
                    borderRadius: tokens.radius.md,
                    border: `1px solid ${isActive ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                    background: isActive ? `${tokens.colors.accent.cyan}20` : tokens.colors.glass.subtle,
                    color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.muted,
                    fontSize: tokens.fontSize.xs,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {def.label}
                  {typeof count === 'number' && (
                    <span style={{ opacity: 0.75 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', minWidth: 0 }}>
        <div
          style={{
            width: deckWidth,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.sm,
            padding: tokens.spacing.sm,
            borderRight: `1px solid ${tokens.colors.border.subtle}`,
            background: tokens.colors.bg.tertiary,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              position: 'relative',
              background: tokens.colors.bg.secondary,
              borderRadius: tokens.radius.lg,
              border: `1px solid ${tokens.colors.border.subtle}`,
              padding: tokens.spacing.xs,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SquareDPad
              sizeMode={sizeMode === 'expanded' ? 'standard' : sizeMode}
              onMove={onMove}
              onGoHome={onGoHome}
              centerLabel={currentPositionLabel}
              isAtHome={isAtHome}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: tokens.spacing.xs,
              background: tokens.colors.bg.secondary,
              borderRadius: tokens.radius.lg,
              border: `1px solid ${tokens.colors.border.subtle}`,
              padding: tokens.spacing.xs,
            }}
          >
            {[
              { icon: 'home', label: 'Go Home', onClick: onGoHome },
              { icon: 'crosshair', label: 'Set Home', onClick: onSetHome },
              { icon: 'scan', label: 'Fit All', onClick: onFitAll },
              { icon: 'bookmark', label: 'Bookmark', onClick: onAddBookmark },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                title={action.label}
                style={{
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  background: 'transparent',
                  color: tokens.colors.text.muted,
                  cursor: 'pointer',
                }}
              >
                <Icon name={action.icon} size={14} />
              </button>
            ))}
          </div>

        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <div style={{ padding: tokens.spacing.sm, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <div
              style={{
                display: 'flex',
                gap: tokens.spacing.sm,
                flexWrap: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {Object.values(MODE_CONFIG).map((mode) => {
                const isActive = mapMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onModeChange(mode.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: tokens.spacing.xs,
                      padding: showTabLabels ? '6px 8px' : '6px',
                      borderRadius: tokens.radius.sm,
                      border: 'none',
                      borderBottom: `2px solid ${isActive ? tokens.colors.accent[mode.color] : 'transparent'}`,
                      background: 'transparent',
                      color: isActive ? tokens.colors.accent[mode.color] : tokens.colors.text.muted,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      fontWeight: isActive ? 600 : 500,
                      flex: '1 1 0',
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                    }}
                    title={mode.name}
                  >
                    <Icon name={getModeIconName(mode)} size={12} />
                    {showTabLabels && <span>{mode.name}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</div>
        </div>
      </div>

      {/* Status footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
          background: tokens.colors.glass.subtle,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '9px',
            color: tokens.colors.text.muted,
          }}
        >
          {filteredVGCount !== totalVGCount
            ? `${filteredVGCount} of ${totalVGCount} VGs`
            : `${totalVGCount} VG${totalVGCount !== 1 ? 's' : ''}`}
        </span>
        <span
          style={{
            fontSize: '9px',
            color: tokens.colors.accent.green,
          }}
        >
          {activeVGCount} active
        </span>
      </div>
    </div>
  );
});

export default CanvasMapBottomPanel;
