/**
 * @file VRLinkBadge.jsx
 * @description VR-optimized link badge with tap-to-select interaction.
 * Replaces draggable badge with larger touch targets for VR controllers.
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './VRViewLinking.scss';

/**
 * VRLinkBadge - Tap-to-select badge for VR linking
 *
 * @param {Object} props
 * @param {string} props.viewId - View identifier
 * @param {string} props.viewName - View display name
 * @param {string} props.viewColor - View color
 * @param {number} [props.linkCount=0] - Number of active links
 * @param {boolean} [props.isHub=false] - Whether this view is a hub
 * @param {boolean} [props.isActive=false] - This view is the active link source
 * @param {boolean} [props.isLinkingMode=false] - Currently in linking mode
 * @param {Function} [props.onActivate] - Called when badge is tapped to start linking
 * @param {Function} [props.onDeactivate] - Called when active badge is tapped to cancel
 */
export const VRLinkBadge = memo(function VRLinkBadge({
    viewId,
    viewName,
    viewColor,
    linkCount = 0,
    isHub = false,
    isActive = false,
    isLinkingMode = false,
    onActivate,
    onDeactivate,
}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e) => {
        e.stopPropagation();
        if (isActive) {
            onDeactivate?.();
        } else {
            onActivate?.(viewId, { viewName, viewColor });
        }
    };

    const classNames = [
        'vr-link-badge',
        isActive && 'vr-link-badge--active',
        isHovered && 'vr-link-badge--hovered',
        isHub && 'vr-link-badge--hub',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            onClick={handleClick}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            className={classNames}
        >
            {/* Hub indicator */}
            {isHub && (
                <span className="vr-link-badge__hub-star">
                    <Icon name="star" size={14} />
                </span>
            )}

            {/* Link icon */}
            <Icon name="link" size={18} />

            {/* Count or label */}
            <span className="vr-link-badge__label">
                {linkCount > 0 ? linkCount : 'Link'}
            </span>

            {/* Active indicator */}
            {isActive && (
                <span className="vr-link-badge__active-hint">(tap target)</span>
            )}
        </button>
    );
});

export default VRLinkBadge;
