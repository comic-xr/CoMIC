/**
 * VRReorderControls Component
 *
 * Floating up/down buttons for reordering items in VR.
 *
 * @module VRReorderControls
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VRButton } from './VRButton';
import './VRInteractionUI.scss';

/**
 * VRReorderControls - Up/down controls for reordering
 *
 * @param {Object} props
 * @param {Object} props.controls - Reorder controls from useReorderInteraction
 * @param {Object} props.position - Position offsets { top, left, right, bottom }
 * @param {string} props.className - Additional CSS classes
 */
export const VRReorderControls = memo(function VRReorderControls({
    controls,
    position = {},
    className = '',
}) {
    if (!controls) return null;

    return (
        <div
            className={`vr-reorder-controls ${className}`}
            style={position}
        >
            <VRButton
                onClick={controls.moveUp}
                disabled={!controls.canMoveUp}
                icon={<Icon name="chevronUp" size={16} />}
                label="Up"
                size="sm"
            />
            <VRButton
                onClick={controls.moveDown}
                disabled={!controls.canMoveDown}
                icon={<Icon name="chevronDown" size={16} />}
                label="Down"
                size="sm"
            />
            <VRButton
                onClick={controls.done}
                icon={<Icon name="check" size={16} />}
                label="Done"
                variant="primary"
                size="sm"
            />
        </div>
    );
});

export default VRReorderControls;
