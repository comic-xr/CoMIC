/**
 * @file FloatingAnnotationCreator.jsx
 * @description Draggable floating panel for creating annotations with coordinate display.
 *
 * This is a floating draggable window (not a centered modal) that allows users
 * to create annotations while seeing the 3D view. It displays real-time
 * coordinates from raycasting and allows manual position editing.
 *
 * Features:
 * - Draggable by header (grab handle)
 * - Real-time coordinate display from raycasting
 * - Manual position editing with X/Y/Z inputs
 * - Annotation type selection (note, warning, info, measurement)
 * - Keyboard shortcuts (Enter to create, Esc to cancel)
 *
 * Note: This component uses createPortal directly (not the base Modal)
 * because it's a draggable floating panel positioned relative to screen
 * coordinates, not a centered dialog.
 *
 * @example
 * <FloatingAnnotationCreator
 *     isOpen={showCreator}
 *     onClose={() => setShowCreator(false)}
 *     onSubmit={(text, type, position) => createAnnotation(text, type, position)}
 *     position={{ x: 1.5, y: 2.3, z: -0.8 }}
 *     screenPosition={{ x: 200, y: 200 }}
 *     onPositionChange={handlePositionChange}
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { createPortal } from 'react-dom';
import './FloatingAnnotationCreator.scss';

/**
 * Annotation type configuration
 * @type {Array<{value: string, label: string, color: string, icon: string}>}
 */
const ANNOTATION_TYPES = [
    { value: 'note', label: 'Note', color: 'green', icon: 'note' },
    { value: 'warning', label: 'Warning', color: 'amber', icon: 'warning' },
    { value: 'info', label: 'Info', color: 'blue', icon: 'info' },
    { value: 'measurement', label: 'Measure', color: 'purple', icon: 'ruler' },
];

/**
 * @typedef {Object} FloatingAnnotationCreatorProps
 * @property {boolean} isOpen - Whether the creator is visible
 * @property {() => void} onClose - Callback when creator should close
 * @property {(text: string, type: string) => void} onSubmit - Callback with annotation data
 * @property {{x: number, y: number, z: number}} position - 3D world position
 * @property {{x: number, y: number}} screenPosition - Initial screen position for window
 * @property {(position: {x: number, y: number, z: number}) => void} [onPositionChange] - Callback when position is edited
 */

/**
 * Draggable floating panel for creating annotations.
 *
 * @param {FloatingAnnotationCreatorProps} props - Component props
 * @returns {React.ReactPortal|null} Portal with creator panel, or null if closed
 */
export function FloatingAnnotationCreator({
    isOpen,
    onClose,
    onSubmit,
    position = { x: 0, y: 0, z: 0 },
    screenPosition = { x: 200, y: 200 },
    onPositionChange,
}) {
    const [text, setText] = useState('');
    const [type, setType] = useState('note');
    const [editingPosition, setEditingPosition] = useState(false);
    const [localPosition, setLocalPosition] = useState(position);
    const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Initialize window position when opened
    useEffect(() => {
        if (isOpen) {
            const left = Math.min(screenPosition.x, window.innerWidth - 320);
            const top = Math.min(screenPosition.y, window.innerHeight - 400);
            setWindowPosition({
                x: Math.max(10, left),
                y: Math.max(10, top),
            });
        }
    }, [isOpen, screenPosition]);

    // Update local position when prop changes
    useEffect(() => {
        setLocalPosition(position);
    }, [position]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Clear form when closed
    useEffect(() => {
        if (!isOpen) {
            setText('');
            setType('note');
            setEditingPosition(false);
        }
    }, [isOpen]);

    // Drag handlers
    const handleMouseDown = useCallback((e) => {
        if (e.target.closest('.floating-annotation-creator__drag-handle') ||
            e.target.closest('.floating-annotation-creator__header')) {
            setIsDragging(true);
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
            e.preventDefault();
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 300));
            const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100));
            setWindowPosition({ x: newX, y: newY });
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove global mouse listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Handle submit
    const handleSubmit = useCallback(() => {
        if (!text.trim()) return;
        onSubmit(text, type, localPosition);
        setText('');
        setType('note');
        setEditingPosition(false);
    }, [text, type, localPosition, onSubmit]);

    // Handle position edit
    const handlePositionChange = useCallback((axis, value) => {
        const numValue = parseFloat(value) || 0;
        const newPosition = { ...localPosition, [axis]: numValue };
        setLocalPosition(newPosition);
        onPositionChange?.(newPosition);
    }, [localPosition, onPositionChange]);

    // Handle key events
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleSubmit, onClose]);

    if (!isOpen) return null;

    const content = (
        <div
            ref={containerRef}
            className={`floating-annotation-creator ${isDragging ? 'floating-annotation-creator--dragging' : ''}`}
            style={{
                left: `${windowPosition.x}px`,
                top: `${windowPosition.y}px`,
            }}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
        >
            {/* Header with drag handle */}
            <div className="floating-annotation-creator__header">
                <div className="floating-annotation-creator__drag-handle">
                    <Icon name="gripHorizontal" size={14} />
                </div>
                <Icon name="mapPin" size={14} className="floating-annotation-creator__icon" />
                <span>New Annotation</span>
                <button
                    className="floating-annotation-creator__close"
                    onClick={onClose}
                    title="Cancel (Esc)"
                >
                    <Icon name="close" size={14} />
                </button>
            </div>

            {/* Position Display/Edit */}
            <div className="floating-annotation-creator__position">
                <div className="floating-annotation-creator__position-header">
                    <Icon name="target" size={12} />
                    <span>Position</span>
                    <button
                        className="floating-annotation-creator__edit-btn"
                        onClick={() => setEditingPosition(!editingPosition)}
                        title={editingPosition ? 'Done editing' : 'Edit position'}
                    >
                        <Icon name={editingPosition ? "check" : "edit"} size={12} />
                    </button>
                </div>

                {editingPosition ? (
                    <div className="floating-annotation-creator__position-edit">
                        <div className="floating-annotation-creator__coord-input">
                            <label>X</label>
                            <input
                                type="number"
                                value={localPosition.x?.toFixed(3) || '0'}
                                onChange={(e) => handlePositionChange('x', e.target.value)}
                                step="0.001"
                            />
                        </div>
                        <div className="floating-annotation-creator__coord-input">
                            <label>Y</label>
                            <input
                                type="number"
                                value={localPosition.y?.toFixed(3) || '0'}
                                onChange={(e) => handlePositionChange('y', e.target.value)}
                                step="0.001"
                            />
                        </div>
                        <div className="floating-annotation-creator__coord-input">
                            <label>Z</label>
                            <input
                                type="number"
                                value={localPosition.z?.toFixed(3) || '0'}
                                onChange={(e) => handlePositionChange('z', e.target.value)}
                                step="0.001"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="floating-annotation-creator__position-display">
                        <span className="coord"><span className="label">X</span>{localPosition.x?.toFixed(2) || '0.00'}</span>
                        <span className="coord"><span className="label">Y</span>{localPosition.y?.toFixed(2) || '0.00'}</span>
                        <span className="coord"><span className="label">Z</span>{localPosition.z?.toFixed(2) || '0.00'}</span>
                    </div>
                )}
            </div>

            {/* Type Selection */}
            <div className="floating-annotation-creator__types">
                {ANNOTATION_TYPES.map((t) => (
                    <button
                        key={t.value}
                        className={`floating-annotation-creator__type floating-annotation-creator__type--${t.color} ${type === t.value ? 'active' : ''}`}
                        onClick={() => setType(t.value)}
                        title={t.label}
                    >
                        <span className="floating-annotation-creator__type-icon"><Icon name={t.icon} size={14} /></span>
                        <span className="floating-annotation-creator__type-label">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Text Input */}
            <div className="floating-annotation-creator__input-wrapper">
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter annotation text..."
                    className="floating-annotation-creator__input"
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="floating-annotation-creator__actions">
                <button
                    className="floating-annotation-creator__btn floating-annotation-creator__btn--cancel"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    className="floating-annotation-creator__btn floating-annotation-creator__btn--submit"
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                >
                    <Icon name="mapPin" size={12} />
                    Create
                </button>
            </div>

            {/* Hint */}
            <div className="floating-annotation-creator__hint">
                <kbd>Enter</kbd> to create · <kbd>Esc</kbd> to cancel
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

export default FloatingAnnotationCreator;