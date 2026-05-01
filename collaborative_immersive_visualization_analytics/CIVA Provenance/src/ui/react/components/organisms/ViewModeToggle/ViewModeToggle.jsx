// src/ui/react/components/organisms/ViewModeToggle/ViewModeToggle.jsx
// Toggle between Desktop and VR viewing modes
// Uses SegmentedToggle molecule with VR-specific business logic

import React, { useMemo, memo } from 'react';
import { SegmentedToggle } from '@UI/react/components/molecules/SegmentedToggle';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useViewModeToggle, VIEW_MODES } from './ViewModeToggle.logic.js';

/**
 * Mode configuration with icons and accent colors
 */
const MODE_OPTIONS = [
    {
        value: VIEW_MODES.DESKTOP,
        icon: 'monitor',
        label: 'Desktop - Standard 2D interface',
        accent: 'var(--color-accent-blue)',
    },
    {
        value: VIEW_MODES.VR,
        icon: 'vrPano',
        label: 'VR - Immersive 3D experience',
        accent: 'var(--color-accent-purple)',
    },
];

/**
 * ViewModeToggle - Switches between Desktop and VR modes
 *
 * Built on SegmentedToggle molecule with VR detection business logic.
 *
 * Features:
 * - Visual toggle with icons
 * - VR availability detection (WebXR)
 * - Disabled state when VR unavailable
 * - Keyboard accessible
 * - VR-adaptive sizing
 *
 * @param {Object} props
 * @param {string} props.mode - Current mode ('desktop' | 'vr')
 * @param {Function} props.onModeChange - Callback when mode changes
 * @param {boolean} props.vrAvailable - Override VR availability (for testing)
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} props.disabled - Disable the toggle
 * @param {boolean} props.showLabels - Show labels in VR mode
 * @param {string} props.className - Additional CSS classes
 */
export const ViewModeToggle = memo(function ViewModeToggle({
    mode: controlledMode,
    onModeChange,
    vrAvailable: controlledVrAvailable,
    size = 'md',
    disabled = false,
    showLabels = false,
    className = '',
}) {
    const {
        mode,
        setMode,
        canEnterVR,
        vrUnavailableReason,
    } = useViewModeToggle({
        initialMode: controlledMode,
        onModeChange,
        vrAvailable: controlledVrAvailable,
    });

    // Build options with VR disabled state
    const options = useMemo(() => {
        return MODE_OPTIONS.map(option => {
            if (option.value === VIEW_MODES.VR) {
                return {
                    ...option,
                    disabled: !canEnterVR,
                    label: canEnterVR ? option.label : vrUnavailableReason || 'VR unavailable',
                };
            }
            return option;
        });
    }, [canEnterVR, vrUnavailableReason]);

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
 * ViewModeIndicator - Read-only display of current mode
 * Use when you just want to show the mode without allowing changes
 */
export const ViewModeIndicator = memo(function ViewModeIndicator({
    mode,
    compact = false
}) {
    const isVR = mode === VIEW_MODES.VR;
    const config = MODE_OPTIONS.find(opt => opt.value === mode) || MODE_OPTIONS[0];

    return (
        <div
            className={`view-mode-indicator ${compact ? 'view-mode-indicator--compact' : ''}`}
            style={{ '--indicator-accent': config.accent }}
        >
            <Icon name={config.icon} size={12} />
            {!compact && <span>{isVR ? 'VR Mode' : 'Desktop'}</span>}
        </div>
    );
});

export { VIEW_MODES };
export default ViewModeToggle;
