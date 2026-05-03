/**
 * @file LabeledIconButton.jsx
 * @description Icon button with visible text label.
 * Used for prominent toggle buttons like Navigator and Scratchpad popouts.
 * 
 * @example
 * <LabeledIconButton
 *   icon="map"
 *   label="Navigator"
 *   active={navigatorOpen}
 *   accent={tokens.accentTeal}
 *   onClick={() => setNavigatorOpen(!navigatorOpen)}
 * />
 */

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import './LabeledIconButton.scss';

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Icon button with visible text label.
 *
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - Button label text
 * @param {boolean} [props.active] - Whether button is in active state
 * @param {string} [props.accent] - Accent color for active state
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS class
 */
export function LabeledIconButton({
    icon,
    label,
    active = false,
    accent,
    disabled = false,
    onClick,
    className = '',
}) {
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback(() => {
        if (!disabled) {
            onClick?.();
        }
    }, [disabled, onClick]);

    return (
        <button
            type="button"
            className={`labeled-icon-button ${active ? 'labeled-icon-button--active' : ''} ${disabled ? 'labeled-icon-button--disabled' : ''} ${className}`}
            style={{ '--btn-accent': accent }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleClick}
            disabled={disabled}
            title={label}
            data-hovered={hovered}
        >
            <Icon name={icon} size={14} className="labeled-icon-button__icon" />
            <span className="labeled-icon-button__label">{label}</span>
        </button>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LabeledIconButton;