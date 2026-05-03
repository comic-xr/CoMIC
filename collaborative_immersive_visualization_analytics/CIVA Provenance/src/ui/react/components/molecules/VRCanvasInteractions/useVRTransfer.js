/**
 * @file useVRTransfer.js
 * @description Hook that wraps TransferProvider with canvas-specific handlers.
 */

import React, { useCallback } from 'react';
import { TransferProvider, DROP_ZONES } from './TransferContext';

/**
 * useVRTransfer - Complete hook for VR canvas transfer
 *
 * @param {Object} options
 * @param {Function} options.onPlace - Called when placing in empty cell
 * @param {Function} options.onSwap - Called when swapping with existing
 * @param {Function} options.onPush - Called when pushing in direction
 * @param {Function} options.onExpand - Called when expanding canvas edge
 * @returns {Object} TransferProvider component and handlers
 *
 * @example
 * const { TransferProvider, handleExpand } = useVRTransfer({
 *   onPlace: (source, row, col, modifiers) => { ... },
 *   onSwap: (source, row, col, existing, modifiers) => { ... },
 *   onPush: (source, row, col, direction, modifiers) => { ... },
 *   onExpand: (position, source) => { ... },
 * });
 */
export function useVRTransfer({ onPlace, onSwap, onPush, onExpand }) {
    const handleTransfer = useCallback(
        ({ source, target, zone, modifiers }) => {
            const { row, col, isEmpty, existingPlacement } = target;

            switch (zone) {
                case DROP_ZONES.PLACE:
                    onPlace?.(source, row, col, modifiers);
                    break;

                case DROP_ZONES.SWAP:
                    onSwap?.(source, row, col, existingPlacement, modifiers);
                    break;

                case DROP_ZONES.PUSH_UP:
                case DROP_ZONES.PUSH_DOWN:
                case DROP_ZONES.PUSH_LEFT:
                case DROP_ZONES.PUSH_RIGHT:
                    const direction = zone.replace('push-', '');
                    onPush?.(source, row, col, direction, modifiers);
                    break;

                default:
                    break;
            }
        },
        [onPlace, onSwap, onPush]
    );

    const handleExpand = useCallback(
        (position, source) => {
            onExpand?.(position, source);
        },
        [onExpand]
    );

    // Return a configured provider component
    const ConfiguredProvider = useCallback(
        ({ children }) => (
            <TransferProvider onTransfer={handleTransfer}>
                {children}
            </TransferProvider>
        ),
        [handleTransfer]
    );

    return {
        TransferProvider: ConfiguredProvider,
        handleTransfer,
        handleExpand,
    };
}

export default useVRTransfer;
