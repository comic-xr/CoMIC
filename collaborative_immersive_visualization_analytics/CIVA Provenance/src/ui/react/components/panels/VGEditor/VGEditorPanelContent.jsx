/**
 * @file VGEditorPanelContent.jsx
 * @description ViewGroup Editor panel content for editing ViewGroup layouts
 *
 * Features:
 * - Registers with VGEditorContext on mount
 * - Shows grid layout for ViewGroup editing
 * - Handles drag-drop of views into cells
 * - Supports vg-import drag type for importing all views from another VG
 * - Updates context when VG name/color changes
 * - Handles focus for active state switching
 *
 * @example
 * <VGEditorPanelContent
 *   initialVG={viewGroup}
 *   isNewVG={false}
 *   panelId="vg-editor-123"
 *   onClose={handleClose}
 *   onSave={handleSave}
 * />
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useVGEditor } from '@UI/react/context/VGEditorContext';
import { BUILTIN_LAYOUTS, VIEW_TYPES, getLayoutCapacity, getLayoutById } from '../LeftPanel/tabs/LayoutTab/constants/layouts';
import './VGEditorPanel.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LAYOUT = BUILTIN_LAYOUTS[0]; // 'single'

// Quick layouts (first 7 built-in)
const QUICK_LAYOUTS = BUILTIN_LAYOUTS.slice(0, 7);

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Editable name component for ViewGroup
 */
const EditableName = memo(function EditableName({ value, onChange, color }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (editValue.trim() && editValue.trim() !== value) {
      onChange(editValue.trim());
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="vg-editor-panel__name-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        style={{ borderColor: color }}
      />
    );
  }

  return (
    <span
      className="vg-editor-panel__name"
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
});

/**
 * Layout mini preview for quick layout bar
 */
const LayoutMiniButton = memo(function LayoutMiniButton({ layout, isActive, color, onClick }) {
  const capacity = getLayoutCapacity(layout);

  // Simple grid representation
  const renderCells = () => {
    if (layout.merged === 'top') {
      // 1+2 layout
      return (
        <div className="layout-mini-btn__grid layout-mini-btn__grid--merged-top">
          <div className="layout-mini-btn__cell layout-mini-btn__cell--merged" />
          <div className="layout-mini-btn__cell" />
          <div className="layout-mini-btn__cell" />
        </div>
      );
    }
    if (layout.merged === 'right') {
      // 2+1 layout
      return (
        <div className="layout-mini-btn__grid layout-mini-btn__grid--merged-right">
          <div className="layout-mini-btn__cell" />
          <div className="layout-mini-btn__cell layout-mini-btn__cell--merged" />
          <div className="layout-mini-btn__cell" />
        </div>
      );
    }
    return (
      <div
        className="layout-mini-btn__grid"
        style={{
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {Array.from({ length: capacity }, (_, i) => (
          <div key={i} className="layout-mini-btn__cell" />
        ))}
      </div>
    );
  };

  return (
    <button
      type="button"
      className={`layout-mini-btn ${isActive ? 'layout-mini-btn--active' : ''}`}
      onClick={() => onClick(layout)}
      title={layout.name}
      style={{ '--vg-color': color }}
    >
      {renderCells()}
    </button>
  );
});

/**
 * Grid cell component
 */
const GridCell = memo(function GridCell({
  index,
  view,
  isSelected,
  isEmpty,
  color,
  onSelect,
  onDrop,
  onRemoveView,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const viewType = view ? VIEW_TYPES[view.type] : null;

  const handleClick = useCallback(() => {
    onSelect?.(index);
  }, [index, onSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        onDrop?.(index, data);
      } catch (err) {
        console.warn('Invalid drop data:', err);
      }
    },
    [index, onDrop]
  );

  const handleRemove = useCallback(
    (e) => {
      e.stopPropagation();
      onRemoveView?.(index);
    },
    [index, onRemoveView]
  );

  return (
    <div
      className={`vg-editor-panel__cell ${isSelected ? 'vg-editor-panel__cell--selected' : ''} ${isEmpty ? 'vg-editor-panel__cell--empty' : ''} ${isDragOver ? 'vg-editor-panel__cell--drag-over' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        '--view-color': viewType?.color || 'transparent',
        '--vg-color': color,
      }}
    >
      {view ? (
        <>
          <div className="vg-editor-panel__cell-icon">
            <Icon name={viewType?.icon || 'box'} size={24} />
          </div>
          <span className="vg-editor-panel__cell-name">{view.name}</span>
          {view.datasetName && (
            <span className="vg-editor-panel__cell-dataset">{view.datasetName}</span>
          )}
          <button
            type="button"
            className="vg-editor-panel__cell-remove"
            onClick={handleRemove}
            title="Remove view"
          >
            <Icon name="x" size={12} />
          </button>
        </>
      ) : (
        <>
          <Icon name="plus" size={20} className="vg-editor-panel__cell-plus" />
          <span className="vg-editor-panel__cell-label">Drop view here</span>
        </>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="vg-editor-panel__cell-check">
          <Icon name="check" size={12} />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * VGEditorPanelContent - ViewGroup editor panel content
 *
 * @param {Object} props
 * @param {Object} props.initialVG - Initial ViewGroup data
 * @param {boolean} [props.isNewVG] - Whether this is a new unsaved VG
 * @param {string} [props.panelId] - Panel ID for context registration
 * @param {Function} props.onClose - Close handler
 * @param {Function} [props.onSave] - Save handler
 * @param {Function} [props.onDelete] - Delete handler
 */
export const VGEditorPanelContent = memo(function VGEditorPanelContent({
  initialVG,
  isNewVG = false,
  panelId,
  onClose,
  onSave,
  onDelete,
}) {
  // State
  const [viewGroup, setViewGroup] = useState(() => ({
    id: initialVG?.id || `vg-${Date.now()}`,
    name: initialVG?.name || 'New ViewGroup',
    color: initialVG?.color || '#a855f7',
    layoutId: initialVG?.layoutId || 'single',
    views: initialVG?.views || [],
  }));
  const [selectedCells, setSelectedCells] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Context
  const editorContext = useVGEditor();
  const editorPanelId = panelId || `vg-editor-${viewGroup.id}`;

  // Get current layout
  const layout = getLayoutById(viewGroup.layoutId) || DEFAULT_LAYOUT;
  const capacity = getLayoutCapacity(layout);

  // Register with context on mount
  useEffect(() => {
    if (editorContext) {
      editorContext.registerEditor(editorPanelId, {
        id: viewGroup.id,
        name: viewGroup.name,
        color: viewGroup.color,
        isNew: isNewVG,
      });
      return () => editorContext.unregisterEditor(editorPanelId);
    }
  }, [editorPanelId]); // Only run on mount/unmount

  // Update context when VG changes
  useEffect(() => {
    if (editorContext) {
      editorContext.updateEditor(editorPanelId, {
        vgName: viewGroup.name,
        vgColor: viewGroup.color,
      });
    }
  }, [viewGroup.name, viewGroup.color, editorPanelId, editorContext]);

  // Handle panel focus for active state
  const handlePanelFocus = useCallback(() => {
    if (editorContext) {
      editorContext.setActive(editorPanelId);
    }
  }, [editorContext, editorPanelId]);

  // Handle name change
  const handleNameChange = useCallback((newName) => {
    setViewGroup((prev) => ({ ...prev, name: newName }));
    setHasChanges(true);
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout) => {
    const newCapacity = getLayoutCapacity(newLayout);
    const currentViewCount = viewGroup.views.length;

    if (currentViewCount > newCapacity) {
      // Truncate views to fit new layout
      setViewGroup((prev) => ({
        ...prev,
        layoutId: newLayout.id,
        views: prev.views.slice(0, newCapacity),
      }));
    } else {
      setViewGroup((prev) => ({
        ...prev,
        layoutId: newLayout.id,
      }));
    }
    setSelectedCells([]);
    setHasChanges(true);
  }, [viewGroup.views.length]);

  // Handle cell selection
  const handleCellSelect = useCallback((index) => {
    setSelectedCells((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  // Handle drop into cell
  const handleCellDrop = useCallback(
    (cellIndex, data) => {
      if (data.type === 'vg-import') {
        // Import all views from another VG
        const availableSlots = [];
        for (let i = 0; i < capacity; i++) {
          if (!viewGroup.views[i]) availableSlots.push(i);
        }

        const viewsToAdd = (data.views || []).slice(0, availableSlots.length);
        const newViews = [...viewGroup.views];

        viewsToAdd.forEach((view, i) => {
          newViews[availableSlots[i]] = {
            ...view,
            sourceVgId: data.vgId,
            sourceVgName: data.vgName,
          };
        });

        setViewGroup((prev) => ({ ...prev, views: newViews }));
        setHasChanges(true);
      } else if (data.view) {
        // Single view drop
        const newViews = [...viewGroup.views];
        newViews[cellIndex] = {
          id: data.view.id,
          name: data.view.name,
          type: data.view.type,
          datasetId: data.datasetId,
          datasetName: data.datasetName,
          sourceVgId: data.sourceVgId,
          sourceVgName: data.sourceVgName,
        };
        setViewGroup((prev) => ({ ...prev, views: newViews }));
        setHasChanges(true);
      }
    },
    [viewGroup.views, capacity]
  );

  // Handle remove view from cell
  const handleRemoveView = useCallback((cellIndex) => {
    const newViews = [...viewGroup.views];
    delete newViews[cellIndex];
    // Compact array to remove holes
    const compacted = newViews.filter(Boolean);
    setViewGroup((prev) => ({ ...prev, views: compacted }));
    setHasChanges(true);
  }, [viewGroup.views]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(viewGroup);
    setHasChanges(false);
  }, [viewGroup, onSave]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasChanges) {
      // Could show confirmation dialog here
      // For now, just close
    }
    onClose?.();
  }, [hasChanges, onClose]);

  // Render grid
  const renderGrid = () => {
    // Handle merged layouts
    if (layout.merged === 'top') {
      return (
        <div className="vg-editor-panel__grid vg-editor-panel__grid--merged-top">
          <div className="vg-editor-panel__grid-merged-top">
            <GridCell
              index={0}
              view={viewGroup.views[0]}
              isSelected={selectedCells.includes(0)}
              isEmpty={!viewGroup.views[0]}
              color={viewGroup.color}
              onSelect={handleCellSelect}
              onDrop={handleCellDrop}
              onRemoveView={handleRemoveView}
            />
          </div>
          <GridCell
            index={1}
            view={viewGroup.views[1]}
            isSelected={selectedCells.includes(1)}
            isEmpty={!viewGroup.views[1]}
            color={viewGroup.color}
            onSelect={handleCellSelect}
            onDrop={handleCellDrop}
            onRemoveView={handleRemoveView}
          />
          <GridCell
            index={2}
            view={viewGroup.views[2]}
            isSelected={selectedCells.includes(2)}
            isEmpty={!viewGroup.views[2]}
            color={viewGroup.color}
            onSelect={handleCellSelect}
            onDrop={handleCellDrop}
            onRemoveView={handleRemoveView}
          />
        </div>
      );
    }

    if (layout.merged === 'right') {
      return (
        <div className="vg-editor-panel__grid vg-editor-panel__grid--merged-right">
          <GridCell
            index={0}
            view={viewGroup.views[0]}
            isSelected={selectedCells.includes(0)}
            isEmpty={!viewGroup.views[0]}
            color={viewGroup.color}
            onSelect={handleCellSelect}
            onDrop={handleCellDrop}
            onRemoveView={handleRemoveView}
          />
          <div className="vg-editor-panel__grid-merged-right">
            <GridCell
              index={1}
              view={viewGroup.views[1]}
              isSelected={selectedCells.includes(1)}
              isEmpty={!viewGroup.views[1]}
              color={viewGroup.color}
              onSelect={handleCellSelect}
              onDrop={handleCellDrop}
              onRemoveView={handleRemoveView}
            />
          </div>
          <GridCell
            index={2}
            view={viewGroup.views[2]}
            isSelected={selectedCells.includes(2)}
            isEmpty={!viewGroup.views[2]}
            color={viewGroup.color}
            onSelect={handleCellSelect}
            onDrop={handleCellDrop}
            onRemoveView={handleRemoveView}
          />
        </div>
      );
    }

    // Standard grid
    return (
      <div
        className="vg-editor-panel__grid"
        style={{
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {Array.from({ length: capacity }, (_, i) => (
          <GridCell
            key={i}
            index={i}
            view={viewGroup.views[i]}
            isSelected={selectedCells.includes(i)}
            isEmpty={!viewGroup.views[i]}
            color={viewGroup.color}
            onSelect={handleCellSelect}
            onDrop={handleCellDrop}
            onRemoveView={handleRemoveView}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className="vg-editor-panel"
      style={{ '--vg-color': viewGroup.color }}
      onMouseDown={handlePanelFocus}
    >
      {/* Header */}
      <div className="vg-editor-panel__header">
        <div
          className="vg-editor-panel__color-dot"
          style={{ background: viewGroup.color }}
        />
        <EditableName
          value={viewGroup.name}
          onChange={handleNameChange}
          color={viewGroup.color}
        />
        {isNewVG && (
          <span className="vg-editor-panel__badge vg-editor-panel__badge--new">
            New
          </span>
        )}
        {hasChanges && (
          <span className="vg-editor-panel__badge vg-editor-panel__badge--unsaved">
            Unsaved
          </span>
        )}
        <div className="vg-editor-panel__header-spacer" />
        <span className="vg-editor-panel__meta">
          {layout.name} &bull; {viewGroup.views.filter(Boolean).length}/{capacity} views
        </span>
      </div>

      {/* Layout bar */}
      <div className="vg-editor-panel__layout-bar">
        <span className="vg-editor-panel__layout-label">Layout:</span>
        <div className="vg-editor-panel__quick-layouts">
          {QUICK_LAYOUTS.map((l) => (
            <LayoutMiniButton
              key={l.id}
              layout={l}
              isActive={layout.id === l.id}
              color={viewGroup.color}
              onClick={handleLayoutChange}
            />
          ))}
        </div>
      </div>

      {/* Grid area */}
      <div className="vg-editor-panel__content">
        {renderGrid()}

        {/* Drop hint */}
        <p className="vg-editor-panel__drop-hint">
          Drag views from the companion panel to fill cells
        </p>
      </div>

      {/* Footer */}
      <div className="vg-editor-panel__footer">
        {onDelete && !isNewVG && (
          <button
            type="button"
            className="vg-editor-panel__btn vg-editor-panel__btn--danger"
            onClick={() => onDelete(viewGroup.id)}
          >
            <Icon name="trash2" size={14} />
            Delete
          </button>
        )}
        <div className="vg-editor-panel__footer-spacer" />
        <button
          type="button"
          className="vg-editor-panel__btn vg-editor-panel__btn--secondary"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="vg-editor-panel__btn vg-editor-panel__btn--primary"
          onClick={handleSave}
          disabled={!hasChanges && !isNewVG}
        >
          <Icon name="check" size={14} />
          {isNewVG ? 'Create' : 'Save'}
        </button>
      </div>
    </div>
  );
});

export default VGEditorPanelContent;
