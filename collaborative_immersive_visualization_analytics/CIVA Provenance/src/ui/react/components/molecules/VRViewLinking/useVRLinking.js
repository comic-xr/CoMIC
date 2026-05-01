/**
 * @file useVRLinking.js
 * @description Hook that orchestrates the VR view linking flow.
 * Manages state for the tap-to-select linking interaction.
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * useVRLinking - Complete hook for VR view linking
 *
 * @param {Object} options
 * @param {Array} options.views - Array of view objects { id, name, color }
 * @param {Function} options.onCreateLink - Called when link is created (sourceId, targetId, property, mode)
 * @param {Function} [options.canLink] - Validation function (sourceId, targetId) => boolean
 * @returns {Object} VR linking state and handlers
 *
 * @example
 * const {
 *   isLinking,
 *   linkSource,
 *   linkStep,
 *   startLinking,
 *   selectTarget,
 *   confirmLink,
 *   cancelLinking,
 *   createBadgeProps,
 *   createTargetProps,
 *   instructionsProps,
 *   panelProps,
 * } = useVRLinking({
 *   views: viewsArray,
 *   onCreateLink: (sourceId, targetId, property, mode) => { ... },
 *   canLink: (sourceId, targetId) => sourceId !== targetId,
 * });
 */
export function useVRLinking({ views, onCreateLink, canLink }) {
    const [isLinking, setIsLinking] = useState(false);
    const [linkSource, setLinkSource] = useState(null);
    const [linkTarget, setLinkTarget] = useState(null);
    const [linkStep, setLinkStep] = useState(0);
    const [showPanel, setShowPanel] = useState(false);

    // Start linking from a view
    const startLinking = useCallback((viewId, viewData) => {
        setIsLinking(true);
        setLinkSource({ id: viewId, ...viewData });
        setLinkStep(1);
    }, []);

    // Select a target view
    const selectTarget = useCallback(
        (viewId) => {
            const targetView = views.find((v) => v.id === viewId);
            if (!targetView) return;

            // Validate
            if (canLink && !canLink(linkSource?.id, viewId)) return;
            if (viewId === linkSource?.id) return;

            setLinkTarget({
                id: viewId,
                name: targetView.name,
                color: targetView.color,
            });
            setLinkStep(2);
            setShowPanel(true);
        },
        [views, linkSource, canLink]
    );

    // Confirm the link with property and mode
    const confirmLink = useCallback(
        (property, mode) => {
            if (linkSource && linkTarget) {
                onCreateLink?.(linkSource.id, linkTarget.id, property, mode);
            }

            // Reset state
            setIsLinking(false);
            setLinkSource(null);
            setLinkTarget(null);
            setLinkStep(0);
            setShowPanel(false);
        },
        [linkSource, linkTarget, onCreateLink]
    );

    // Cancel linking
    const cancelLinking = useCallback(() => {
        setIsLinking(false);
        setLinkSource(null);
        setLinkTarget(null);
        setLinkStep(0);
        setShowPanel(false);
    }, []);

    // Create props for link badges
    const createBadgeProps = useCallback(
        (viewId, viewData) => ({
            viewId,
            viewName: viewData.name,
            viewColor: viewData.color,
            isActive: linkSource?.id === viewId,
            isLinkingMode: isLinking,
            onActivate: startLinking,
            onDeactivate: cancelLinking,
        }),
        [isLinking, linkSource, startLinking, cancelLinking]
    );

    // Create props for target overlays
    const createTargetProps = useCallback(
        (viewId, viewData) => ({
            viewId,
            viewName: viewData.name,
            viewColor: viewData.color,
            isLinkingMode: isLinking,
            sourceViewId: linkSource?.id,
            isValidTarget:
                isLinking &&
                viewId !== linkSource?.id &&
                (!canLink || canLink(linkSource?.id, viewId)),
            onSelect: selectTarget,
        }),
        [isLinking, linkSource, canLink, selectTarget]
    );

    // Memoized component props
    const instructionsProps = useMemo(
        () => ({
            isActive: isLinking,
            step: linkStep,
            sourceViewName: linkSource?.viewName,
            targetViewName: linkTarget?.name,
            onCancel: cancelLinking,
        }),
        [isLinking, linkStep, linkSource, linkTarget, cancelLinking]
    );

    const panelProps = useMemo(
        () => ({
            isOpen: showPanel,
            sourceView: linkSource
                ? {
                      id: linkSource.id,
                      name: linkSource.viewName,
                      color: linkSource.viewColor,
                  }
                : null,
            targetView: linkTarget,
            onConfirm: confirmLink,
            onCancel: cancelLinking,
        }),
        [showPanel, linkSource, linkTarget, confirmLink, cancelLinking]
    );

    return {
        // State
        isLinking,
        linkSource,
        linkTarget,
        linkStep,
        showPanel,

        // Actions
        startLinking,
        selectTarget,
        confirmLink,
        cancelLinking,

        // Props generators
        createBadgeProps,
        createTargetProps,

        // Component props
        instructionsProps,
        panelProps,
    };
}

export default useVRLinking;
