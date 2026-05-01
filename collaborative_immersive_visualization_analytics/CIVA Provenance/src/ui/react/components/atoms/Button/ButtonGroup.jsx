/**
 * @file ButtonGroup.jsx
 * @description Container component for grouping buttons together.
 * Provides consistent spacing and optional connected styling.
 *
 * Features:
 * - Horizontal and vertical orientation
 * - Multiple alignment options
 * - Configurable gap sizes
 * - Connected mode for segmented control styling
 * - Works with Button and IconButton components
 *
 * @example
 * // Basic button group
 * <ButtonGroup align="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="primary">Confirm</Button>
 * </ButtonGroup>
 *
 * @example
 * // Connected buttons (segmented control)
 * <ButtonGroup connected>
 *   <Button variant="secondary" active>Day</Button>
 *   <Button variant="secondary">Week</Button>
 *   <Button variant="secondary">Month</Button>
 * </ButtonGroup>
 *
 * @example
 * // Vertical layout
 * <ButtonGroup orientation="vertical" gap="md">
 *   <Button variant="secondary" icon={File}>New File</Button>
 *   <Button variant="secondary" icon={Folder}>New Folder</Button>
 *   <Button variant="secondary" icon={Upload}>Upload</Button>
 * </ButtonGroup>
 */

import React, { memo } from 'react';
import './Button.scss';

/**
 * @typedef {Object} ButtonGroupProps
 * @property {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction
 * @property {'start'|'center'|'end'|'space-between'} [align='start'] - Alignment
 * @property {'sm'|'md'|'lg'} [gap='md'] - Gap between buttons
 * @property {boolean} [connected=false] - Connect buttons without gap (segmented control)
 * @property {boolean} [fullWidth=false] - Expand to full container width
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Button components
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Container component for grouping buttons.
 * Provides consistent spacing and alignment options.
 *
 * @param {ButtonGroupProps} props - Component props
 * @returns {React.ReactElement} The rendered button group
 */
function ButtonGroup({
    orientation = 'horizontal',
    align = 'start',
    gap = 'md',
    connected = false,
    fullWidth = false,
    className = '',
    children,
    testId
}) {
    // Build class names
    const classNames = [
        'btn-group',
        `btn-group--${orientation}`,
        `btn-group--align-${align}`,
        `btn-group--gap-${gap}`,
        connected && 'btn-group--connected',
        fullWidth && 'btn-group--full-width',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            role="group"
            data-testid={testId}
        >
            {children}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export default memo(ButtonGroup);
export { ButtonGroup };