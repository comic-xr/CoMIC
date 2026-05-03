/**
 * @file VRLinkingInstructions.jsx
 * @description HUD overlay showing linking instructions during VR link flow.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './VRViewLinking.scss';

/**
 * VRLinkingInstructions - HUD overlay with linking instructions
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Whether linking mode is active
 * @param {number} props.step - Current step (1: select target, 2: confirm)
 * @param {string} [props.sourceViewName] - Name of source view
 * @param {string} [props.targetViewName] - Name of target view
 * @param {Function} [props.onCancel] - Cancel handler
 */
export const VRLinkingInstructions = memo(function VRLinkingInstructions({
    isActive,
    step,
    sourceViewName,
    targetViewName,
    onCancel,
}) {
    if (!isActive) return null;

    return (
        <div className="vr-linking-instructions">
            {/* Progress indicator */}
            <div className="vr-linking-instructions__progress">
                <div
                    className={`vr-linking-instructions__dot ${
                        step >= 1 ? 'vr-linking-instructions__dot--active' : ''
                    }`}
                />
                <div
                    className={`vr-linking-instructions__line ${
                        step >= 2 ? 'vr-linking-instructions__line--active' : ''
                    }`}
                />
                <div
                    className={`vr-linking-instructions__dot ${
                        step >= 2 ? 'vr-linking-instructions__dot--active' : ''
                    }`}
                />
            </div>

            {/* Main instruction */}
            <div className="vr-linking-instructions__main">
                {step === 1 && (
                    <>
                        <Icon name="link" size={18} />
                        <span>
                            Point at a view and tap to link from "
                            {sourceViewName}"
                        </span>
                    </>
                )}
                {step === 2 && (
                    <>
                        <Icon name="check" size={18} />
                        <span>Select link options for "{targetViewName}"</span>
                    </>
                )}
            </div>

            {/* Sub instruction */}
            <div className="vr-linking-instructions__sub">
                {step === 1 && 'Valid targets are highlighted'}
                {step === 2 && 'Choose what to sync'}
            </div>

            {/* Cancel button */}
            <button
                onClick={onCancel}
                className="vr-linking-instructions__cancel"
            >
                <span className="vr-linking-instructions__cancel-key">B</span>
                Cancel
            </button>
        </div>
    );
});

export default VRLinkingInstructions;
