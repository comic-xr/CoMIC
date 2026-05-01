/**
 * @file Footer2Container.jsx
 * @description Container component that wires Footer2 to ViewGroupManager
 * Uses useViewGroups hook to provide data and actions to the presentational Footer2 component
 */

import React, { memo, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useViewGroups, useViewGroupLinks, useViewLinks } from '@UI/react/hooks';
import { Footer2 } from './Footer2';

/**
 * Footer2Container - Wires Footer2 to ViewGroupManager
 *
 * This container component:
 * 1. Uses useViewGroups hook to get ViewGroup data and actions
 * 2. Uses useViewGroupLinks hook for VG-level link stats
 * 3. Uses useViewLinks hook for per-view link data (fed to Footer2 via linkingService adapter)
 * 4. Passes everything to the presentational Footer2 component
 */
const Footer2Container = memo(function Footer2Container({
    workspaceId,
    // Active view identification
    activeViewId = null,
    // View data
    activeViewType = 'vtk-volume',
    activeViewColor = null,
    // Focus/Subset - passed through
    isFocused = false,
    onToggleFocus,
    activeSubset = null,
    onOpenSubsetDropdown,
    // Actions - passed through
    onSnapshot,
    onResetView,
    onDuplicateView,
    onViewSettings,
    onOpenLayoutTab,
    onOpenLinkManager,
    // Instance tools from handler
    instanceTools = [],
    toolSections = [],
    onSelectTool,
    // VR - passed through
    isVRAvailable = false,
    isInVR = false,
    onToggleVR,
    // Sizing
    containerWidth = 900,
}) {
    // Get ViewGroup data and actions from hook
    const {
        visibleViewGroups,
        activeViewGroup,
        activeViewGroupId,
        createViewGroup,
        updateViewGroup,
        deleteViewGroup,
        duplicateViewGroup,
        selectViewGroup,
        goToViewGroup,
    } = useViewGroups(workspaceId);

    // Get link data for active ViewGroup
    const { vgLinks, isLinked } = useViewGroupLinks(activeViewGroupId);

    // Get per-view link data for the active view
    const { links: viewLinks } = useViewLinks(activeViewId);

    // Create a linkingService adapter that bridges useViewLinks data
    // to what Footer2's internal useLinkStats expects
    const linkingServiceAdapter = useMemo(() => {
        if (!viewLinks || viewLinks.length === 0) return null;

        // Index links by property for fast lookup
        const linksByProperty = {};
        for (const link of viewLinks) {
            if (!linksByProperty[link.property]) {
                linksByProperty[link.property] = [];
            }
            const otherId = link.sourceViewId === activeViewId
                ? link.targetViewId
                : link.sourceViewId;
            linksByProperty[link.property].push({
                ...link,
                targetId: otherId,
            });
        }

        return {
            getLinksForProperty: (viewGroupId, propertyId) => {
                return linksByProperty[propertyId] || [];
            },
        };
    }, [viewLinks, activeViewId]);

    // Handlers that map to ViewGroupManager operations
    const handleSelectViewGroup = useCallback((viewGroupId) => {
        selectViewGroup(viewGroupId);
    }, [selectViewGroup]);

    const handleCreateViewGroup = useCallback(async (layoutId, templateId) => {
        try {
            await createViewGroup(layoutId, templateId);
        } catch (error) {
            console.error('Failed to create ViewGroup:', error);
        }
    }, [createViewGroup]);

    const handleUpdateViewGroup = useCallback(async (viewGroupId, updates) => {
        try {
            await updateViewGroup(viewGroupId, updates);
        } catch (error) {
            console.error('Failed to update ViewGroup:', error);
        }
    }, [updateViewGroup]);

    const handleDeleteViewGroup = useCallback(async (viewGroupId) => {
        try {
            await deleteViewGroup(viewGroupId);
        } catch (error) {
            console.error('Failed to delete ViewGroup:', error);
        }
    }, [deleteViewGroup]);

    const handleDuplicateViewGroup = useCallback(async (viewGroupId, linkOption) => {
        try {
            // Map linkOption to API format
            const linkOptionMap = {
                'keepIndividual': 'keep_individual',
                'linkToOriginal': 'link_to_original',
                'noLinks': 'no_links',
            };

            await duplicateViewGroup(viewGroupId, {
                linkOption: linkOptionMap[linkOption] || 'no_links',
            });
        } catch (error) {
            console.error('Failed to duplicate ViewGroup:', error);
        }
    }, [duplicateViewGroup]);

    const handleGoToViewGroup = useCallback((viewGroupId) => {
        goToViewGroup(viewGroupId);
    }, [goToViewGroup]);

    // Transform ViewGroups to the format expected by Footer2
    const formattedViewGroups = visibleViewGroups.map(vg => ({
        id: vg.id,
        name: vg.name || 'Untitled Group',
        color: vg.color,
        layoutId: vg.layoutId,
        views: vg.getViewIds?.() || [],
        linkedTo: vg.link?.targetGroupId || null,
        linkedToName: vg.link?.targetGroupName || null,
    }));

    return (
        <Footer2
            // ViewGroup data from hook
            viewGroups={formattedViewGroups}
            activeViewGroupId={activeViewGroupId}
            onSelectViewGroup={handleSelectViewGroup}
            onCreateViewGroup={handleCreateViewGroup}
            onUpdateViewGroup={handleUpdateViewGroup}
            onDeleteViewGroup={handleDeleteViewGroup}
            onDuplicateViewGroup={handleDuplicateViewGroup}
            onGoToViewGroup={handleGoToViewGroup}
            // View data
            activeViewType={activeViewType}
            activeViewColor={activeViewColor}
            // Focus/Subset - passed through
            isFocused={isFocused}
            onToggleFocus={onToggleFocus}
            activeSubset={activeSubset}
            onOpenSubsetDropdown={onOpenSubsetDropdown}
            // Actions - passed through
            onSnapshot={onSnapshot}
            onResetView={onResetView}
            onDuplicateView={onDuplicateView}
            onViewSettings={onViewSettings}
            onOpenLayoutTab={onOpenLayoutTab}
            onOpenLinkManager={onOpenLinkManager}
            // Instance tools from handler
            instanceTools={instanceTools}
            toolSections={toolSections}
            onSelectTool={onSelectTool}
            // VR - passed through
            isVRAvailable={isVRAvailable}
            isInVR={isInVR}
            onToggleVR={onToggleVR}
            // Linking - adapter bridges useViewLinks data to Footer2's useLinkStats
            linkingService={linkingServiceAdapter}
            // Sizing
            containerWidth={containerWidth}
        />
    );
});

Footer2Container.propTypes = {
    workspaceId: PropTypes.string.isRequired,
    // Active view identification
    activeViewId: PropTypes.string,
    // View data
    activeViewType: PropTypes.string,
    activeViewColor: PropTypes.string,
    // Focus/Subset
    isFocused: PropTypes.bool,
    onToggleFocus: PropTypes.func,
    activeSubset: PropTypes.object,
    onOpenSubsetDropdown: PropTypes.func,
    // Actions
    onSnapshot: PropTypes.func,
    onResetView: PropTypes.func,
    onDuplicateView: PropTypes.func,
    onViewSettings: PropTypes.func,
    onOpenLayoutTab: PropTypes.func,
    onOpenLinkManager: PropTypes.func,
    // Instance tools from handler
    instanceTools: PropTypes.array,
    toolSections: PropTypes.array,
    onSelectTool: PropTypes.func,
    // VR
    isVRAvailable: PropTypes.bool,
    isInVR: PropTypes.bool,
    onToggleVR: PropTypes.func,
    // Sizing
    containerWidth: PropTypes.number,
};

export { Footer2Container };
export default Footer2Container;
