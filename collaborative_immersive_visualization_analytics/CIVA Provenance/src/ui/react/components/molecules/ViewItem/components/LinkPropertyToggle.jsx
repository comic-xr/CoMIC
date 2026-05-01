/**
 * LinkPropertyToggle Component (v3 Design)
 *
 * Compact toggle button for link properties (Camera, Filters, Widgets, etc.)
 * Icon only - label shown in tooltip. Supports disabled and broken states.
 */

import React, { memo } from 'react';
import './LinkPropertyToggle.scss';

export const LinkPropertyToggle = memo(function LinkPropertyToggle({
    property,
    link,
    onToggle,
    onHover,
    disabled = false,
}) {
    const Icon = property.icon;
    const isLinked = link?.status === 'active';
    const isBroken = link?.status === 'broken';

    return (
        <button
            className={`link-property-toggle ${isLinked ? 'link-property-toggle--active' : ''} ${isBroken ? 'link-property-toggle--broken' : ''}`}
            onClick={() => !disabled && onToggle?.(property.id)}
            onMouseEnter={() => onHover?.(property, link)}
            onMouseLeave={() => onHover?.(null)}
            disabled={disabled}
            title={property.label}
        >
            <Icon size={10} />
        </button>
    );
});

export default LinkPropertyToggle;