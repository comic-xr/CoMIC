/**
 * LinkPropertyRow Component (Enhanced from Artifact)
 * 
 * Allows each link property (camera, filters, widgets, etc.) to be:
 * 1. Enabled/disabled independently
 * 2. Linked to a DIFFERENT parent view via dropdown
 * 
 * This replaces the simple toggle buttons with a more powerful UI
 * where users can configure selective linking per-property.
 * 
 * Location: src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab/ViewItem/components/LinkPropertyRow.jsx
 */

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './LinkPropertyRow.scss';

// =============================================================================
// LINK PROPERTY DEFINITIONS
// =============================================================================

export const LINK_PROPERTIES = [
    { id: 'camera', label: 'Camera', icon: 'camera', desc: 'Sync view angle & zoom' },
    { id: 'filters', label: 'Filters', icon: 'sliders', desc: 'Sync active filters' },
    { id: 'widgets', label: 'Widgets', icon: 'layout', desc: 'Sync widget states' },
    { id: 'cursors', label: 'Cursors', icon: 'crosshair', desc: 'Show collaborator cursors' },
    { id: 'colorMaps', label: 'Colors', icon: 'palette', desc: 'Sync color mapping' },
    { id: 'annotationDisplay', label: 'Annot.', icon: 'eye', desc: 'Sync annotation visibility' },
];

// =============================================================================
// INDIVIDUAL LINK PROPERTY ROW
// =============================================================================

const LinkPropertyItem = memo(function LinkPropertyItem({
    property,
    config,        // { enabled: boolean, parentId: string | null }
    availableViews, // Array of { id, name } for dropdown options
    disabled,
    onChange,      // (propertyId, newConfig) => void
}) {
    const iconName = property.icon;
    const isEnabled = config?.enabled ?? false;
    const parentId = config?.parentId ?? null;

    const handleToggleEnabled = () => {
        onChange?.(property.id, {
            ...config,
            enabled: !isEnabled,
        });
    };

    const handleParentChange = (e) => {
        const newParentId = e.target.value || null;
        onChange?.(property.id, {
            ...config,
            parentId: newParentId,
        });
    };

    return (
        <div className={`link-property-item ${isEnabled ? 'link-property-item--enabled' : ''}`}>
            {/* Toggle Button */}
            <button
                className={`link-property-item__toggle ${isEnabled ? 'link-property-item__toggle--active' : ''}`}
                onClick={handleToggleEnabled}
                disabled={disabled}
                title={`${isEnabled ? 'Disable' : 'Enable'} ${property.label} linking`}
            >
                <Icon name={iconName} size={12} />
            </button>

            {/* Label */}
            <span className="link-property-item__label">{property.label}</span>

            {/* Parent Selector Dropdown */}
            <select
                className="link-property-item__select"
                value={parentId || ''}
                onChange={handleParentChange}
                disabled={disabled || !isEnabled}
                title={property.desc}
            >
                <option value="">Independent</option>
                {availableViews.map(view => (
                    <option key={view.id} value={view.id}>
                        {view.name}
                    </option>
                ))}
            </select>
        </div>
    );
});

// =============================================================================
// MAIN LINK PROPERTY ROW COMPONENT
// =============================================================================

/**
 * LinkPropertyRow - Full row with toggle-all and per-property controls
 * 
 * @param {Object} props
 * @param {Object} props.linkConfig - Map of propertyId -> { enabled, parentId }
 * @param {Array} props.availableViews - Views that can be linked to (excluding current)
 * @param {boolean} props.disabled - Disable all controls (e.g., no link target set)
 * @param {Function} props.onPropertyChange - (propertyId, config) => void
 * @param {Function} props.onToggleAll - (allEnabled: boolean) => void
 */
export const LinkPropertyRow = memo(function LinkPropertyRow({
    linkConfig = {},
    availableViews = [],
    disabled = false,
    onPropertyChange,
    onToggleAll,
}) {
    // Check if all properties are enabled
    const allEnabled = useMemo(() => {
        return LINK_PROPERTIES.every(prop => linkConfig[prop.id]?.enabled);
    }, [linkConfig]);

    // Check if any properties are enabled
    const someEnabled = useMemo(() => {
        return LINK_PROPERTIES.some(prop => linkConfig[prop.id]?.enabled);
    }, [linkConfig]);

    const handleToggleAll = () => {
        onToggleAll?.(!allEnabled);
    };

    return (
        <div className={`link-property-row ${disabled ? 'link-property-row--disabled' : ''}`}>
            {/* Header with Toggle All */}
            <div className="link-property-row__header">
                <span className="link-property-row__title">Link Properties</span>
                <button
                    className={`link-property-row__toggle-all ${allEnabled ? 'link-property-row__toggle-all--active' : ''}`}
                    onClick={handleToggleAll}
                    disabled={disabled}
                    title={allEnabled ? 'Unlink all properties' : 'Link all properties'}
                >
                    {allEnabled ? <Icon name="toggleRight" size={14} /> : <Icon name="toggleLeft" size={14} />}
                    <span>{allEnabled ? 'All' : 'None'}</span>
                </button>
            </div>

            {/* Property List */}
            <div className="link-property-row__list">
                {LINK_PROPERTIES.map(property => (
                    <LinkPropertyItem
                        key={property.id}
                        property={property}
                        config={linkConfig[property.id]}
                        availableViews={availableViews}
                        disabled={disabled}
                        onChange={onPropertyChange}
                    />
                ))}
            </div>
        </div>
    );
});

export default LinkPropertyRow;