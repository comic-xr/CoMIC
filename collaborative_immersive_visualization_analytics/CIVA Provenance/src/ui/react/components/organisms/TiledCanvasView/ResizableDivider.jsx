/**
 * @file ResizableDivider.jsx
 * @description Draggable divider for resizing canvas panels
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * ResizableDivider - Draggable divider between canvas panels
 */
const ResizableDivider = memo(function ResizableDivider({
    type = 'horizontal',
    isDragging,
    onMouseDown,
}) {
    const isHorizontal = type === 'horizontal';

    return (
        <div
            className={`resizable-divider resizable-divider--${type} ${isDragging ? 'resizable-divider--dragging' : ''}`}
            onMouseDown={onMouseDown}
        >
            <div className="resizable-divider__handle" />
        </div>
    );
});

ResizableDivider.propTypes = {
    /** Direction of the divider: horizontal (left-right) or vertical (top-bottom) */
    type: PropTypes.oneOf(['horizontal', 'vertical']),
    /** Whether the divider is currently being dragged */
    isDragging: PropTypes.bool,
    /** Mouse down handler to start dragging */
    onMouseDown: PropTypes.func,
};

export { ResizableDivider };
export default ResizableDivider;
