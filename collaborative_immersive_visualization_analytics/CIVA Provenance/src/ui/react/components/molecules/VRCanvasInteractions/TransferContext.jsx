/**
 * @file TransferContext.jsx
 * @description Context for managing VR canvas transfer state.
 * Replaces drag-and-drop with tap-to-select flow for VR.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Drop zone types for canvas cells.
 */
export const DROP_ZONES = {
    NONE: 'none',
    PLACE: 'place',
    SWAP: 'swap',
    PUSH_UP: 'push-up',
    PUSH_DOWN: 'push-down',
    PUSH_LEFT: 'push-left',
    PUSH_RIGHT: 'push-right',
};

/**
 * Canvas edge positions.
 */
export const EDGE_POSITIONS = {
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
};

// =============================================================================
// CONTEXT
// =============================================================================

const TransferContext = createContext(null);

/**
 * TransferProvider - Manages VR canvas transfer state
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Function} props.onTransfer - Called when transfer is confirmed
 */
export function TransferProvider({ children, onTransfer }) {
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferSource, setTransferSource] = useState(null);
    const [targetCell, setTargetCell] = useState(null);
    const [selectedZone, setSelectedZone] = useState(DROP_ZONES.PLACE);
    const [showZonePicker, setShowZonePicker] = useState(false);
    const [modifiers, setModifiers] = useState({
        wrap: false,
        closeOther: false,
        createLinked: false,
    });

    // Start transfer from a source
    const startTransfer = useCallback((sourceType, sourceData) => {
        setIsTransferring(true);
        setTransferSource({ type: sourceType, ...sourceData });
        setTargetCell(null);
        setSelectedZone(DROP_ZONES.PLACE);
    }, []);

    // Select a target cell
    const selectTargetCell = useCallback((row, col, isEmpty, existingPlacement) => {
        setTargetCell({ row, col, isEmpty, existingPlacement });
        // If cell is occupied, show zone picker for push/swap options
        if (!isEmpty) {
            setShowZonePicker(true);
            setSelectedZone(DROP_ZONES.SWAP);
        }
    }, []);

    // Confirm the transfer
    const confirmTransfer = useCallback(() => {
        if (transferSource && targetCell) {
            onTransfer?.({
                source: transferSource,
                target: targetCell,
                zone: selectedZone,
                modifiers,
            });
        }
        // Reset state
        setIsTransferring(false);
        setTransferSource(null);
        setTargetCell(null);
        setSelectedZone(DROP_ZONES.PLACE);
        setShowZonePicker(false);
        setModifiers({ wrap: false, closeOther: false, createLinked: false });
    }, [transferSource, targetCell, selectedZone, modifiers, onTransfer]);

    // Cancel transfer
    const cancelTransfer = useCallback(() => {
        setIsTransferring(false);
        setTransferSource(null);
        setTargetCell(null);
        setSelectedZone(DROP_ZONES.PLACE);
        setShowZonePicker(false);
        setModifiers({ wrap: false, closeOther: false, createLinked: false });
    }, []);

    // Toggle a modifier
    const toggleModifier = useCallback((key) => {
        setModifiers((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const contextValue = useMemo(
        () => ({
            isTransferring,
            transferSource,
            targetCell,
            selectedZone,
            setSelectedZone,
            showZonePicker,
            setShowZonePicker,
            modifiers,
            toggleModifier,
            startTransfer,
            selectTargetCell,
            confirmTransfer,
            cancelTransfer,
        }),
        [
            isTransferring,
            transferSource,
            targetCell,
            selectedZone,
            showZonePicker,
            modifiers,
            toggleModifier,
            startTransfer,
            selectTargetCell,
            confirmTransfer,
            cancelTransfer,
        ]
    );

    return (
        <TransferContext.Provider value={contextValue}>
            {children}
        </TransferContext.Provider>
    );
}

/**
 * useTransfer - Access transfer context
 * @returns {Object} Transfer context value
 */
export function useTransfer() {
    const context = useContext(TransferContext);
    if (!context) {
        throw new Error('useTransfer must be used within TransferProvider');
    }
    return context;
}

export default TransferProvider;
