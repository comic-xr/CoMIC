/**
 * @file LayersAndWidgets.jsx
 * @description Layers and Widgets section with drag-and-drop reordering
 */

import React, { useState, memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { MiniSlider } from '../shared/MiniSlider';
import { LAYER_TYPES, WIDGET_TYPES } from '../../constants';

/**
 * LayerItem - Draggable layer item
 */
const LayerItem = memo(function LayerItem({
  layer,
  index,
  state,
  onVisibilityToggle,
  onOpacityChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}) {
  const typeConfig = LAYER_TYPES[layer.type] || LAYER_TYPES.data;

  return (
    <div
      className={`layer-item ${isDragging ? 'layer-item--dragging' : ''} ${isDragOver ? 'layer-item--drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, layer.id)}
      onDragOver={(e) => onDragOver(e, layer.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, layer.id)}
      onDragEnd={onDragEnd}
    >
      <div className="layer-item__drag-handle">
        <Icon name="gripVertical" size={10} />
      </div>
      <div className="layer-item__index">{index + 1}</div>
      <button
        className={`layer-item__visibility ${state.visible ? 'layer-item__visibility--visible' : ''}`}
        onClick={() => onVisibilityToggle(layer.id)}
      >
        <Icon name={state.visible ? 'eye' : 'eyeOff'} size={12} />
      </button>
      <span
        className="layer-item__type-dot"
        style={{ '--type-color': `var(--color-accent-${typeConfig.color})` }}
      />
      <span className="layer-item__name">{layer.name}</span>
      <MiniSlider
        value={state.opacity}
        onChange={(val) => onOpacityChange(layer.id, val)}
        color={`var(--color-accent-${typeConfig.color})`}
      />
    </div>
  );
});

/**
 * WidgetItem - Widget item with value display
 */
const WidgetItem = memo(function WidgetItem({
  widget,
  state,
  onVisibilityToggle,
  onOpacityChange,
  onDelete,
  onCopyValue,
  isCopied,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) {
  const typeConfig = WIDGET_TYPES[widget.type] || WIDGET_TYPES.point;

  return (
    <div className="widget-item">
      <button
        className={`widget-item__visibility ${state.visible ? 'widget-item__visibility--visible' : ''}`}
        onClick={() => onVisibilityToggle(widget.id)}
      >
        <Icon name={state.visible ? 'eye' : 'eyeOff'} size={12} />
      </button>
      <Icon name={typeConfig.icon} size={12} className="widget-item__type-icon" />
      <span className="widget-item__name">{widget.name}</span>

      {widget.value && state.visible && (
        <div
          className="widget-item__value-container"
          onMouseEnter={() => onMouseEnter(widget.id)}
          onMouseLeave={onMouseLeave}
        >
          <button
            className={`widget-item__value ${isCopied ? 'widget-item__value--copied' : ''}`}
            onClick={() => onCopyValue(widget)}
          >
            {isCopied ? '✓ Copied' : widget.value}
          </button>

          {/* Hover Popover */}
          {isHovered && !isCopied && widget.details && (
            <div className="widget-item__popover">
              <div className="widget-item__popover-value">{widget.value}</div>
              {Object.entries(widget.details).map(([key, val]) => (
                <div key={key} className="widget-item__popover-detail">
                  <span className="widget-item__popover-key">{key}:</span>
                  <span className="widget-item__popover-val">{val}</span>
                </div>
              ))}
              <div className="widget-item__popover-hint">Click to copy</div>
            </div>
          )}
        </div>
      )}

      <MiniSlider
        value={state.opacity}
        onChange={(val) => onOpacityChange(widget.id, val)}
        color="var(--color-accent-amber)"
      />

      <button
        className="widget-item__delete"
        onClick={() => onDelete(widget.id)}
        title="Delete"
      >
        <Icon name="trash" size={10} />
      </button>
    </div>
  );
});

/**
 * LayersAndWidgets - Container for layers and widgets
 */
export const LayersAndWidgets = memo(function LayersAndWidgets({
  layers = [],
  widgets = [],
  expanded,
  onToggleExpanded,
  onLayerVisibilityToggle,
  onLayerOpacityChange,
  onLayerReorder,
  onWidgetVisibilityToggle,
  onWidgetOpacityChange,
  onWidgetDelete,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [hoveredWidgetId, setHoveredWidgetId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Layer states (visibility and opacity)
  const layerStates = layers.reduce((acc, layer) => {
    acc[layer.id] = { visible: layer.visible, opacity: layer.opacity };
    return acc;
  }, {});

  // Widget states
  const widgetStates = widgets.reduce((acc, widget) => {
    acc[widget.id] = { visible: widget.visible, opacity: widget.opacity };
    return acc;
  }, {});

  const visibleCount = layers.filter(l => l.visible).length + widgets.filter(w => w.visible).length;

  // Drag handlers
  const handleDragStart = useCallback((e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    if (draggedId && targetId && draggedId !== targetId) {
      onLayerReorder?.(draggedId, targetId);
    }
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, onLayerReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // Widget copy handler
  const handleCopyValue = useCallback((widget) => {
    navigator.clipboard?.writeText(widget.value);
    setCopiedId(widget.id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  return (
    <div className="layers-and-widgets">
      {/* Resize Handle */}
      <div className="layers-and-widgets__resize-handle">
        <div className="layers-and-widgets__resize-bar" />
      </div>

      {/* Header */}
      <div
        className={`layers-and-widgets__header ${expanded ? 'layers-and-widgets__header--expanded' : ''}`}
        onClick={onToggleExpanded}
      >
        <Icon
          name="chevronDown"
          size={10}
          className={`layers-and-widgets__chevron ${expanded ? '' : 'layers-and-widgets__chevron--collapsed'}`}
        />
        <span className="layers-and-widgets__title">LAYERS & WIDGETS</span>
        <span className="layers-and-widgets__count">{visibleCount} visible</span>
        <div className="layers-and-widgets__spacer" />
        <button
          className="layers-and-widgets__add"
          onClick={(e) => { e.stopPropagation(); }}
          title="Add Overlay"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="layers-and-widgets__content">
          {/* Data Layers */}
          {layers.length > 0 && (
            <div className="layers-and-widgets__section">
              <div className="layers-and-widgets__section-header">
                DATA LAYERS <span className="layers-and-widgets__drag-hint">(drag to reorder)</span>
              </div>
              {layers.map((layer, index) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  index={index}
                  state={layerStates[layer.id]}
                  onVisibilityToggle={onLayerVisibilityToggle}
                  onOpacityChange={onLayerOpacityChange}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedId === layer.id}
                  isDragOver={dragOverId === layer.id}
                />
              ))}
            </div>
          )}

          {/* Measurement Widgets */}
          {widgets.length > 0 && (
            <div className="layers-and-widgets__section">
              <div className="layers-and-widgets__section-header">MEASUREMENT WIDGETS</div>
              {widgets.map(widget => (
                <WidgetItem
                  key={widget.id}
                  widget={widget}
                  state={widgetStates[widget.id]}
                  onVisibilityToggle={onWidgetVisibilityToggle}
                  onOpacityChange={onWidgetOpacityChange}
                  onDelete={onWidgetDelete}
                  onCopyValue={handleCopyValue}
                  isCopied={copiedId === widget.id}
                  isHovered={hoveredWidgetId === widget.id}
                  onMouseEnter={setHoveredWidgetId}
                  onMouseLeave={() => setHoveredWidgetId(null)}
                />
              ))}
            </div>
          )}

          {layers.length === 0 && widgets.length === 0 && (
            <div className="layers-and-widgets__empty">
              <Icon name="layers" size={20} />
              <span>No layers or widgets</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default LayersAndWidgets;
