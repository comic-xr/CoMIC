/**
 * @file Minimap.jsx
 * @description Main minimap component for Canvas Map Panel V2
 *
 * Features:
 * - Grid-based canvas overview
 * - VG blocks or View cells (based on display mode)
 * - Viewport indicators
 * - Collaborator indicators with cursor tracking
 * - Link lines (in Links mode)
 * - Panning support for large canvases
 */

import React, { memo, useMemo, useRef, useCallback, useState } from 'react';
import { VGBlock } from './VGBlock';
import { ViewCell } from './ViewCell';
import { ViewportIndicator } from './ViewportIndicator';
import { CollaboratorIndicator } from './CollaboratorIndicator';
import { CursorIndicator } from './CursorIndicator';
import { LinkLines } from './LinkLines';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useMinimapPanning } from '../../hooks/useMinimapPanning';
import { useMinimapCellSize } from '../../hooks/useMinimapCellSize';
import { MAP_MODES, MINIMAP_CONSTANTS } from '../../utils/constants';
import { colToLetter, getGridCenter, clamp } from '../../utils/gridUtils';
import './Minimap.scss';

/**
 * Minimap - Grid-based canvas overview with panning
 */
export const Minimap = memo(function Minimap({
  // Data
  canvas,
  viewGroups,
  viewports,
  collaborators,
  vgLinks,
  bookmarks,
  flattenedViews,

  // Display settings
  showViews = false,
  showVGs = true,
  mapMode,
  minimapZoom,
  showGridLabels,
  showInternals,
  showViewports,
  showCollaborators,
  showBookmarks,
  showCursors,

  // Selection state
  selectedVGId,
  selectedViewportId,
  highlightedLinkId,

  // Handlers
  onVGClick,
  onVGDoubleClick,
  onLinkClick,
  onDropItem,

  // Container dimensions
  containerWidth,
  containerHeight,

  // Focus state
  focusedVG,

  // Companion panel (for extended panning)
  companionOpen = false,
  companionWidth = 0,

  // Control signals
  resetPanSignal = 0,
}) {
  const { rows, cols, homePosition } = canvas;
  const containerRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Calculate cell sizing
  const sizing = useMinimapCellSize({
    containerWidth: containerWidth || 300,
    containerHeight: containerHeight || 300,
    rows,
    cols,
    zoom: minimapZoom,
    showLabels: showGridLabels,
    focusedVG,
  });

  const { cellSize, headerSize } = sizing;
  const renderGap = 0;
  const renderPitch = cellSize + renderGap;
  const gridExtra = MINIMAP_CONSTANTS.EXTRA_GRID_CELLS ?? 2;
  const gridCols = Math.max(cols + gridExtra, cols);
  const gridRows = Math.max(rows + gridExtra, rows);
  const gridWidth = gridCols * renderPitch;
  const gridHeight = gridRows * renderPitch;
  const scrollPadding = MINIMAP_CONSTANTS.SCROLL_PADDING * 2;
  const labelOffset = showGridLabels ? headerSize : 0;
  const majorEvery = 5;
  const minorLineColor = 'rgba(96, 165, 250, 0.16)';
  const majorLineColor = 'rgba(96, 165, 250, 0.34)';
  const canvasOutlineColor = 'rgba(148, 163, 184, 0.35)';

  // Panning support with extended bounds (V2Spec: allows panning ~3 cells beyond content)
  const cellPitch = renderPitch;

  const panEnabled = sizing.needsPanning || MINIMAP_CONSTANTS.PAN_PADDING_CELLS > 0;
  const panning = useMinimapPanning({
    contentWidth: gridWidth + labelOffset + scrollPadding,
    contentHeight: gridHeight + labelOffset + scrollPadding,
    viewportWidth: containerWidth || 300,
    viewportHeight: containerHeight || 300,
    enabled: panEnabled,
    cellPitch,
    companionOpen,
    companionOffset: companionWidth,
  });

  React.useEffect(() => {
    if (resetPanSignal === 0) return;
    panning.resetPan();
  }, [resetPanSignal, panning.resetPan]);

  // Calculate which VGs are involved in the highlighted link
  const highlightedLinkVGs = useMemo(() => {
    if (!highlightedLinkId) return new Set();
    const link = vgLinks.find(l => l.id === highlightedLinkId);
    if (!link) return new Set();
    return new Set([link.from, link.to]);
  }, [highlightedLinkId, vgLinks]);

  const getVGCenter = useCallback((vgId) => {
    const vg = viewGroups.find(v => v.id === vgId);
    if (!vg?.position) return null;

    return getGridCenter(
      vg.position.row,
      vg.position.col,
      vg.position.rowSpan,
      vg.position.colSpan,
      cellSize,
      renderGap
    );
  }, [viewGroups, cellSize, renderGap]);

  // Collaborators with cursor data for cursor indicators
  const collaboratorsWithCursors = useMemo(() => {
    return collaborators.filter(c => c.isOnline && c.cursor && (c.showCursor ?? true));
  }, [collaborators]);

  return (
    <div
      ref={containerRef}
      className={`minimap ${panning.isDragging ? 'minimap--dragging' : ''} ${panning.canPan ? 'minimap--pannable' : ''} ${isDragOver ? 'minimap--drop-target' : ''}`}
      style={{
        '--cell-size': `${cellSize}px`,
        '--grid-gap': `${renderGap}px`,
        '--header-size': `${headerSize}px`,
        '--scroll-padding': `${MINIMAP_CONSTANTS.SCROLL_PADDING}px`,
      }}
      onDragEnter={(e) => {
        if (!onDropItem) return;
        if (!e.dataTransfer?.types?.includes('application/json')) return;
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!onDropItem) return;
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
      }}
      onDragOver={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        if (!onDropItem || !containerRef.current) return;
        e.preventDefault();
        const payload = e.dataTransfer.getData('application/json');
        if (!payload) return;

        let data;
        try {
          data = JSON.parse(payload);
        } catch (err) {
          console.warn('Invalid drop data:', err);
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const scrollPadding = MINIMAP_CONSTANTS.SCROLL_PADDING;
        const contentX = localX - scrollPadding - labelOffset + panning.panOffset.x;
        const contentY = localY - scrollPadding - labelOffset + panning.panOffset.y;

        if (!Number.isFinite(contentX) || !Number.isFinite(contentY)) return;

        const rawCol = Math.floor(contentX / renderPitch);
        const rawRow = Math.floor(contentY / renderPitch);

        if (rawCol < 0 || rawRow < 0) return;

        const col = clamp(rawCol, 0, Math.max(0, cols - 1));
        const row = clamp(rawRow, 0, Math.max(0, rows - 1));

        onDropItem({ row, col, data });
        setIsDragOver(false);
      }}
      {...panning.panProps}
    >
      {showGridLabels && (
        <div className="minimap__labels">
          <div
            className="minimap__labels-corner"
            style={{
              width: headerSize,
              height: headerSize,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING,
              left: MINIMAP_CONSTANTS.SCROLL_PADDING,
            }}
          />
          <div
            className="minimap__labels-top"
            style={{
              left: MINIMAP_CONSTANTS.SCROLL_PADDING + headerSize,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING,
              width: gridWidth,
            }}
          >
            <div
              className="minimap__labels-top-inner"
              style={{ transform: `translateX(${-panning.panOffset.x}px)` }}
            >
              {Array.from({ length: gridCols }).map((_, col) => {
                const isMajor = (col + 1) % 5 === 0;
                const isActive = col < cols;
                return (
                  <div
                    key={`col-${col}`}
                    className="minimap__col-header"
                    style={{
                      width: cellSize,
                      color: isMajor
                        ? '#f59e0b'
                        : isActive
                          ? 'rgba(148, 163, 184, 0.7)'
                          : 'rgba(71, 85, 105, 0.5)',
                      fontWeight: isMajor ? 600 : 400,
                    }}
                  >
                    {colToLetter(col)}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="minimap__labels-left"
            style={{
              left: MINIMAP_CONSTANTS.SCROLL_PADDING,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING + headerSize,
              height: gridHeight,
            }}
          >
            <div
              className="minimap__labels-left-inner"
              style={{ transform: `translateY(${-panning.panOffset.y}px)` }}
            >
              {Array.from({ length: gridRows }).map((_, row) => {
                const isMajor = (row + 1) % 5 === 0;
                const isActive = row < rows;
                return (
                  <div
                    key={`row-${row}`}
                    className="minimap__row-header"
                    style={{
                      height: cellSize,
                      color: isMajor
                        ? '#f59e0b'
                        : isActive
                          ? 'rgba(148, 163, 184, 0.7)'
                          : 'rgba(71, 85, 105, 0.5)',
                      fontWeight: isMajor ? 600 : 400,
                    }}
                  >
                    {row + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content wrapper */}
      <div
        className="minimap__scroll"
        style={{
          padding: `${MINIMAP_CONSTANTS.SCROLL_PADDING}px`,
          transform: `translate(${-panning.panOffset.x}px, ${-panning.panOffset.y}px)`,
        }}
      >
        {/* Field grid disabled to match spec (cleaner grid) */}
        {/* Link lines (Links mode, VG sub-tab) */}
        {mapMode === MAP_MODES.LINKS && showVGs && (
          <LinkLines
            links={vgLinks}
            getVGCenter={getVGCenter}
            highlightedLinkId={highlightedLinkId}
            onLinkClick={onLinkClick}
            showLabels={showGridLabels}
            labelOffset={headerSize}
          />
        )}

        {/* Grid with labels */}
        <div
          className="minimap__container"
          style={{
            paddingLeft: labelOffset,
            paddingTop: labelOffset,
          }}
        >
          {/* Main grid area */}
          <div className="minimap__grid-area">
            {/* Grid cells */}
            <div
              className="minimap__grid"
              style={{
                width: gridWidth,
                height: gridHeight,
              }}
            >
              <svg
                className="minimap__grid-lines"
                width={gridWidth}
                height={gridHeight}
                viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                {Array.from({ length: gridCols + 1 }).map((_, i) => {
                  const x = i * renderPitch + 0.5;
                  const isMajor = i > 0 && i % majorEvery === 0;
                  return (
                    <line
                      key={`v-${i}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={gridHeight}
                      stroke={isMajor ? majorLineColor : minorLineColor}
                      strokeWidth={isMajor ? 1 : 0.5}
                      strokeOpacity={isMajor ? 0.55 : 0.4}
                    />
                  );
                })}
                {Array.from({ length: gridRows + 1 }).map((_, i) => {
                  const y = i * renderPitch + 0.5;
                  const isMajor = i > 0 && i % majorEvery === 0;
                  return (
                    <line
                      key={`h-${i}`}
                      x1={0}
                      y1={y}
                      x2={gridWidth}
                      y2={y}
                      stroke={isMajor ? majorLineColor : minorLineColor}
                      strokeWidth={isMajor ? 1 : 0.5}
                      strokeOpacity={isMajor ? 0.55 : 0.4}
                    />
                  );
                })}
                <rect
                  x={0.5}
                  y={0.5}
                  width={cols * renderPitch}
                  height={rows * renderPitch}
                  fill="none"
                  stroke={canvasOutlineColor}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              </svg>

              <div className="minimap__grid-content">
                {/* VG Blocks (VG mode, or subtle outlines in VIEW mode) */}
                {showVGs && viewGroups.map(vg => {
                  if (!vg.position) return null;
                  const isSelected = selectedVGId === vg.id;
                  const isGhosted = mapMode === MAP_MODES.LINKS &&
                    highlightedLinkId &&
                    !highlightedLinkVGs.has(vg.id);
                  const isSubtle = showViews && showVGs;

                  return (
                    <VGBlock
                      key={vg.id}
                      vg={vg}
                      cellSize={cellSize}
                      gap={renderGap}
                      isSelected={isSelected}
                      isGhosted={isGhosted}
                      showInternals={mapMode === MAP_MODES.LAYOUT && showInternals}
                      subtle={isSubtle}
                      onClick={() => onVGClick(vg.id)}
                      onDoubleClick={() => onVGDoubleClick(vg.id)}
                    />
                  );
                })}

                {/* View Cells (View mode) */}
                {showViews && flattenedViews.map(view => (
                  <ViewCell
                    key={view.id}
                    view={view}
                    cellSize={cellSize}
                    gap={renderGap}
                    isSelected={selectedVGId === view.vgId}
                    onClick={() => onVGClick(view.vgId)}
                  />
                ))}

                {/* Viewport indicators */}
                {showViewports && (
                  mapMode === MAP_MODES.NAVIGATE ||
                  mapMode === MAP_MODES.LAYOUT ||
                  mapMode === MAP_MODES.TEAM
                ) && viewports.map(vp => (
                  <ViewportIndicator
                    key={vp.id}
                    viewport={vp}
                    cellSize={cellSize}
                    gap={renderGap}
                    isSelected={selectedViewportId === vp.id}
                  />
                ))}

                {/* Collaborator viewport indicators */}
                {showCollaborators && (
                  mapMode === MAP_MODES.NAVIGATE ||
                  mapMode === MAP_MODES.TEAM
                ) && collaborators.filter(c => c.isOnline && c.viewport).map(collab => (
                  <CollaboratorIndicator
                    key={collab.id}
                    collaborator={collab}
                    cellSize={cellSize}
                    gap={renderGap}
                    showName={mapMode === MAP_MODES.TEAM}
                  />
                ))}
              </div>
            </div>

            {/* Cursor indicators (overlaid on grid) */}
            {showCursors && mapMode === MAP_MODES.TEAM && (
              <div className="minimap__cursors">
                {collaboratorsWithCursors.map(collab => (
                  <CursorIndicator
                    key={`cursor-${collab.id}`}
                    collaborator={collab}
                    cellSize={cellSize}
                    gap={renderGap}
                    showName={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edge fades removed to match spec */}

      {/* Panning indicator */}
      {panning.canPan && (
        <div className="minimap__pan-hint">
          <Icon name="move" size={12} />
          Drag to pan
        </div>
      )}
    </div>
  );
});

export default Minimap;
