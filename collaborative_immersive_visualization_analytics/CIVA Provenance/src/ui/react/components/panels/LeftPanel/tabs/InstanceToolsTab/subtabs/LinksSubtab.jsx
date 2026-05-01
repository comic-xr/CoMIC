// LinksSubtab.jsx
// Links configuration subtab for InstanceToolsTab
//
// Wraps ViewLinkManager to configure link settings for the active instance/view.
// Allows selecting which properties to sync and configuring group membership.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { PropertySelector } from '@UI/react/components/molecules/PropertySelector';
import { ModeSelector } from '@UI/react/components/molecules/ModeSelector';
import { GroupMembersList } from '@UI/react/components/molecules/GroupMembersList';
import { LINK_PROPERTIES, getPropertyById } from '@UI/react/components/organisms/LinkManagerPanels/linkConstants';

// =============================================================================
// PROPERTY DETAIL SECTION
// =============================================================================

function PropertyDetail({
    property,
    members,
    currentUserId,
    currentMode,
    onModeChange,
    onRemoveMember,
    onAddMember,
}) {
    if (!property) return null;

    return (
        <div className="links-subtab__property-detail">
            <div className="links-subtab__property-header">
                <Icon name={property.icon} size={16} />
                <span className="links-subtab__property-name">{property.label}</span>
                <span className="links-subtab__property-desc">{property.description}</span>
            </div>

            <ModeSelector
                currentMode={currentMode}
                onChange={onModeChange}
                color={property.colorHex}
                label="Your Mode in This Group"
            />

            <div className="links-subtab__members-section">
                <div className="links-subtab__section-header">
                    <span>Group Members</span>
                    {onAddMember && (
                        <button
                            className="links-subtab__add-btn"
                            onClick={onAddMember}
                        >
                            <Icon name="plus" size={14} />
                            <span>Add</span>
                        </button>
                    )}
                </div>
                <GroupMembersList
                    members={members}
                    currentUserId={currentUserId}
                    onRemoveMember={onRemoveMember}
                    showModes={true}
                    propertyColor={property.colorHex}
                    emptyMessage="No other views linked for this property"
                />
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LinksSubtab - Configure link settings for the active instance/view
 *
 * Shows property selector and link configuration options.
 * Gets link data from linkManager for the active view.
 */
export function LinksSubtab({ activeInstance }) {
    const [selectedProperty, setSelectedProperty] = useState('camera');
    const [linkStats, setLinkStats] = useState({});

    // Get viewId from activeInstance
    const viewId = activeInstance?.viewConfigId || activeInstance?.viewId;

    // Load link stats for this view
    useEffect(() => {
        if (!viewId) {
            setLinkStats({});
            return;
        }

        const loadLinkStats = () => {
            // TODO: Get actual link stats from linkManager
            // For now, return empty stats - will be populated when linkManager is integrated
            // const linkManager = getLinkManager();
            // const stats = linkManager?.getViewLinkStats?.(viewId) || {};
            setLinkStats({});
        };

        loadLinkStats();

        // Listen for link changes
        const handleLinkChange = (event) => {
            if (event.detail?.viewId === viewId) {
                loadLinkStats();
            }
        };

        window.addEventListener('cia:links-changed', handleLinkChange);
        return () => window.removeEventListener('cia:links-changed', handleLinkChange);
    }, [viewId]);

    const selectedPropertyConfig = useMemo(() =>
        getPropertyById(selectedProperty),
        [selectedProperty]
    );

    const selectedPropertyStats = useMemo(() =>
        linkStats[selectedProperty] || {},
        [linkStats, selectedProperty]
    );

    const handleModeChange = useCallback((mode) => {
        // TODO: Integrate with linkManager
        // linkManager?.setMode?.(viewId, selectedProperty, mode);
        console.log('Mode change:', viewId, selectedProperty, mode);
    }, [viewId, selectedProperty]);

    const handleAddMember = useCallback(() => {
        // TODO: Open member picker or integrate with linkManager
        console.log('Add member for property:', selectedProperty);
    }, [selectedProperty]);

    const handleRemoveMember = useCallback((memberId) => {
        // TODO: Integrate with linkManager
        console.log('Remove member:', memberId, 'from property:', selectedProperty);
    }, [selectedProperty]);

    if (!viewId) {
        return (
            <div className="links-subtab__empty">
                <Icon name="link" size={24} />
                <span>No view selected</span>
                <p>Select a view to configure its link settings</p>
            </div>
        );
    }

    return (
        <div className="links-subtab">
            <PropertySelector
                selectedProperty={selectedProperty}
                onSelect={setSelectedProperty}
                linkStats={linkStats}
            />

            <PropertyDetail
                property={selectedPropertyConfig}
                members={selectedPropertyStats.members || []}
                currentUserId={null} // TODO: Get from user context
                currentMode={selectedPropertyStats.mode || 'sync'}
                onModeChange={handleModeChange}
                onRemoveMember={handleRemoveMember}
                onAddMember={handleAddMember}
            />
        </div>
    );
}

export default LinksSubtab;
