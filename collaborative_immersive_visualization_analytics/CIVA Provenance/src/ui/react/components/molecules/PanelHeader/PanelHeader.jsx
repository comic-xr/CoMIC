// src/ui/react/components/molecules/PanelHeader/PanelHeader.jsx
// PanelHeader molecule - Panel header with title, icon, and action buttons

import React, { memo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './PanelHeader.scss';

// Icon sizes by mode
const ICON_SIZES = {
    desktop: { sm: 14, md: 16, lg: 18 },
    vr: { sm: 18, md: 20, lg: 24 },
};

/**
 * PanelHeader - Panel header with title, icon, and action buttons
 *
 * Composed from: Icon atom + IconButton atom
 *
 * Use for:
 * - Floating panel headers
 * - Docked panel headers
 * - Card headers
 * - Section headers with actions
 *
 * @param {string} title - Panel title
 * @param {string} icon - Icon name (optional)
 * @param {string} color - Accent color: 'blue' | 'purple' | 'teal' | 'amber' | 'red' | 'green'
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {boolean} showDragHandle - Show drag grip handle
 * @param {boolean} minimized - Current minimized state (for toggle icon)
 * @param {function} onMinimize - Minimize/toggle handler
 * @param {function} onMaximize - Maximize handler
 * @param {function} onDock - Dock/undock handler
 * @param {function} onClose - Close handler
 * @param {function} onMouseDown - Mouse down for dragging
 * @param {Array} actions - Additional action buttons: [{ icon, onClick, tooltip, danger? }]
 * @param {React.ReactNode} children - Custom content in header
 * @param {string} className - Additional CSS classes
 */
export const PanelHeader = memo(function PanelHeader({
    title,
    icon,
    color = 'blue',
    size = 'md',
    showDragHandle = false,
    minimized = false,
    onMinimize,
    onMaximize,
    onDock,
    onClose,
    onMouseDown,
    actions = [],
    children,
    className = '',
}) {
    const { isVR, mode } = useAdaptive();

    const iconSize = ICON_SIZES[mode || 'desktop']?.[size] ?? ICON_SIZES.desktop.md;

    const classList = [
        'panel-header',
        `panel-header--${size}`,
        `panel-header--${color}`,
        showDragHandle && 'panel-header--draggable',
        isVR && 'panel-header--vr',
        className,
    ].filter(Boolean).join(' ');

    const hasControls = onMinimize || onMaximize || onDock || onClose || actions.length > 0;

    return (
        <div
            className={classList}
            onMouseDown={onMouseDown}
        >
            {showDragHandle && (
                <span className="panel-header__drag-handle">
                    <Icon name="gripVertical" size={iconSize} />
                </span>
            )}

            {icon && (
                <span className="panel-header__icon">
                    <Icon name={icon} size={iconSize} />
                </span>
            )}

            {title && (
                <span className="panel-header__title">{title}</span>
            )}

            <span className="panel-header__spacer" />

            {children}

            {hasControls && (
                <span className="panel-header__controls">
                    {/* Custom actions */}
                    {actions.map((action, index) => (
                        <IconButton
                            key={index}
                            icon={action.icon}
                            size="sm"
                            variant="ghost"
                            onClick={action.onClick}
                            tooltip={action.tooltip}
                            className={action.danger ? 'panel-header__btn--danger' : ''}
                        />
                    ))}

                    {/* Standard controls */}
                    {onMinimize && (
                        <IconButton
                            icon={minimized ? 'maximize' : 'minus'}
                            size="sm"
                            variant="ghost"
                            onClick={onMinimize}
                            tooltip={minimized ? 'Expand' : 'Minimize'}
                        />
                    )}

                    {onMaximize && (
                        <IconButton
                            icon="maximize"
                            size="sm"
                            variant="ghost"
                            onClick={onMaximize}
                            tooltip="Maximize"
                        />
                    )}

                    {onDock && (
                        <IconButton
                            icon="pinOff"
                            size="sm"
                            variant="ghost"
                            onClick={onDock}
                            tooltip="Dock panel"
                        />
                    )}

                    {onClose && (
                        <IconButton
                            icon="close"
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            tooltip="Close"
                            className="panel-header__btn--close"
                        />
                    )}
                </span>
            )}
        </div>
    );
});

export default PanelHeader;
