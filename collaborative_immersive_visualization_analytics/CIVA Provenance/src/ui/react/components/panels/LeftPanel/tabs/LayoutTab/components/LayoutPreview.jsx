/**
 * @file LayoutPreview.jsx
 * @description Visual thumbnail preview for layout configurations.
 *
 * Shows a grid preview of layout cells with proper handling
 * for merged layouts (1+2, 2+1).
 *
 * @example
 * <LayoutPreview layout={layout} size="sm" active={isSelected} color="#a855f7" />
 */

import React, { memo } from 'react';

/**
 * Layout size presets
 */
const SIZE_DIMENSIONS = {
    xs: 22,
    sm: 32,
    md: 44,
    lg: 56,
};

/**
 * LayoutPreview component
 *
 * @param {Object} props - Component props
 * @param {Object} props.layout - Layout configuration with rows, cols, and optional merged
 * @param {'xs'|'sm'|'md'|'lg'} [props.size='sm'] - Size preset
 * @param {boolean} [props.active=false] - Whether this layout is currently active
 * @param {string} [props.color] - Accent color for active state
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const LayoutPreview = memo(function LayoutPreview({
    layout,
    size = 'sm',
    active = false,
    color = null,
    className = '',
}) {
    if (!layout) return null;

    const dim = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.sm;
    const gap = 2;

    const accentColor = color || 'var(--color-accent-purple, #a855f7)';

    const containerStyle = {
        display: 'grid',
        gap,
        width: dim,
        height: dim,
        padding: 3,
        borderRadius: 4,
        background: active ? `color-mix(in srgb, ${accentColor} 20%, transparent)` : 'var(--color-bg-glass, rgba(255,255,255,0.03))',
        border: `1px solid ${active ? accentColor : 'var(--color-border-subtle, rgba(255,255,255,0.06))'}`,
        flexShrink: 0,
    };

    const getCellStyle = (index) => ({
        background: active
            ? `color-mix(in srgb, ${accentColor} ${50 + (index % 3) * 15}%, transparent)`
            : 'var(--color-text-muted, rgba(255,255,255,0.4))',
        opacity: active ? 1 : 0.4,
        borderRadius: 2,
    });

    // Handle 1+2 layout (top row merged)
    if (layout.merged === 'top') {
        return (
            <div
                className={`layout-preview ${className}`}
                style={{
                    ...containerStyle,
                    gridTemplateRows: 'repeat(2, 1fr)',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                }}
            >
                <div style={{ ...getCellStyle(0), gridColumn: '1 / -1' }} />
                <div style={getCellStyle(1)} />
                <div style={getCellStyle(2)} />
            </div>
        );
    }

    // Handle 2+1 layout (right column merged)
    if (layout.merged === 'right') {
        return (
            <div
                className={`layout-preview ${className}`}
                style={{
                    ...containerStyle,
                    gridTemplateRows: 'repeat(2, 1fr)',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                }}
            >
                <div style={getCellStyle(0)} />
                <div style={{ ...getCellStyle(1), gridRow: '1 / -1' }} />
                <div style={getCellStyle(2)} />
            </div>
        );
    }

    // Standard grid layout
    return (
        <div
            className={`layout-preview ${className}`}
            style={{
                ...containerStyle,
                gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            }}
        >
            {Array.from({ length: layout.rows * layout.cols }, (_, i) => (
                <div key={i} style={getCellStyle(i)} />
            ))}
        </div>
    );
});

export default LayoutPreview;
