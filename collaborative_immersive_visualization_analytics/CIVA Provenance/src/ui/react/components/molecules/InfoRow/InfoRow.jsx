// src/ui/react/components/molecules/InfoRow/InfoRow.jsx
// InfoRow molecule - Label + value display row

import React, { memo } from 'react';
import { IconLabel, Text } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './InfoRow.scss';

/**
 * InfoRow - Label + value display row
 *
 * Composed from: IconLabel atom + Text atom
 *
 * Use for:
 * - Property displays
 * - Metadata rows
 * - Settings displays
 * - Info panels
 *
 * @param {string} icon - Icon name (optional)
 * @param {string} label - Row label
 * @param {React.ReactNode} value - Row value (string or element)
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} mono - Use monospace font for value
 * @param {boolean} truncate - Truncate value with ellipsis
 * @param {boolean} inline - Inline layout (label and value on same line)
 * @param {string} className - Additional CSS classes
 */
export const InfoRow = memo(function InfoRow({
    icon,
    label,
    value,
    size = 'md',
    mono = false,
    truncate = false,
    inline = true,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const classList = [
        'info-row',
        `info-row--${size}`,
        inline && 'info-row--inline',
        isVR && 'info-row--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            <span className="info-row__label">
                {icon ? (
                    <IconLabel
                        icon={icon}
                        label={label}
                        size={size}
                        color="secondary"
                        subtle
                    />
                ) : (
                    <Text
                        variant="label"
                        size={size === 'lg' ? 'md' : 'sm'}
                        color="muted"
                    >
                        {label}
                    </Text>
                )}
            </span>
            <span className="info-row__value">
                {typeof value === 'string' || typeof value === 'number' ? (
                    <Text
                        variant={mono ? 'mono' : 'body'}
                        size={size === 'lg' ? 'md' : 'sm'}
                        color="primary"
                        truncate={truncate}
                    >
                        {value}
                    </Text>
                ) : (
                    value
                )}
            </span>
        </div>
    );
});

export default InfoRow;
