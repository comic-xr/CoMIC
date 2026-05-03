/**
 * VRInteractionOverlay Component
 *
 * Shows current interaction state in VR mode.
 * Displays instruction text and available actions.
 *
 * @module VRInteractionOverlay
 */

import React, { memo } from 'react';
import { useVRInteraction, INTERACTION_INTENTS } from '@UI/react/context/VRInteractionContext';
import { Icon } from '@UI/react/components/atoms/Icon';
import './VRInteractionUI.scss';

/**
 * VRInteractionOverlay - Shows interaction state and instructions
 */
export const VRInteractionOverlay = memo(function VRInteractionOverlay() {
    const { isVR, activeInteraction, selection } = useVRInteraction();

    if (!isVR) return null;

    const showOverlay = activeInteraction || selection;
    if (!showOverlay) return null;

    return (
        <div className="vr-interaction-overlay">
            {activeInteraction?.intent === INTERACTION_INTENTS.LINK && (
                <div className="vr-interaction-overlay__content">
                    <div className="vr-interaction-overlay__icon">
                        <Icon name="link2" size={20} />
                    </div>
                    <div className="vr-interaction-overlay__title">
                        Linking Mode
                    </div>
                    <div className="vr-interaction-overlay__instruction">
                        {activeInteraction.step === 1
                            ? 'Point at a view and press trigger to link'
                            : 'Confirm link target'
                        }
                    </div>
                    <div className="vr-interaction-overlay__hint">
                        Press B to cancel
                    </div>
                </div>
            )}

            {selection?.type === 'reorder' && (
                <div className="vr-interaction-overlay__content">
                    <div className="vr-interaction-overlay__icon">
                        <Icon name="gripVertical" size={20} />
                    </div>
                    <div className="vr-interaction-overlay__title">
                        Reordering
                    </div>
                    <div className="vr-interaction-overlay__instruction">
                        Use thumbstick up/down to move item
                    </div>
                    <div className="vr-interaction-overlay__hint">
                        Press A to confirm &bull; Press B to cancel
                    </div>
                </div>
            )}

            {selection?.type === 'resize' && (
                <div className="vr-interaction-overlay__content">
                    <div className="vr-interaction-overlay__icon">
                        <Icon name="maximize" size={20} />
                    </div>
                    <div className="vr-interaction-overlay__title">
                        Resizing ({selection.data?.edge})
                    </div>
                    <div className="vr-interaction-overlay__instruction">
                        Use thumbstick to adjust size
                    </div>
                    <div className="vr-interaction-overlay__hint">
                        Press A to confirm &bull; Press B to cancel
                    </div>
                </div>
            )}

            {activeInteraction?.intent === INTERACTION_INTENTS.TRANSFER && (
                <div className="vr-interaction-overlay__content">
                    <div className="vr-interaction-overlay__icon">
                        <Icon name="move" size={20} />
                    </div>
                    <div className="vr-interaction-overlay__title">
                        Transfer Mode
                    </div>
                    <div className="vr-interaction-overlay__instruction">
                        Point at destination and press trigger
                    </div>
                    <div className="vr-interaction-overlay__hint">
                        Press B to cancel
                    </div>
                </div>
            )}
        </div>
    );
});

export default VRInteractionOverlay;
