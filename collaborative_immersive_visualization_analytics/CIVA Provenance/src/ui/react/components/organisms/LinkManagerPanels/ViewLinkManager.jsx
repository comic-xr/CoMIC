/**
 * ViewLinkManager Component
 *
 * Panel for configuring link settings for a specific view.
 * Allows selecting which properties to sync and configuring group membership.
 *
 * @module ViewLinkManager
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { PropertySelector } from '@UI/react/components/molecules/PropertySelector';
import { ModeSelector } from '@UI/react/components/molecules/ModeSelector';
import { GroupMembersList } from '@UI/react/components/molecules/GroupMembersList';
import { LINK_PROPERTIES, getPropertyById } from './linkConstants';
import './ViewLinkManager.scss';

/**
 * Panel Header with view info and close button
 */
const PanelHeader = memo(function PanelHeader({
    viewName,
    viewColor,
    onClose,
}) {
    return (
        <div className="view-link-manager__header">
            <div className="view-link-manager__title">
                <ColorDot color={viewColor} size="sm" />
                <span className="view-link-manager__view-name">{viewName}</span>
                <span className="view-link-manager__subtitle">Link Settings</span>
            </div>
            {onClose && (
                <button className="view-link-manager__close" onClick={onClose}>
                    <Icon name="x" size={16} />
                </button>
            )}
        </div>
    );
});

/**
 * Property detail section showing group members
 */
const PropertyDetail = memo(function PropertyDetail({
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
        <div className="view-link-manager__property-detail">
            <div className="view-link-manager__property-header">
                <Icon name={property.icon} size={16} />
                <span className="view-link-manager__property-name">{property.label}</span>
                <span className="view-link-manager__property-desc">{property.description}</span>
            </div>

            <ModeSelector
                currentMode={currentMode}
                onChange={onModeChange}
                color={property.colorHex}
                label="Your Mode in This Group"
            />

            <div className="view-link-manager__members-section">
                <div className="view-link-manager__section-header">
                    <span>Group Members</span>
                    {onAddMember && (
                        <button
                            className="view-link-manager__add-btn"
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
});

/**
 * ViewLinkManager - Configure link settings for a view
 *
 * @param {string} viewId - ID of the view being configured
 * @param {string} viewName - Display name of the view
 * @param {string} viewColor - Color of the view
 * @param {Object} linkStats - Stats for each property { propertyId: { count, members, mode } }
 * @param {string} currentUserId - ID of current user
 * @param {function} onModeChange - Handler for mode changes (propertyId, mode) => void
 * @param {function} onRemoveMember - Handler for removing members
 * @param {function} onAddMember - Handler for adding members
 * @param {function} onClose - Close panel handler
 * @param {string} className - Additional CSS classes
 */
export const ViewLinkManager = memo(function ViewLinkManager({
    viewId,
    viewName = 'Unnamed View',
    viewColor = 'var(--color-accent-teal)',
    linkStats = {},
    currentUserId,
    onModeChange,
    onRemoveMember,
    onAddMember,
    onClose,
    className = '',
}) {
    const [selectedProperty, setSelectedProperty] = useState('camera');

    const selectedPropertyConfig = getPropertyById(selectedProperty);
    const selectedPropertyStats = linkStats[selectedProperty] || {};

    const handleModeChange = useCallback((mode) => {
        onModeChange?.(selectedProperty, mode);
    }, [selectedProperty, onModeChange]);

    const handleAddMember = useCallback(() => {
        onAddMember?.(selectedProperty);
    }, [selectedProperty, onAddMember]);

    return (
        <div className={`view-link-manager ${className}`}>
            <PanelHeader
                viewName={viewName}
                viewColor={viewColor}
                onClose={onClose}
            />

            <div className="view-link-manager__content">
                <PropertySelector
                    selectedProperty={selectedProperty}
                    onSelect={setSelectedProperty}
                    linkStats={linkStats}
                />

                <PropertyDetail
                    property={selectedPropertyConfig}
                    members={selectedPropertyStats.members || []}
                    currentUserId={currentUserId}
                    currentMode={selectedPropertyStats.mode || 'sync'}
                    onModeChange={handleModeChange}
                    onRemoveMember={onRemoveMember}
                    onAddMember={handleAddMember}
                />
            </div>
        </div>
    );
});

export default ViewLinkManager;
