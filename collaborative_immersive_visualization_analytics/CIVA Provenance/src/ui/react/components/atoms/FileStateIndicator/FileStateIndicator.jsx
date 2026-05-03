/**
 * @file FileStateIndicator.jsx
 * @description Reusable file state indicator showing file loading/processing status.
 * Used in FilesTab to show whether files are stored, loaded, processing, etc.
 *
 * Features:
 * - Multiple state types with distinct visuals
 * - Size variants
 * - Optional tooltip with state description
 * - Animation for active states (loading, processing)
 *
 * @see Left_Panel_Design_Specification.docx - Section 4.1 File States
 *
 * @example
 * <FileStateIndicator state="loaded" />
 * <FileStateIndicator state="processing" size="sm" showTooltip />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './FileStateIndicator.scss';

/**
 * @typedef {'stored'|'loading'|'loaded'|'processing'|'error'|'restricted'} FileState
 */

/**
 * State configuration with colors, icons, and labels
 * Per spec Section 4.1:
 * - ○ Stored: In storage, not loaded
 * - ◐ Loading: Currently loading
 * - ● Loaded: Active as dataset
 * - ⟳ Processing: Server-side compute running
 * - ⚠️ Error: Failed to process/validate
 * - 🔒 Restricted: User doesn't have access
 */
export const FILE_STATE_CONFIG = {
    stored: {
        color: 'var(--color-text-muted)',
        icon: "circle",
        label: 'Stored',
        description: 'In storage, not loaded as dataset',
        fill: false,
    },
    loading: {
        color: 'var(--color-accent-blue)',
        icon: "loader",
        label: 'Loading',
        description: 'Currently loading into memory',
        fill: false,
        animate: 'spin',
    },
    loaded: {
        color: 'var(--color-accent-green)',
        icon: "circle",
        label: 'Loaded',
        description: 'Active as dataset in Datasets Tab',
        fill: true,
    },
    processing: {
        color: 'var(--color-accent-amber)',
        icon: "loader",
        label: 'Processing',
        description: 'Server-side compute running',
        fill: false,
        animate: 'spin',
    },
    error: {
        color: 'var(--color-accent-red)',
        icon: "alertTriangle",
        label: 'Error',
        description: 'Failed to process or validate',
        fill: false,
    },
    restricted: {
        color: 'var(--color-text-muted)',
        icon: "lock",
        label: 'Restricted',
        description: "You don't have access to this file",
        fill: false,
    },
};

/**
 * Size configurations
 */
const SIZES = {
    xs: { icon: 8 },
    sm: { icon: 10 },
    md: { icon: 12 },
};

/**
 * @typedef {Object} FileStateIndicatorProps
 * @property {FileState} state - Current file state
 * @property {'xs'|'sm'|'md'} [size='sm'] - Size variant
 * @property {boolean} [showTooltip=false] - Whether to show state tooltip
 * @property {string} [className] - Additional CSS classes
 */

/**
 * File state indicator component.
 *
 * @param {FileStateIndicatorProps} props - Component props
 * @returns {React.ReactElement} The rendered indicator
 */
export const FileStateIndicator = memo(function FileStateIndicator({
    state = 'stored',
    size = 'sm',
    showTooltip = false,
    className = '',
}) {
    const config = FILE_STATE_CONFIG[state] || FILE_STATE_CONFIG.stored;
    const sizeConfig = SIZES[size] || SIZES.sm;

    const indicator = (
        <span
            className={`file-state-indicator file-state-indicator--${state} file-state-indicator--${size} ${config.animate ? `file-state-indicator--${config.animate}` : ''} ${className}`}
            style={{ '--state-color': config.color }}
        >
            <Icon
                name={config.icon}
                size={sizeConfig.icon}
                fill={config.fill ? 'currentColor' : 'none'}
            />
        </span>
    );

    if (showTooltip) {
        return (
            <Tooltip content={`${config.label}: ${config.description}`}>
                {indicator}
            </Tooltip>
        );
    }

    return indicator;
});

export default FileStateIndicator;