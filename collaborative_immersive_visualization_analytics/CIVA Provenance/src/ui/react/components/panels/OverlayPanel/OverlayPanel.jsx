/**
 * OverlayPanel - Panel that overlays canvas with preview/pinned states
 *
 * Renders as an absolute-positioned panel that slides in from the side.
 * Supports two visual states:
 * - Preview: More transparent with animated border glow
 * - Pinned: Full opacity, standard appearance
 *
 * @module OverlayPanel
 */

import React from 'react';
import classNames from 'classnames';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { OverlayPanelHeader } from '@UI/react/components/molecules/OverlayPanelHeader';
import { PreviewHintBanner } from '@UI/react/components/atoms/PreviewHintBanner';
import './OverlayPanel.scss';

/**
 * OverlayPanel Component
 *
 * @param {Object} props
 * @param {'left'|'right'} props.side - Which side of the screen
 * @param {boolean} props.isOpen - Whether panel is pinned open
 * @param {boolean} props.isPreview - Whether panel is in preview/peek mode
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onPin - Pin handler (convert preview to pinned)
 * @param {Function} props.onPopOut - Pop-out handler (optional)
 * @param {string} props.title - Panel title
 * @param {string} props.tabId - Tab ID for this panel
 * @param {Function} props.onMouseEnter - Mouse enter panel handler
 * @param {Function} props.onMouseLeave - Mouse leave panel handler
 * @param {number} props.width - Panel width in pixels (optional, uses token default)
 * @param {React.ReactNode} props.children - Panel content
 */
export function OverlayPanel({
    side,
    isOpen,
    isPreview,
    onClose,
    onPin,
    onPopOut,
    title,
    tabId,
    onMouseEnter,
    onMouseLeave,
    width,
    children,
}) {
    const { tokens } = useAdaptive();

    const shouldShow = isOpen || isPreview;
    const panelWidth = width || tokens.panelWidth;

    return (
        <div
            className={classNames('overlay-panel', `overlay-panel--${side}`, {
                'overlay-panel--visible': shouldShow,
                'overlay-panel--preview': isPreview,
                'overlay-panel--pinned': isOpen && !isPreview,
            })}
            style={{
                width: panelWidth,
                // Panel positioned at edge of workspace - activity bar is in separate grid column
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            data-panel-id={tabId}
        >
            <OverlayPanelHeader
                title={title}
                isPreview={isPreview}
                onClose={onClose}
                onPin={onPin}
                onPopOut={onPopOut}
            />

            <PreviewHintBanner visible={isPreview} />

            <div className="overlay-panel__content">
                {children}
            </div>
        </div>
    );
}

export default OverlayPanel;
