/**
 * PropertySelector Component
 *
 * Grid of linkable property buttons for selecting which property to configure.
 * Shows property icon, label, and link count indicator.
 *
 * @module PropertySelector
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { LINK_PROPERTIES } from '@UI/react/components/organisms/LinkManagerPanels/linkConstants';
import './PropertySelector.scss';

/**
 * PropertySelector - Grid of property buttons for link configuration
 *
 * @param {string} selectedProperty - Currently selected property ID
 * @param {function} onSelect - Selection handler (propertyId) => void
 * @param {Object} linkStats - Object mapping propertyId to { count: number }
 * @param {string} className - Additional CSS classes
 */
export const PropertySelector = memo(function PropertySelector({
    selectedProperty,
    onSelect,
    linkStats = {},
    className = '',
}) {
    return (
        <div className={`property-selector ${className}`}>
            <span className="property-selector__label">Property</span>
            <div className="property-selector__grid">
                {LINK_PROPERTIES.map((prop) => {
                    const stats = linkStats[prop.id] || { count: 0 };
                    const isActive = selectedProperty === prop.id;

                    return (
                        <button
                            key={prop.id}
                            className={`property-selector__item ${isActive ? 'property-selector__item--active' : ''}`}
                            style={{ '--property-color': prop.colorHex }}
                            onClick={() => onSelect(prop.id)}
                            title={prop.description}
                        >
                            <Icon
                                name={prop.icon}
                                size={14}
                                className="property-selector__icon"
                            />
                            <span className="property-selector__name">{prop.label}</span>
                            <div className="property-selector__indicators">
                                {stats.count > 0 ? (
                                    [...Array(Math.min(stats.count, 4))].map((_, i) => (
                                        <span
                                            key={i}
                                            className="property-selector__dot"
                                        />
                                    ))
                                ) : (
                                    <span className="property-selector__empty">—</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default PropertySelector;
