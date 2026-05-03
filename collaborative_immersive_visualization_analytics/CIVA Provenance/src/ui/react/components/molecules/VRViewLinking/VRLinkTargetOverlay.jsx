/**
 * @file VRLinkTargetOverlay.jsx
 * @description Visual overlay showing link target validity during VR linking.
 * Wraps viewport content to indicate valid/invalid targets.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './VRViewLinking.scss';

/**
 * VRLinkTargetOverlay - Visual indicator on valid/invalid targets
 *
 * @param {Object} props
 * @param {string} props.viewId - View identifier
 * @param {string} props.viewName - View display name
 * @param {string} props.viewColor - View color
 * @param {boolean} props.isLinkingMode - Whether linking mode is active
 * @param {string} [props.sourceViewId] - ID of the source view
 * @param {boolean} [props.isValidTarget=false] - Whether this is a valid link target
 * @param {boolean} [props.isHovered=false] - Whether pointer is over this view
 * @param {Function} [props.onSelect] - Called when this target is selected
 * @param {React.ReactNode} props.children - Child content (viewport)
 */
export const VRLinkTargetOverlay = memo(function VRLinkTargetOverlay({
    viewId,
    viewName,
    viewColor,
    isLinkingMode,
    sourceViewId,
    isValidTarget = false,
    isHovered = false,
    onSelect,
    children,
}) {
    if (!isLinkingMode) {
        return children;
    }

    const isSource = viewId === sourceViewId;

    const classNames = [
        'vr-link-target-overlay',
        isSource && 'vr-link-target-overlay--source',
        isValidTarget && 'vr-link-target-overlay--valid',
        isValidTarget && isHovered && 'vr-link-target-overlay--valid-hovered',
        !isValidTarget && !isSource && 'vr-link-target-overlay--invalid',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classNames}>
            {children}

            {/* Source indicator */}
            {isSource && (
                <div className="vr-link-target-overlay__source-badge">
                    Linking from here
                </div>
            )}

            {/* Valid target prompt */}
            {isValidTarget && !isSource && isHovered && (
                <div
                    className="vr-link-target-overlay__prompt"
                    onClick={() => onSelect?.(viewId)}
                >
                    <div className="vr-link-target-overlay__prompt-content">
                        <div className="vr-link-target-overlay__prompt-icon">
                            <Icon name="link" size={24} />
                        </div>
                        <span className="vr-link-target-overlay__prompt-text">
                            Tap to link here
                        </span>
                        <span className="vr-link-target-overlay__prompt-name">
                            {viewName}
                        </span>
                    </div>
                </div>
            )}

            {/* Invalid target indicator */}
            {!isValidTarget && !isSource && (
                <div className="vr-link-target-overlay__invalid-badge">
                    Cannot link here
                </div>
            )}
        </div>
    );
});

export default VRLinkTargetOverlay;
