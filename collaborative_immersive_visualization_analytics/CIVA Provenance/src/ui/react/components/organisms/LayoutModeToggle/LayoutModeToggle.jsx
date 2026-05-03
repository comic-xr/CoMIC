// src/ui/react/components/organisms/LayoutModeToggle/LayoutModeToggle.jsx
// Toggle between Normal, Isolation, and Subset layout modes
// Uses SegmentedToggle molecule with layout-specific business logic

import React, { useMemo, memo } from 'react';
import { SegmentedToggle } from '@UI/react/components/molecules/SegmentedToggle';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useLayoutModeToggle, LAYOUT_MODES, LAYOUT_MODE_INFO } from './LayoutModeToggle.logic.js';

/**
 * Mode configuration with icons and accent colors
 */
const MODE_OPTIONS = [
    {
        value: LAYOUT_MODES.NORMAL,
        icon: 'grid3x3',
        label: 'Normal - Standard grid layout',
        accent: 'var(--color-accent-blue)',
    },
    {
        value: LAYOUT_MODES.ISOLATION,
        icon: 'maximize',
        label: 'Isolation - Focus on single cell',
        accent: 'var(--color-accent-purple)',
    },
    {
        value: LAYOUT_MODES.SUBSET,
        icon: 'layers',
        label: 'Subset - Filtered cell view',
        accent: 'var(--color-accent-green)',
    },
];

/**
 * LayoutModeToggle - Switches between Normal, Isolation, and Subset modes
 *
 * Built on SegmentedToggle molecule with layout-specific business logic.
 *
 * Features:
 * - Visual toggle with icons and accent colors
 * - Distinct colors per mode
 * - Compact/full size variants
 * - Keyboard accessible
 * - VR-adaptive sizing
 *
 * @param {Object} props
 * @param {string} props.mode - Current mode ('normal' | 'isolation' | 'subset')
 * @param {Function} props.onModeChange - Callback when mode changes
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable the entire toggle
 * @param {string[]} props.disabledModes - Array of specific modes to disable
 * @param {boolean} props.showLabels - Show labels in VR mode
 * @param {string} props.className - Additional CSS classes
 */
export const LayoutModeToggle = memo(function LayoutModeToggle({
    mode: controlledMode,
    onModeChange,
    size = 'md',
    disabled = false,
    disabledModes = [],
    showLabels = false,
    className = '',
}) {
    const {
        mode,
        setMode,
    } = useLayoutModeToggle({
        initialMode: controlledMode,
        onModeChange,
        disabledModes,
    });

    // Build options with disabled state
    const options = useMemo(() => {
        return MODE_OPTIONS.map(option => ({
            ...option,
            disabled: disabledModes.includes(option.value),
        }));
    }, [disabledModes]);

    return (
        <SegmentedToggle
            options={options}
            value={mode}
            onChange={setMode}
            size={size}
            disabled={disabled}
            showLabels={showLabels}
            className={className}
        />
    );
});

/**
 * LayoutModeIndicator - Read-only display of current mode
 * Use when you just want to show the mode without allowing changes
 */
export const LayoutModeIndicator = memo(function LayoutModeIndicator({
    mode,
    compact = false
}) {
    const config = MODE_OPTIONS.find(opt => opt.value === mode) || MODE_OPTIONS[0];
    const info = LAYOUT_MODE_INFO[mode] || LAYOUT_MODE_INFO[LAYOUT_MODES.NORMAL];

    return (
        <div
            className={`layout-mode-indicator layout-mode-indicator--${mode} ${compact ? 'layout-mode-indicator--compact' : ''}`}
            style={{ '--indicator-accent': config.accent }}
        >
            <Icon name={config.icon} size={12} />
            {!compact && <span>{info.label}</span>}
        </div>
    );
});

export { LAYOUT_MODES, LAYOUT_MODE_INFO };
export default LayoutModeToggle;
