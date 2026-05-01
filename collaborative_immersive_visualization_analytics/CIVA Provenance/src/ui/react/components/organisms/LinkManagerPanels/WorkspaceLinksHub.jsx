/**
 * WorkspaceLinksHub Component
 *
 * Bird's-eye view panel showing all link groups in the workspace.
 * Provides overview of sync relationships between views.
 *
 * @module WorkspaceLinksHub
 */

import React, { memo, useState, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ColorDot } from '@UI/react/components/atoms/ColorDot';
import { Badge } from '@UI/react/components/atoms/Badge';
import { GroupMembersCompact } from '@UI/react/components/molecules/GroupMembersList';
import { LINK_PROPERTIES, getPropertyById, getModeById } from './linkConstants';
import './WorkspaceLinksHub.scss';

/**
 * Single link group card
 */
const LinkGroupCard = memo(function LinkGroupCard({
    group,
    property,
    onSelectGroup,
    onExpandGroup,
}) {
    const memberCount = group.members?.length || 0;

    return (
        <div
            className="link-group-card"
            onClick={() => onSelectGroup?.(group)}
            style={{ '--property-color': property?.colorHex }}
        >
            <div className="link-group-card__header">
                <div className="link-group-card__property">
                    <Icon name={property?.icon || 'link'} size={14} />
                    <span>{property?.label || 'Link'}</span>
                </div>
                <Badge variant="subtle" size="sm">
                    {memberCount} view{memberCount !== 1 ? 's' : ''}
                </Badge>
            </div>

            <div className="link-group-card__name">
                {group.name || `${property?.label} Group`}
            </div>

            <div className="link-group-card__members">
                <GroupMembersCompact
                    members={group.members}
                    max={4}
                    size="xs"
                />
            </div>

            {onExpandGroup && (
                <button
                    className="link-group-card__expand"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpandGroup(group);
                    }}
                >
                    <Icon name="maximize" size={12} />
                </button>
            )}
        </div>
    );
});

/**
 * Property section showing groups for one property type
 */
const PropertySection = memo(function PropertySection({
    propertyId,
    groups,
    isExpanded,
    onToggleExpand,
    onSelectGroup,
    onExpandGroup,
}) {
    const property = getPropertyById(propertyId);
    if (!property) return null;

    const groupCount = groups.length;
    const totalMembers = groups.reduce((sum, g) => sum + (g.members?.length || 0), 0);

    return (
        <div className={`property-section ${isExpanded ? 'property-section--expanded' : ''}`}>
            <button
                className="property-section__header"
                onClick={() => onToggleExpand(propertyId)}
            >
                <div className="property-section__icon" style={{ '--property-color': property.colorHex }}>
                    <Icon name={property.icon} size={14} />
                </div>
                <span className="property-section__name">{property.label}</span>
                <span className="property-section__stats">
                    {groupCount} group{groupCount !== 1 ? 's' : ''} / {totalMembers} view{totalMembers !== 1 ? 's' : ''}
                </span>
                <Icon
                    name={isExpanded ? 'chevronDown' : 'chevronRight'}
                    size={14}
                    className="property-section__chevron"
                />
            </button>

            {isExpanded && (
                <div className="property-section__groups">
                    {groups.map((group, index) => (
                        <LinkGroupCard
                            key={group.id || index}
                            group={group}
                            property={property}
                            onSelectGroup={onSelectGroup}
                            onExpandGroup={onExpandGroup}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

/**
 * Stats summary bar
 */
const StatsSummary = memo(function StatsSummary({ linkGroups }) {
    const stats = useMemo(() => {
        let totalGroups = 0;
        let totalViews = 0;
        const activeProperties = new Set();

        Object.entries(linkGroups).forEach(([propertyId, groups]) => {
            if (groups.length > 0) {
                activeProperties.add(propertyId);
                totalGroups += groups.length;
                groups.forEach(g => {
                    totalViews += g.members?.length || 0;
                });
            }
        });

        return {
            totalGroups,
            totalViews,
            propertyCount: activeProperties.size,
        };
    }, [linkGroups]);

    return (
        <div className="stats-summary">
            <div className="stats-summary__item">
                <Icon name="layers" size={14} />
                <span>{stats.propertyCount}</span>
                <span className="stats-summary__label">Properties</span>
            </div>
            <div className="stats-summary__item">
                <Icon name="link2" size={14} />
                <span>{stats.totalGroups}</span>
                <span className="stats-summary__label">Groups</span>
            </div>
            <div className="stats-summary__item">
                <Icon name="layout" size={14} />
                <span>{stats.totalViews}</span>
                <span className="stats-summary__label">Views</span>
            </div>
        </div>
    );
});

/**
 * WorkspaceLinksHub - Overview of all link groups
 *
 * @param {Object} linkGroups - Groups by property { propertyId: [{ id, name, members }] }
 * @param {function} onSelectGroup - Handler when selecting a group
 * @param {function} onExpandGroup - Handler to expand group details
 * @param {function} onCreateGroup - Handler to create new group
 * @param {function} onClose - Close panel handler
 * @param {string} className - Additional CSS classes
 */
export const WorkspaceLinksHub = memo(function WorkspaceLinksHub({
    linkGroups = {},
    onSelectGroup,
    onExpandGroup,
    onCreateGroup,
    onClose,
    className = '',
}) {
    const [expandedProperties, setExpandedProperties] = useState(
        () => new Set(Object.keys(linkGroups).filter(k => linkGroups[k]?.length > 0))
    );
    const [searchQuery, setSearchQuery] = useState('');

    const toggleExpand = (propertyId) => {
        setExpandedProperties(prev => {
            const next = new Set(prev);
            if (next.has(propertyId)) {
                next.delete(propertyId);
            } else {
                next.add(propertyId);
            }
            return next;
        });
    };

    // Filter groups by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return linkGroups;

        const filtered = {};
        Object.entries(linkGroups).forEach(([propertyId, groups]) => {
            const matchingGroups = groups.filter(g => {
                const nameMatch = g.name?.toLowerCase().includes(searchQuery.toLowerCase());
                const memberMatch = g.members?.some(m =>
                    m.userName?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return nameMatch || memberMatch;
            });
            if (matchingGroups.length > 0) {
                filtered[propertyId] = matchingGroups;
            }
        });
        return filtered;
    }, [linkGroups, searchQuery]);

    const hasGroups = Object.values(filteredGroups).some(groups => groups.length > 0);

    return (
        <div className={`workspace-links-hub ${className}`}>
            <div className="workspace-links-hub__header">
                <div className="workspace-links-hub__title">
                    <Icon name="link2" size={18} />
                    <span>Workspace Links</span>
                </div>
                {onClose && (
                    <button className="workspace-links-hub__close" onClick={onClose}>
                        <Icon name="x" size={16} />
                    </button>
                )}
            </div>

            <StatsSummary linkGroups={linkGroups} />

            <div className="workspace-links-hub__toolbar">
                <SearchInput
                    className="workspace-links-hub__search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search groups..."
                    size="sm"
                />
                {onCreateGroup && (
                    <button
                        className="workspace-links-hub__create"
                        onClick={onCreateGroup}
                    >
                        <Icon name="plus" size={14} />
                        <span>New Group</span>
                    </button>
                )}
            </div>

            <div className="workspace-links-hub__content">
                {hasGroups ? (
                    LINK_PROPERTIES.map(prop => {
                        const groups = filteredGroups[prop.id] || [];
                        if (groups.length === 0) return null;

                        return (
                            <PropertySection
                                key={prop.id}
                                propertyId={prop.id}
                                groups={groups}
                                isExpanded={expandedProperties.has(prop.id)}
                                onToggleExpand={toggleExpand}
                                onSelectGroup={onSelectGroup}
                                onExpandGroup={onExpandGroup}
                            />
                        );
                    })
                ) : (
                    <div className="workspace-links-hub__empty">
                        <Icon name="link2" size={32} />
                        <span className="workspace-links-hub__empty-title">
                            {searchQuery ? 'No matching groups' : 'No link groups yet'}
                        </span>
                        <span className="workspace-links-hub__empty-desc">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Create a group to start syncing views'
                            }
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default WorkspaceLinksHub;
