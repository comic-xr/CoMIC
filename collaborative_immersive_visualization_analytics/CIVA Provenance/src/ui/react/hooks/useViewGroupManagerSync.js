/**
 * @file useViewGroupManagerSync.js
 * @description Connects WebSocket broadcasts to ViewGroupManager.
 * Should be called once near the app root (e.g., in CanvasWorkspace).
 */

import { useEffect } from 'react';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager.js';

/**
 * Bridges WebSocket broadcast events to ViewGroupManager.handleServerBroadcast.
 *
 * Listens for 'cia:ws-broadcast' CustomEvents on window and forwards
 * viewgroup/vglink/viewlink events to the manager for state reconciliation.
 */
export function useViewGroupManagerSync() {
    useEffect(() => {
        const handleBroadcast = (event) => {
            const { type, data } = event.detail || {};
            if (
                type?.startsWith('viewgroup:') ||
                type?.startsWith('vglink:') ||
                type?.startsWith('viewlink:')
            ) {
                viewGroupManager.handleServerBroadcast(type, data);
            }
        };

        window.addEventListener('cia:ws-broadcast', handleBroadcast);
        return () => window.removeEventListener('cia:ws-broadcast', handleBroadcast);
    }, []);
}

export default useViewGroupManagerSync;
