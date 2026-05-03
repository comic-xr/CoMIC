/**
 * @file useWristPosition.js
 * @description Hook to get wrist position from VRManager hand tracking.
 *
 * Returns the position of the specified wrist in world space.
 * Position is 5cm above the wrist joint, facing the user.
 */

import { useState, useEffect, useMemo } from 'react';
import { vrManager } from '@Core/vr/VRManager.js';

/**
 * Default position when not tracking
 */
const DEFAULT_POSITION = {
    x: 0,
    y: 0,
    z: 0,
    rotation: { x: 0, y: 0, z: 0 },
    isTracking: false,
};

/**
 * Hook to get wrist position from VR hand tracking
 *
 * @param {string} hand - 'left' or 'right'
 * @param {number} offsetY - Offset above wrist in meters (default 0.05 = 5cm)
 * @returns {Object} Position and rotation data
 */
export function useWristPosition(hand = 'left', offsetY = 0.05) {
    const [position, setPosition] = useState(DEFAULT_POSITION);

    useEffect(() => {
        if (!vrManager) return;

        const handleFrame = (frameData) => {
            // Get hand data from VRManager
            const hands = vrManager.getHands?.();
            const handData = hands?.[hand];

            if (!handData || !handData.joints) {
                setPosition(prev => ({ ...prev, isTracking: false }));
                return;
            }

            // Get wrist joint position
            const wristJoint = handData.joints['wrist'];
            if (!wristJoint) {
                setPosition(prev => ({ ...prev, isTracking: false }));
                return;
            }

            // Calculate menu position (offset above wrist)
            const menuPosition = {
                x: wristJoint.position?.x || 0,
                y: (wristJoint.position?.y || 0) + offsetY,
                z: wristJoint.position?.z || 0,
                rotation: {
                    x: wristJoint.rotation?.x || 0,
                    y: wristJoint.rotation?.y || 0,
                    z: wristJoint.rotation?.z || 0,
                },
                isTracking: true,
            };

            setPosition(menuPosition);
        };

        // Also support controller-based positioning (fallback)
        const handleControllerUpdate = (event) => {
            const { handedness, gripPose } = event.detail || event;

            if (handedness !== hand || !gripPose) return;

            // Use grip pose position with offset
            const menuPosition = {
                x: gripPose.position?.x || 0,
                y: (gripPose.position?.y || 0) + offsetY,
                z: gripPose.position?.z || 0,
                rotation: {
                    x: gripPose.rotation?.x || 0,
                    y: gripPose.rotation?.y || 0,
                    z: gripPose.rotation?.z || 0,
                },
                isTracking: true,
            };

            setPosition(menuPosition);
        };

        vrManager.on('frame', handleFrame);
        vrManager.on('controllerUpdate', handleControllerUpdate);

        return () => {
            vrManager.off('frame', handleFrame);
            vrManager.off('controllerUpdate', handleControllerUpdate);
        };
    }, [hand, offsetY]);

    return position;
}

/**
 * Hook to check if user is looking at their wrist
 *
 * @param {Object} wristPosition - Position from useWristPosition
 * @param {number} threshold - Angle threshold in degrees (default 30)
 * @returns {boolean} Whether user is looking at wrist
 */
export function useIsLookingAtWrist(wristPosition, threshold = 30) {
    const [isLooking, setIsLooking] = useState(false);

    useEffect(() => {
        if (!vrManager || !wristPosition.isTracking) {
            setIsLooking(false);
            return;
        }

        const checkGaze = () => {
            // Get head position and direction from VRManager
            const headPose = vrManager.getHeadPose?.();
            if (!headPose) return;

            // Calculate direction from head to wrist
            const toWrist = {
                x: wristPosition.x - (headPose.position?.x || 0),
                y: wristPosition.y - (headPose.position?.y || 0),
                z: wristPosition.z - (headPose.position?.z || 0),
            };

            // Normalize
            const length = Math.sqrt(toWrist.x ** 2 + toWrist.y ** 2 + toWrist.z ** 2);
            if (length === 0) return;

            toWrist.x /= length;
            toWrist.y /= length;
            toWrist.z /= length;

            // Get head forward direction (simplified - assumes -Z is forward)
            const forward = headPose.forward || { x: 0, y: 0, z: -1 };

            // Calculate dot product for angle
            const dot = toWrist.x * forward.x + toWrist.y * forward.y + toWrist.z * forward.z;
            const angle = Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI);

            setIsLooking(angle < threshold);
        };

        const frameHandler = () => checkGaze();
        vrManager.on('frame', frameHandler);

        return () => {
            vrManager.off('frame', frameHandler);
        };
    }, [wristPosition, threshold]);

    return isLooking;
}

export default useWristPosition;
