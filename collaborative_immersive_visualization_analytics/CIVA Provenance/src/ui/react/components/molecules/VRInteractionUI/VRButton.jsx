/**
 * VRButton Component
 *
 * Large touch target button optimized for VR interaction.
 * Minimum 44px touch target for accessibility.
 *
 * @module VRButton
 */

import React, { memo } from 'react';
import './VRInteractionUI.scss';

/**
 * VRButton - Large button for VR
 *
 * @param {Object} props
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 * @param {React.ReactNode} props.icon - Icon element
 * @param {string} props.label - Button label
 * @param {'default'|'primary'|'danger'} props.variant - Button style variant
 * @param {'sm'|'md'|'lg'} props.size - Button size
 * @param {string} props.className - Additional CSS classes
 */
export const VRButton = memo(function VRButton({
    onClick,
    disabled,
    icon,
    label,
    variant = 'default',
    size = 'md',
    className = '',
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`vr-button vr-button--${variant} vr-button--${size} ${className}`}
        >
            {icon && <span className="vr-button__icon">{icon}</span>}
            {label && <span className="vr-button__label">{label}</span>}
        </button>
    );
});

export default VRButton;
