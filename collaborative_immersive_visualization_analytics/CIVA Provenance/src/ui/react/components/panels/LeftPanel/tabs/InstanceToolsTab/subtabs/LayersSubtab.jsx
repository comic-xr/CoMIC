// LayersSubtab.jsx
// Enhanced Layers visibility subtab for InstanceToolsTab
//
// Per spec: Visibility and opacity control for data geometry, annotations, widgets, cursors, etc.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Icon, IconButton, Toggle, Slider } from '@UI/react/components/atoms';
import { SectionNavGroup } from '@UI/react/components/organisms';
import { workspaceManager } from '@Core/instances/workspaceManager.js';

// =============================================================================
// LAYER DEFINITIONS
// =============================================================================

const LAYER_DEFINITIONS = {
    geometry: {
        id: 'geometry',
        icon: 'box',
        label: 'Data Geometry',
        description: 'Primary data visualization',
        color: 'blue',
        hasOpacity: true,
        defaultOpacity: 1.0,
    },
    annotations: {
        id: 'annotations',
        icon: 'mapPin',
        label: 'Annotations',
        description: 'Markers and notes',
        color: 'pink',
        hasOpacity: true,
        defaultOpacity: 1.0,
    },
    widgets: {
        id: 'widgets',
        icon: 'ruler',
        label: 'Widgets',
        description: 'Measurement and manipulation tools',
        color: 'amber',
        hasOpacity: false,
    },
    cursors: {
        id: 'cursors',
        icon: 'users',
        label: 'Remote Cursors',
        description: 'Collaborator pointers',
        color: 'green',
        hasOpacity: false,
    },
    axes: {
        id: 'axes',
        icon: 'move',
        label: 'Axes & Orientation',
        description: 'Coordinate axes and cube',
        color: 'purple',
        hasOpacity: false,
    },
    grid: {
        id: 'grid',
        icon: 'grid',
        label: 'Grid',
        description: 'Background grid',
        color: 'gray',
        hasOpacity: true,
        defaultOpacity: 0.5,
    },
};

// =============================================================================
// LAYER ITEM COMPONENT
// =============================================================================

function LayerItem({ layer, state, onToggle, onOpacityChange, onExpand }) {
    const [expanded, setExpanded] = useState(false);
    const definition = LAYER_DEFINITIONS[layer] || {};
    const isEnabled = state?.enabled ?? true;
    const opacity = state?.opacity ?? definition.defaultOpacity ?? 1.0;
    const count = state?.count;
    const total = state?.total;

    const handleToggle = () => {
        onToggle?.(layer, !isEnabled);
    };

    const handleOpacityChange = (value) => {
        onOpacityChange?.(layer, value);
    };

    return (
        <div className={`layer-item ${isEnabled ? 'layer-item--enabled' : 'layer-item--disabled'}`}>
            <div className="layer-item__row">
                <IconButton
                    icon={isEnabled ? 'eye' : 'eyeOff'}
                    onClick={handleToggle}
                    active={isEnabled}
                    size="sm"
                    variant="ghost"
                    tooltip={isEnabled ? 'Hide layer' : 'Show layer'}
                />

                <div className="layer-item__info">
                    <div className="layer-item__header">
                        <Icon name={definition.icon || 'layers'} size={14} className={`icon-${definition.color}`} />
                        <span className="layer-item__label">{definition.label}</span>
                    </div>
                    {count !== undefined && (
                        <span className="layer-item__count">
                            {count} / {total || count}
                        </span>
                    )}
                </div>

                {definition.hasOpacity && (
                    <IconButton
                        icon={expanded ? 'chevronUp' : 'chevronDown'}
                        onClick={() => setExpanded(!expanded)}
                        size="sm"
                        variant="ghost"
                        tooltip="Opacity settings"
                    />
                )}
            </div>

            {/* Opacity controls when expanded */}
            {expanded && definition.hasOpacity && (
                <div className="layer-item__opacity">
                    <div className="layer-item__opacity-header">
                        <Icon name="circle" size={10} />
                        <span>Opacity</span>
                        <span className="layer-item__opacity-value">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        className="layer-item__opacity-slider"
                        min={0}
                        max={1}
                        step={0.01}
                        value={opacity}
                        onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                        disabled={!isEnabled}
                    />
                    <div className="layer-item__opacity-presets">
                        {[0.25, 0.5, 0.75, 1.0].map(preset => (
                            <button
                                key={preset}
                                className={`layer-item__preset ${opacity === preset ? 'layer-item__preset--active' : ''}`}
                                onClick={() => handleOpacityChange(preset)}
                                disabled={!isEnabled}
                            >
                                {Math.round(preset * 100)}%
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// QUICK VISIBILITY TOGGLES
// =============================================================================

function QuickVisibilityRow({ layers, onToggleAll }) {
    const allEnabled = Object.values(layers).every(l => l?.enabled !== false);
    const someEnabled = Object.values(layers).some(l => l?.enabled !== false);

    return (
        <div className="quick-visibility">
            <span className="quick-visibility__label">Quick Actions</span>
            <div className="quick-visibility__actions">
                <button
                    className={`quick-visibility__btn ${allEnabled ? 'quick-visibility__btn--active' : ''}`}
                    onClick={() => onToggleAll(true)}
                    title="Show all layers"
                >
                    <Icon name="eye" size={12} />
                    <span>Show All</span>
                </button>
                <button
                    className="quick-visibility__btn"
                    onClick={() => onToggleAll(false)}
                    title="Hide all layers"
                >
                    <Icon name="eyeOff" size={12} />
                    <span>Hide All</span>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN LAYERS SUBTAB COMPONENT
// =============================================================================

export function LayersSubtab({ activeInstance }) {
    const instanceId = activeInstance?.instanceId;

    // Layer state management
    const [layers, setLayers] = useState({
        geometry: { enabled: true, opacity: 1.0 },
        annotations: { enabled: true, opacity: 1.0, count: 0, total: 0 },
        widgets: { enabled: true, count: 0, total: 0 },
        cursors: { enabled: true, count: 0, total: 0 },
        axes: { enabled: true },
        grid: { enabled: false, opacity: 0.5 },
    });

    // Load layer state from instance
    useEffect(() => {
        if (!instanceId) return;

        const loadLayerState = () => {
            // Get layer visibility state from workspaceManager if available
            const instance = workspaceManager?.getInstance?.(instanceId);
            if (instance?.layerState) {
                setLayers(prev => ({ ...prev, ...instance.layerState }));
            }
        };

        loadLayerState();

        // Listen for layer updates
        const handleLayerUpdate = (event) => {
            if (event.detail?.instanceId === instanceId) {
                loadLayerState();
            }
        };

        window.addEventListener('cia:layers-updated', handleLayerUpdate);
        return () => window.removeEventListener('cia:layers-updated', handleLayerUpdate);
    }, [instanceId]);

    // Toggle layer visibility
    const handleToggleLayer = useCallback((layerId, enabled) => {
        setLayers(prev => ({
            ...prev,
            [layerId]: { ...prev[layerId], enabled },
        }));

        // Apply to instance
        if (instanceId) {
            workspaceManager.setLayerVisibility?.(instanceId, layerId, enabled);
        }
    }, [instanceId]);

    // Set layer opacity
    const handleOpacityChange = useCallback((layerId, opacity) => {
        setLayers(prev => ({
            ...prev,
            [layerId]: { ...prev[layerId], opacity },
        }));

        // Apply to instance
        if (instanceId) {
            workspaceManager.setLayerOpacity?.(instanceId, layerId, opacity);
        }
    }, [instanceId]);

    // Toggle all layers
    const handleToggleAll = useCallback((enabled) => {
        const newLayers = {};
        for (const layerId of Object.keys(layers)) {
            newLayers[layerId] = { ...layers[layerId], enabled };
        }
        setLayers(newLayers);

        // Apply to instance
        if (instanceId) {
            for (const layerId of Object.keys(layers)) {
                workspaceManager.setLayerVisibility?.(instanceId, layerId, enabled);
            }
        }
    }, [instanceId, layers]);

    // Build sections for SectionNavGroup
    const layerSections = useMemo(() => [
        {
            id: 'data',
            icon: 'database',
            label: 'Data Layers',
            color: '#60a5fa', // blue
            content: (
                <div className="layers-subtab__list">
                    <LayerItem
                        layer="geometry"
                        state={layers.geometry}
                        onToggle={handleToggleLayer}
                        onOpacityChange={handleOpacityChange}
                    />
                    <LayerItem
                        layer="annotations"
                        state={layers.annotations}
                        onToggle={handleToggleLayer}
                        onOpacityChange={handleOpacityChange}
                    />
                </div>
            ),
        },
        {
            id: 'interactive',
            icon: 'hand',
            label: 'Interactive',
            color: '#fbbf24', // amber
            content: (
                <div className="layers-subtab__list">
                    <LayerItem
                        layer="widgets"
                        state={layers.widgets}
                        onToggle={handleToggleLayer}
                    />
                    <LayerItem
                        layer="cursors"
                        state={layers.cursors}
                        onToggle={handleToggleLayer}
                    />
                </div>
            ),
        },
        {
            id: 'display',
            icon: 'monitor',
            label: 'Display',
            color: '#c084fc', // purple
            content: (
                <div className="layers-subtab__list">
                    <LayerItem
                        layer="axes"
                        state={layers.axes}
                        onToggle={handleToggleLayer}
                    />
                    <LayerItem
                        layer="grid"
                        state={layers.grid}
                        onToggle={handleToggleLayer}
                        onOpacityChange={handleOpacityChange}
                    />
                </div>
            ),
        },
    ], [layers, handleToggleLayer, handleOpacityChange]);

    return (
        <div className="layers-subtab">
            {/* Info text */}
            <div className="layers-subtab__info">
                <Icon name="info" size={12} />
                <span>Control visibility and opacity for each layer in this view.</span>
            </div>

            {/* Quick visibility toggles */}
            <QuickVisibilityRow layers={layers} onToggleAll={handleToggleAll} />

            {/* Sections with nav */}
            <div className="layers-subtab__sections">
                <SectionNavGroup
                    sections={layerSections}
                    defaultSectionId="data"
                    size="sm"
                />
            </div>
        </div>
    );
}

export default LayersSubtab;
