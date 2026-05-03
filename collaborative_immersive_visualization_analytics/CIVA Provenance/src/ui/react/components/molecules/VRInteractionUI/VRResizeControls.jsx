/**
 * VRResizeControls Component
 *
 * Controls for resizing elements in VR.
 *
 * @module VRResizeControls
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VRButton } from './VRButton';
import './VRInteractionUI.scss';

/**
 * VRResizeControls - Size adjustment controls
 *
 * @param {Object} props
 * @param {Object} props.controls - Resize controls from useResizeInteraction
 * @param {Object} props.position - Position offsets
 * @param {string} props.className - Additional CSS classes
 */
export const VRResizeControls = memo(function VRResizeControls({
    controls,
    position = {},
    className = '',
}) {
    if (!controls) return null;

    const isHorizontal = controls.edge.includes('e') || controls.edge.includes('w');
    const isVertical = controls.edge.includes('n') || controls.edge.includes('s');

    return (
        <div
            className={`vr-resize-controls ${className}`}
            style={position}
        >
            {isHorizontal && (
                <div className="vr-resize-controls__row">
                    <VRButton
                        onClick={controls.decrease}
                        icon={<Icon name="arrowLeft" size={16} />}
                        label="Narrower"
                        size="sm"
                    />
                    <VRButton
                        onClick={controls.increase}
                        icon={<Icon name="arrowRight" size={16} />}
                        label="Wider"
                        size="sm"
                    />
                </div>
            )}
            {isVertical && (
                <div className="vr-resize-controls__row">
                    <VRButton
                        onClick={controls.decrease}
                        icon={<Icon name="arrowUp" size={16} />}
                        label="Shorter"
                        size="sm"
                    />
                    <VRButton
                        onClick={controls.increase}
                        icon={<Icon name="arrowDown" size={16} />}
                        label="Taller"
                        size="sm"
                    />
                </div>
            )}
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

export default VRResizeControls;
