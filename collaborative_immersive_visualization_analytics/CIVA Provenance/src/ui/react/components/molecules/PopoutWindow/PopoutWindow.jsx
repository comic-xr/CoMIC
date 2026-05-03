/**
 * @file PopoutWindow.jsx
 * @description Ephemeral floating window for focused view examination
 *
 * Features:
 * - Draggable header
 * - Corner resize handle
 * - Edge/grid snap support (Shift to disable)
 * - Focus state with cyan glow
 * - Snap indicator feedback
 */

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import {
    useSnapCalculation,
    useDrag,
    useResize,
    VIEW_TYPE_ICONS,
} from './PopoutWindow.logic';
import './PopoutWindow.scss';

/**
 * PopoutWindow - Draggable, resizable floating window
 */
const PopoutWindow = memo(function PopoutWindow({
    popout,
    position,
    size,
    onPositionChange,
    onSizeChange,
    onClose,
    isFocused,
    onFocus,
    snapEnabled = true,
    gridSnapEnabled = false,
    containerBounds,
    renderContent,
}) {
    const [isHovered, setIsHovered] = useState(false);

    const { calculateSnap } = useSnapCalculation(snapEnabled, gridSnapEnabled, containerBounds);
    const { isDragging, snapIndicator, handleDragStart } = useDrag(
        position,
        size,
        onPositionChange,
        onFocus,
        calculateSnap
    );
    const { isResizing, handleResizeStart } = useResize(position, onSizeChange, onFocus);

    const viewIcon = VIEW_TYPE_ICONS[popout.viewType] || VIEW_TYPE_ICONS.default;

    return (
        <div
            className={`popout-window ${isFocused ? 'popout-window--focused' : ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: isFocused ? 100 : 50,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={onFocus}
        >
            {/* Snap indicator */}
            {snapIndicator && (
                <div className="popout-window__snap-indicator" />
            )}

            {/* Header */}
            <div
                className={`popout-window__header ${isDragging ? 'popout-window__header--dragging' : ''}`}
                onMouseDown={handleDragStart}
            >
                <div
                    className="popout-window__color-dot"
                    style={{ backgroundColor: popout.color }}
                />
                <Icon name={viewIcon} size={14} className="popout-window__type-icon" />
                <span className="popout-window__name">{popout.viewName}</span>
                <Icon name="externalLink" size={12} className="popout-window__popout-icon" />
                <button
                    className={`popout-window__close ${isHovered ? 'popout-window__close--visible' : ''}`}
                    onClick={onClose}
                >
                    <Icon name="x" size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="popout-window__content">
                {renderContent ? (
                    renderContent(popout)
                ) : (
                    <div className="popout-window__placeholder">
                        <Icon name={viewIcon} size={40} className="popout-window__placeholder-icon" />
                        <span className="popout-window__placeholder-type">{popout.viewType}</span>
                        <span className="popout-window__placeholder-hint">Tools in Footer 1</span>
                    </div>
                )}
            </div>

            {/* Resize handle */}
            <div
                className={`popout-window__resize-handle ${isHovered || isResizing ? 'popout-window__resize-handle--visible' : ''}`}
                onMouseDown={handleResizeStart}
            >
                <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M10 12L12 10M6 12L12 6M2 12L12 2" strokeWidth="1.5" fill="none" />
                </svg>
            </div>
        </div>
    );
});

PopoutWindow.propTypes = {
    popout: PropTypes.shape({
        id: PropTypes.string.isRequired,
        viewName: PropTypes.string.isRequired,
        viewType: PropTypes.string,
        color: PropTypes.string,
    }).isRequired,
    position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
    }).isRequired,
    size: PropTypes.shape({
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
    }).isRequired,
    onPositionChange: PropTypes.func,
    onSizeChange: PropTypes.func,
    onClose: PropTypes.func,
    isFocused: PropTypes.bool,
    onFocus: PropTypes.func,
    snapEnabled: PropTypes.bool,
    gridSnapEnabled: PropTypes.bool,
    containerBounds: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
    }),
    renderContent: PropTypes.func,
};

export { PopoutWindow };
export default PopoutWindow;
