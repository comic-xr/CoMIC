/**
 * @file AnnotationsTab.jsx
 * @description Annotations tab with scope toggle, tool palette, and annotation list
 *
 * Features:
 * - Scope toggle (Instance vs Workspace)
 * - Annotation creation tools (Text, Marker, Arrow, Region, Freehand, Callout)
 * - Color picker for annotations
 * - List with multi-select and bulk actions
 * - Filter by scope/author
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
  ANNOTATION_TOOLS,
  ANNOTATION_COLORS,
  ANNOTATION_SCOPES,
  ANNOTATION_FILTERS,
} from '../../constants';

// =============================================================================
// SCOPE TOGGLE
// =============================================================================

const ScopeToggle = memo(function ScopeToggle({ scope, onChange }) {
  return (
    <div className="annotations-tab__scope-toggle">
      <button
        className={`annotations-tab__scope-btn ${scope === 'instance' ? 'annotations-tab__scope-btn--active' : ''}`}
        data-scope="instance"
        onClick={() => onChange('instance')}
        title="Annotations visible only in this view"
      >
        <Icon name="image" size={11} />
        <span>This View</span>
      </button>
      <button
        className={`annotations-tab__scope-btn ${scope === 'workspace' ? 'annotations-tab__scope-btn--active' : ''}`}
        data-scope="workspace"
        onClick={() => onChange('workspace')}
        title="Annotations shared across workspace"
      >
        <Icon name="users" size={11} />
        <span>Workspace</span>
      </button>
    </div>
  );
});

// =============================================================================
// TOOL PALETTE
// =============================================================================

const ToolPalette = memo(function ToolPalette({
  selectedTool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  scope,
}) {
  return (
    <div className="annotations-tab__palette">
      {/* Scope indicator */}
      <div className={`annotations-tab__scope-indicator annotations-tab__scope-indicator--${scope}`}>
        <Icon name={scope === 'workspace' ? 'users' : 'image'} size={10} />
        <span>
          New annotations will be {scope === 'workspace' ? 'shared with workspace' : 'visible only in this view'}
        </span>
      </div>

      {/* Tool Grid */}
      <div className="annotations-tab__tool-grid">
        {ANNOTATION_TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`annotations-tab__tool-btn ${selectedTool === tool.id ? 'annotations-tab__tool-btn--active' : ''}`}
            onClick={() => onSelectTool(selectedTool === tool.id ? null : tool.id)}
            title={`${tool.name} (${tool.shortcut})\n${tool.description}`}
          >
            <Icon name={tool.icon} size={16} />
            <span>{tool.name}</span>
          </button>
        ))}
      </div>

      {/* Color Picker Row */}
      <div className="annotations-tab__color-row">
        <span className="annotations-tab__color-label">Color:</span>
        <div className="annotations-tab__colors">
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              className={`annotations-tab__color-swatch ${selectedColor === color ? 'annotations-tab__color-swatch--active' : ''}`}
              style={{ '--swatch-color': color }}
              onClick={() => onSelectColor(color)}
            />
          ))}
        </div>
      </div>

      {/* Active Tool Instructions */}
      {selectedTool && (
        <div className="annotations-tab__instructions">
          <div className="annotations-tab__instructions-header">
            <Icon name={ANNOTATION_TOOLS.find((t) => t.id === selectedTool)?.icon} size={12} />
            <span className="annotations-tab__instructions-name">
              {ANNOTATION_TOOLS.find((t) => t.id === selectedTool)?.name}
            </span>
            <span className="annotations-tab__instructions-hint">Press Esc to cancel</span>
          </div>
          <div className="annotations-tab__instructions-text">
            {ANNOTATION_TOOLS.find((t) => t.id === selectedTool)?.instructions}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// ANNOTATION ITEM
// =============================================================================

const AnnotationItem = memo(function AnnotationItem({
  item,
  isSelected,
  onToggleSelect,
  onToggleVisible,
  onToggleLock,
  onEdit,
  onDelete,
  onColorChange,
  currentUserId = 'user-1',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isOwner = item.authorId === currentUserId;
  const tool = ANNOTATION_TOOLS.find((t) => t.id === item.type);

  const handleSave = useCallback(() => {
    onEdit(editText);
    setIsEditing(false);
  }, [editText, onEdit]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
        setEditText(item.text);
        setIsEditing(false);
      }
    },
    [handleSave, item.text]
  );

  return (
    <div
      className={`annotation-item ${isSelected ? 'annotation-item--selected' : ''} ${item.locked ? 'annotation-item--locked' : ''} ${!item.visible ? 'annotation-item--hidden' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowColorPicker(false);
      }}
    >
      {/* Checkbox */}
      <button
        className={`annotation-item__checkbox ${isSelected ? 'annotation-item__checkbox--checked' : ''}`}
        onClick={onToggleSelect}
      >
        {isSelected && <Icon name="check" size={10} />}
      </button>

      {/* Visibility */}
      <button
        className={`annotation-item__visibility ${item.visible ? 'annotation-item__visibility--visible' : ''}`}
        onClick={onToggleVisible}
        title={item.visible ? 'Hide' : 'Show'}
      >
        <Icon name={item.visible ? 'eye' : 'eyeOff'} size={12} />
      </button>

      {/* Lock */}
      <button
        className={`annotation-item__lock ${item.locked ? 'annotation-item__lock--locked' : ''}`}
        onClick={onToggleLock}
        disabled={!isOwner}
        title={!isOwner ? 'Only the author can lock/unlock' : item.locked ? 'Unlock' : 'Lock'}
      >
        <Icon name={item.locked ? 'lock' : 'unlock'} size={10} />
      </button>

      {/* Color indicator */}
      <div className="annotation-item__color-wrapper">
        <button
          className="annotation-item__color"
          style={{ '--annotation-color': item.color }}
          onClick={() => !item.locked && isOwner && setShowColorPicker(!showColorPicker)}
          disabled={item.locked || !isOwner}
        />
        {showColorPicker && (
          <div className="annotation-item__color-picker">
            {ANNOTATION_COLORS.map((color) => (
              <button
                key={color}
                className={`annotation-item__color-option ${item.color === color ? 'annotation-item__color-option--active' : ''}`}
                style={{ '--swatch-color': color }}
                onClick={() => {
                  onColorChange(color);
                  setShowColorPicker(false);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Type Icon */}
      <Icon name={tool?.icon || 'circle'} size={11} className="annotation-item__type-icon" />

      {/* Content */}
      <div className="annotation-item__content">
        {isEditing ? (
          <div className="annotation-item__edit-row">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="annotation-item__edit-input"
            />
            <button className="annotation-item__edit-save" onClick={handleSave}>
              <Icon name="check" size={10} />
            </button>
          </div>
        ) : (
          <>
            <div
              className="annotation-item__text"
              onDoubleClick={() => isOwner && !item.locked && setIsEditing(true)}
            >
              {item.text}
            </div>
            <div className="annotation-item__meta">
              <span className={`annotation-item__scope annotation-item__scope--${item.scope}`}>
                <Icon name={item.scope === 'workspace' ? 'users' : 'image'} size={8} />
              </span>
              <span className="annotation-item__author">
                {item.author} • {item.timestamp}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Actions (on hover) */}
      <div className={`annotation-item__actions ${isHovered ? 'annotation-item__actions--visible' : ''}`}>
        <button
          className="annotation-item__action annotation-item__action--edit"
          onClick={() => !item.locked && isOwner && setIsEditing(true)}
          disabled={item.locked || !isOwner}
          title={!isOwner ? 'Only author can edit' : item.locked ? 'Unlock to edit' : 'Edit'}
        >
          <Icon name="edit" size={10} />
        </button>
        <button
          className="annotation-item__action annotation-item__action--delete"
          onClick={() => !item.locked && isOwner && onDelete()}
          disabled={item.locked || !isOwner}
          title={!isOwner ? 'Only author can delete' : item.locked ? 'Unlock to delete' : 'Delete'}
        >
          <Icon name="trash" size={10} />
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// FILTER BAR
// =============================================================================

const FilterBar = memo(function FilterBar({ filter, onFilterChange, annotationCount }) {
  return (
    <div className="annotations-tab__filter-bar">
      <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="annotations-tab__filter-select"
      >
        {ANNOTATION_FILTERS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label} ({annotationCount[opt.id] || 0})
          </option>
        ))}
      </select>
      <div className="annotations-tab__filter-spacer" />
      <span className="annotations-tab__visible-count">{annotationCount.visible || 0} visible</span>
    </div>
  );
});

// =============================================================================
// BULK ACTIONS BAR
// =============================================================================

const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  onShow,
  onHide,
  onDelete,
  onClearSelection,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="annotations-tab__bulk-bar">
      <span className="annotations-tab__bulk-count">{selectedCount} selected</span>
      <div className="annotations-tab__bulk-spacer" />
      <button className="annotations-tab__bulk-btn" onClick={onShow}>
        Show
      </button>
      <button className="annotations-tab__bulk-btn" onClick={onHide}>
        Hide
      </button>
      <button className="annotations-tab__bulk-btn annotations-tab__bulk-btn--delete" onClick={onDelete}>
        Delete
      </button>
      <button className="annotations-tab__bulk-clear" onClick={onClearSelection}>
        <Icon name="x" size={10} />
      </button>
    </div>
  );
});

// =============================================================================
// EMPTY STATE
// =============================================================================

const EmptyState = memo(function EmptyState() {
  return (
    <div className="annotations-tab__empty">
      <Icon name="edit" size={24} />
      <div className="annotations-tab__empty-title">No annotations yet</div>
      <div className="annotations-tab__empty-hint">Select a tool above to create one</div>
    </div>
  );
});

// =============================================================================
// KEYBOARD SHORTCUTS FOOTER
// =============================================================================

const KeyboardShortcutsFooter = memo(function KeyboardShortcutsFooter() {
  return (
    <div className="annotations-tab__shortcuts">
      <span>T/M/W/R/D/C = Tools</span>
      <span>H = Hide</span>
      <span>Del = Delete</span>
    </div>
  );
});

// =============================================================================
// MAIN ANNOTATIONS TAB
// =============================================================================

/**
 * AnnotationsTab - Full annotation management interface
 */
export const AnnotationsTab = memo(function AnnotationsTab({
  annotations = [],
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onBulkUpdate,
  onBulkDelete,
  currentUserId = 'user-1',
}) {
  // Local state
  const [scope, setScope] = useState('workspace');
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState('all');

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      if (filter === 'workspace') return a.scope === 'workspace';
      if (filter === 'instance') return a.scope === 'instance';
      if (filter === 'mine') return a.authorId === currentUserId;
      return true;
    });
  }, [annotations, filter, currentUserId]);

  // Counts
  const annotationCount = useMemo(
    () => ({
      all: annotations.length,
      workspace: annotations.filter((a) => a.scope === 'workspace').length,
      instance: annotations.filter((a) => a.scope === 'instance').length,
      mine: annotations.filter((a) => a.authorId === currentUserId).length,
      visible: annotations.filter((a) => a.visible).length,
    }),
    [annotations, currentUserId]
  );

  // Handlers
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleToggleVisible = useCallback(
    (id) => {
      const annotation = annotations.find((a) => a.id === id);
      if (annotation) {
        onUpdateAnnotation?.(id, { visible: !annotation.visible });
      }
    },
    [annotations, onUpdateAnnotation]
  );

  const handleToggleLock = useCallback(
    (id) => {
      const annotation = annotations.find((a) => a.id === id);
      if (annotation) {
        onUpdateAnnotation?.(id, { locked: !annotation.locked });
      }
    },
    [annotations, onUpdateAnnotation]
  );

  const handleEdit = useCallback(
    (id, text) => {
      onUpdateAnnotation?.(id, { text });
    },
    [onUpdateAnnotation]
  );

  const handleColorChange = useCallback(
    (id, color) => {
      onUpdateAnnotation?.(id, { color });
    },
    [onUpdateAnnotation]
  );

  const handleDelete = useCallback(
    (id) => {
      onDeleteAnnotation?.(id);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
    [onDeleteAnnotation]
  );

  // Bulk actions
  const handleBulkShow = useCallback(() => {
    onBulkUpdate?.(Array.from(selectedIds), { visible: true });
  }, [selectedIds, onBulkUpdate]);

  const handleBulkHide = useCallback(() => {
    onBulkUpdate?.(Array.from(selectedIds), { visible: false });
  }, [selectedIds, onBulkUpdate]);

  const handleBulkDelete = useCallback(() => {
    const ownedIds = Array.from(selectedIds).filter((id) => {
      const annotation = annotations.find((a) => a.id === id);
      return annotation && annotation.authorId === currentUserId && !annotation.locked;
    });
    onBulkDelete?.(ownedIds);
    setSelectedIds(new Set());
  }, [selectedIds, annotations, currentUserId, onBulkDelete]);

  const handleToolSelect = useCallback(
    (toolId) => {
      setSelectedTool(toolId);
      if (toolId && onCreateAnnotation) {
        // Notify parent that a tool is selected (for canvas interaction)
        onCreateAnnotation({ type: toolId, color: selectedColor, scope });
      }
    },
    [selectedColor, scope, onCreateAnnotation]
  );

  return (
    <div className="annotations-tab">
      {/* Scope Toggle */}
      <div className="annotations-tab__header">
        <ScopeToggle scope={scope} onChange={setScope} />
      </div>

      {/* Tool Palette */}
      <div className="annotations-tab__tools">
        <ToolPalette
          selectedTool={selectedTool}
          onSelectTool={handleToolSelect}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          scope={scope}
        />
      </div>

      {/* Divider */}
      <div className="annotations-tab__divider" />

      {/* Annotation List */}
      <div className="annotations-tab__list-section">
        <div className="annotations-tab__list-header">
          <FilterBar filter={filter} onFilterChange={setFilter} annotationCount={annotationCount} />

          <BulkActionsBar
            selectedCount={selectedIds.size}
            onShow={handleBulkShow}
            onHide={handleBulkHide}
            onDelete={handleBulkDelete}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>

        <div className="annotations-tab__list">
          {filteredAnnotations.length === 0 ? (
            <EmptyState />
          ) : (
            filteredAnnotations.map((annotation) => (
              <AnnotationItem
                key={annotation.id}
                item={annotation}
                isSelected={selectedIds.has(annotation.id)}
                onToggleSelect={() => toggleSelect(annotation.id)}
                onToggleVisible={() => handleToggleVisible(annotation.id)}
                onToggleLock={() => handleToggleLock(annotation.id)}
                onEdit={(text) => handleEdit(annotation.id, text)}
                onDelete={() => handleDelete(annotation.id)}
                onColorChange={(color) => handleColorChange(annotation.id, color)}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsFooter />
    </div>
  );
});

export default AnnotationsTab;
