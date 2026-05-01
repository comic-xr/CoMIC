/**
 * @file ScopeIndicator.jsx
 * @description Atom for displaying view scope level (ephemeral, personal, shared, workspace, project).
 * Uses useAdaptive for VR-friendly sizing.
 *
 * @example
 * <ScopeIndicator scope="personal" />
 * <ScopeIndicator scope="workspace" size="lg" showLabel />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { useAdaptive } from '@UI/react/context';
import { SCOPE_CONFIG } from '@UI/react/constants/filesTabConfig.js';
import './ScopeIndicator.scss';

// Size mappings for desktop and VR
const SIZE_MAP = {
    sm: { desktop: 10, vr: 14 },
    md: { desktop: 12, vr: 18 },
    lg: { desktop: 14, vr: 22 },
};

/**
 * @typedef {'ephemeral'|'personal'|'shared'|'workspace'|'project'} ScopeType
 */

/**
 * @typedef {Object} ScopeIndicatorProps
 * @property {ScopeType} scope - The scope level to display
 * @property {'sm'|'md'|'lg'} [size='md'] - Size variant
 * @property {boolean} [showLabel=false] - Show the scope label text
 * @property {boolean} [showTooltip=true] - Show tooltip on hover
 * @property {string} [className] - Additional CSS classes
 */

/**
 * ScopeIndicator - Shows the scope level of a view/item
 *
 * @param {ScopeIndicatorProps} props - Component props
 * @returns {React.ReactElement|null} The rendered indicator
 */
export const ScopeIndicator = memo(function ScopeIndicator({
    scope,
    size = 'md',
    showLabel = false,
    showTooltip = true,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const config = SCOPE_CONFIG[scope];

    if (!config) {
        return null;
    }

    const iconSize = SIZE_MAP[size]?.[isVR ? 'vr' : 'desktop'] ?? SIZE_MAP.md.desktop;

    const classList = [
        'scope-indicator',
        `scope-indicator--${scope}`,
        `scope-indicator--${size}`,
        showLabel && 'scope-indicator--with-label',
        isVR && 'scope-indicator--vr',
        className,
    ].filter(Boolean).join(' ');

    // Special handling for ephemeral (dashed circle)
    const renderIcon = () => {
        if (scope === 'ephemeral') {
            // Render a dashed circle for ephemeral scope
            return (
                <span
                    className="scope-indicator__dashed-circle"
                    style={{
                        width: iconSize,
                        height: iconSize,
                        borderColor: config.color,
                    }}
                />
            );
        }

        return (
            <Icon
                name={config.icon}
                size={iconSize}
                className="scope-indicator__icon"
            />
        );
    };

    const content = (
        <span
            className={classList}
            style={{ '--scope-color': config.color }}
        >
            {renderIcon()}
            {showLabel && (
                <span className="scope-indicator__label">{config.label}</span>
            )}
        </span>
    );

    if (showTooltip) {
        return (
            <Tooltip content={`${config.label}: ${config.description}`}>
                {content}
            </Tooltip>
        );
    }

    return content;
});

export default ScopeIndicator;
