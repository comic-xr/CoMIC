// src/ui/react/components/molecules/QuickLinkPopup/QuickLinkPopup.jsx
// Property and mode selector popup for drag-to-link

import React, { memo, useState, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import './QuickLinkPopup.scss';

// =============================================================================
// LINK CONFIGURATION
// =============================================================================

const LINK_PROPERTIES = [
    { id: 'camera', icon: 'camera', label: 'Camera' },
    { id: 'filters', icon: 'sliders', label: 'Filters' },
    { id: 'colorMaps', icon: 'palette', label: 'Colors' },
    { id: 'widgets', icon: 'layout', label: 'Widgets' },
    { id: 'cursors', icon: 'crosshair', label: 'Cursors' },
    { id: 'annotationDisplay', icon: 'eye', label: 'Annotations' },
];

const LINK_MODES = [
    { id: 'follow', icon: '←', label: 'Follow', desc: 'Receive updates only' },
    { id: 'sync', icon: '↔', label: 'Sync', desc: 'Two-way sync' },
    { id: 'broadcast', icon: '→', label: 'Broadcast', desc: 'Send updates only' },
];

/**
 * QuickLinkPopup - Property and mode selector that appears on drop
 *
 * @param {object} sourceView - Source view object { id, name, color }
 * @param {object} targetView - Target view object { id, name, color }
 * @param {object} position - Position { x, y } for popup placement
 * @param {function} onConfirm - Callback with (properties[], mode)
 * @param {function} onCancel - Cancel callback
 */
export const QuickLinkPopup = memo(function QuickLinkPopup({
    sourceView,
    targetView,
    position,
    onConfirm,
    onCancel,
}) {
    const [selectedProperties, setSelectedProperties] = useState(['camera']);
    const [selectedMode, setSelectedMode] = useState('sync');
    const popupRef = useRef(null);

    // Toggle property selection
    const toggleProperty = (propId) => {
        setSelectedProperties((prev) => {
            if (prev.includes(propId)) {
                // Don't allow deselecting all
                if (prev.length === 1) return prev;
                return prev.filter((id) => id !== propId);
            }
            return [...prev, propId];
        });
    };

    // Select all properties
    const selectAll = () => {
        setSelectedProperties(LINK_PROPERTIES.map((p) => p.id));
    };

    // Click outside to cancel
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                onCancel();
            }
        };

        // Delay to prevent immediate close from drop click
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onCancel]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm(selectedProperties, selectedMode);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedProperties, selectedMode, onConfirm]);

    // Position popup (constrain to viewport)
    const popupStyle = {
        left: Math.min(position.x, window.innerWidth - 340),
        top: Math.min(position.y, window.innerHeight - 360),
    };

    // Truncate view name
    const truncateName = (name) =>
        name.length > 15 ? name.slice(0, 13) + '...' : name;

    return (
        <div ref={popupRef} className="quick-link-popup" style={popupStyle}>
            {/* Header */}
            <div className="quick-link-popup__header">
                <div className="quick-link-popup__views">
                    <ColorDot color={sourceView.color} size={8} />
                    <span className="quick-link-popup__view-name">
                        {truncateName(sourceView.name)}
                    </span>
                    <span className="quick-link-popup__arrow">→</span>
                    <ColorDot color={targetView.color} size={8} />
                    <span className="quick-link-popup__view-name">
                        {truncateName(targetView.name)}
                    </span>
                </div>
            </div>

            {/* Property Selection */}
            <div className="quick-link-popup__section">
                <div className="quick-link-popup__section-header">
                    <span className="quick-link-popup__section-title">Properties</span>
                    <button
                        className="quick-link-popup__select-all"
                        onClick={selectAll}
                        type="button"
                    >
                        Select All
                    </button>
                </div>

                <div className="quick-link-popup__properties">
                    {LINK_PROPERTIES.map((prop) => (
                        <button
                            key={prop.id}
                            className={`quick-link-popup__property ${
                                selectedProperties.includes(prop.id)
                                    ? 'quick-link-popup__property--selected'
                                    : ''
                            }`}
                            onClick={() => toggleProperty(prop.id)}
                            type="button"
                        >
                            <Icon name={prop.icon} size={12} />
                            {prop.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode Selection */}
            <div className="quick-link-popup__section">
                <span className="quick-link-popup__section-title">Mode</span>

                <div className="quick-link-popup__modes">
                    {LINK_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            className={`quick-link-popup__mode ${
                                selectedMode === mode.id
                                    ? 'quick-link-popup__mode--selected'
                                    : ''
                            }`}
                            onClick={() => setSelectedMode(mode.id)}
                            type="button"
                        >
                            <span className="quick-link-popup__mode-icon">
                                {mode.icon}
                            </span>
                            <span className="quick-link-popup__mode-label">
                                {mode.label}
                            </span>
                            <span className="quick-link-popup__mode-desc">
                                {mode.desc}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="quick-link-popup__actions">
                <button
                    className="quick-link-popup__btn quick-link-popup__btn--cancel"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </button>
                <button
                    className="quick-link-popup__btn quick-link-popup__btn--confirm"
                    onClick={() => onConfirm(selectedProperties, selectedMode)}
                    type="button"
                >
                    Create Link
                </button>
            </div>

            {/* Keyboard hint */}
            <div className="quick-link-popup__hint">
                Press <kbd>Enter</kbd> to confirm · <kbd>Esc</kbd> to cancel
            </div>
        </div>
    );
});

export default QuickLinkPopup;
