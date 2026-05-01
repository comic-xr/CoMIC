/**
 * PreviewHintBanner - Banner shown when panel is in preview mode
 *
 * Displays a hint to users that the panel is temporary and can be pinned.
 *
 * @module PreviewHintBanner
 */

import React from 'react';
import './PreviewHintBanner.scss';

/**
 * PreviewHintBanner Component
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether to show the banner (default true)
 */
export function PreviewHintBanner({ visible = true }) {
    if (!visible) return null;

    return (
        <div
            className="preview-hint-banner"
            role="status"
            aria-live="polite"
        >
            <span className="preview-hint-banner__label">Preview</span>
            <span className="preview-hint-banner__text">
                Click pin or tab to keep open
            </span>
        </div>
    );
}

export default PreviewHintBanner;
