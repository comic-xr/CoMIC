/**
 * @file LayoutPickerPanel.jsx
 * @description Floating panel for selecting layouts in ViewGroup Editor.
 *
 * Features:
 * - Built-in layouts in 4-column grid
 * - Custom layouts section
 * - Save current as template action
 * - Active layout highlighted with ViewGroup color
 *
 * @example
 * <LayoutPickerPanel
 *   isOpen={showPicker}
 *   onClose={() => setShowPicker(false)}
 *   builtinLayouts={BUILTIN_LAYOUTS}
 *   customLayouts={customLayouts}
 *   currentLayoutId={viewGroup.layoutId}
 *   viewGroupColor={viewGroup.color}
 *   onSelectLayout={handleLayoutSelect}
 *   onSaveAsCurrent={handleSaveAsTemplate}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LayoutPreview } from './LayoutPreview';

/**
 * LayoutPickerPanel component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {Function} props.onClose - Close panel handler
 * @param {Array} props.builtinLayouts - Array of built-in layout configurations
 * @param {Array} props.customLayouts - Array of custom layout configurations
 * @param {string} props.currentLayoutId - Currently active layout ID
 * @param {string} props.viewGroupColor - ViewGroup accent color
 * @param {Function} props.onSelectLayout - Layout selection handler
 * @param {Function} [props.onSaveAsCurrent] - Save current layout as template handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement|null}
 */
export const LayoutPickerPanel = memo(function LayoutPickerPanel({
    isOpen,
    onClose,
    builtinLayouts,
    customLayouts,
    currentLayoutId,
    viewGroupColor,
    onSelectLayout,
    onSaveAsCurrent,
    className = '',
}) {
    if (!isOpen) return null;

    const handleLayoutClick = (layout) => {
        onSelectLayout?.(layout);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="layout-picker-panel__backdrop"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`layout-picker-panel ${className}`}>
                {/* Header */}
                <div className="layout-picker-panel__header">
                    <span className="layout-picker-panel__title">Choose Layout</span>
                    <button
                        className="layout-picker-panel__close"
                        onClick={onClose}
                    >
                        <Icon name="x" size={16} />
                    </button>
                </div>

                {/* Built-in layouts */}
                <div className="layout-picker-panel__section">
                    <div className="layout-picker-panel__section-label">BUILT-IN</div>
                    <div className="layout-picker-panel__grid">
                        {builtinLayouts.map(layout => (
                            <button
                                key={layout.id}
                                className={`layout-picker-panel__item ${currentLayoutId === layout.id ? 'layout-picker-panel__item--active' : ''}`}
                                onClick={() => handleLayoutClick(layout)}
                                style={{
                                    '--active-color': viewGroupColor,
                                }}
                            >
                                <LayoutPreview
                                    layout={layout}
                                    size="sm"
                                    active={currentLayoutId === layout.id}
                                    color={viewGroupColor}
                                />
                                <span className="layout-picker-panel__item-name">
                                    {layout.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom layouts */}
                {customLayouts && customLayouts.length > 0 && (
                    <div className="layout-picker-panel__section">
                        <div className="layout-picker-panel__section-label">CUSTOM</div>
                        <div className="layout-picker-panel__grid">
                            {customLayouts.map(layout => (
                                <button
                                    key={layout.id}
                                    className={`layout-picker-panel__item ${currentLayoutId === layout.id ? 'layout-picker-panel__item--active' : ''}`}
                                    onClick={() => handleLayoutClick(layout)}
                                    style={{
                                        '--active-color': viewGroupColor,
                                    }}
                                >
                                    <LayoutPreview
                                        layout={layout}
                                        size="sm"
                                        active={currentLayoutId === layout.id}
                                        color={viewGroupColor}
                                    />
                                    <span className="layout-picker-panel__item-name layout-picker-panel__item-name--custom">
                                        {layout.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Save action */}
                <div className="layout-picker-panel__footer">
                    <button
                        className="layout-picker-panel__save"
                        onClick={onSaveAsCurrent}
                    >
                        <Icon name="save" size={16} />
                        <span>Save current as template...</span>
                    </button>
                </div>
            </div>
        </>
    );
});

export default LayoutPickerPanel;
