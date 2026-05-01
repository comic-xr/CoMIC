/**
 * @file DatasetNode.jsx
 * @description Tree node representing a loaded dataset in the Datasets tab.
 * 
 * CLEAN MIGRATION: Uses <Icon name={...} /> directly with semantic names
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import './DatasetNode.scss';

/**
 * Dataset tree node component.
 */
export const DatasetNode = memo(function DatasetNode({
    dataset,
    views = [],
    isExpanded,
    onToggle,
    onCreateView,
    onUnload,
    children,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Get display info - icon names are already semantic!
    const displayInfo = getFileTypeDisplayInfo(dataset.fileType);
    const iconName = displayInfo?.icon || 'database';
    const iconColor = displayInfo?.color || null;
    const typeLabel = displayInfo?.displayName || dataset.fileType?.toUpperCase() || 'Data';

    const viewCount = views.length;
    const activeViewCount = views.filter((v) => v.status === 'active').length;
    const sizeDisplay = dataset.fileSize ? formatFileSize(dataset.fileSize) : '';
    const loadedDisplay = dataset.loadedAt
        ? formatRelativeTime(new Date(dataset.loadedAt))
        : '';

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(true);
    }, []);

    const handleCreateView = useCallback((e) => {
        e?.stopPropagation();
        onCreateView?.(dataset.id);
        setMenuOpen(false);
    }, [dataset.id, onCreateView]);

    const handleOpenSettings = useCallback((e) => {
        e?.stopPropagation();
        setShowSettingsModal(true);
        setMenuOpen(false);
    }, []);

    const handleUnload = useCallback((e) => {
        e?.stopPropagation();
        onUnload?.(dataset.id);
        setMenuOpen(false);
    }, [dataset.id, onUnload]);

    return (
        <div className="dataset-node">
            <div
                className={`dataset-node__header ${isExpanded ? 'dataset-node__header--expanded' : ''}`}
                onClick={onToggle}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    if (!menuOpen) setMenuOpen(false);
                }}
            >
                {/* Chevron */}
                <span className="dataset-node__chevron">
                    <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={10} />
                </span>

                {/* Type icon - uses semantic name directly from manifest */}
                <Tooltip content={typeLabel}>
                    <span className="dataset-node__icon" style={{ color: iconColor }}>
                        <Icon name={iconName} size={14} />
                    </span>
                </Tooltip>

                {/* Name and info */}
                <div className="dataset-node__info">
                    <span className="dataset-node__name">
                        {dataset.name || dataset.filename || 'Untitled'}
                    </span>
                    <span className="dataset-node__meta">
                        {sizeDisplay}
                        {sizeDisplay && viewCount > 0 && ' • '}
                        {viewCount > 0 && (
                            <>
                                {viewCount} view{viewCount !== 1 ? 's' : ''}
                                {activeViewCount > 0 && ` (${activeViewCount} active)`}
                            </>
                        )}
                        {loadedDisplay && (
                            <span className="dataset-node__time"> • {loadedDisplay}</span>
                        )}
                    </span>
                </div>

                {/* View count badge */}
                {viewCount > 0 && (
                    <span className="dataset-node__badge">{viewCount}</span>
                )}

                {/* Hover actions */}
                {isHovered && (
                    <div className="dataset-node__actions">
                        <IconButton
                            icon="add"
                            onClick={handleCreateView}
                            tooltip="Create View"
                            size="xs"
                            variant="ghost"
                            className="dataset-node__action"
                        />
                        <IconButton
                            icon="settings"
                            onClick={handleOpenSettings}
                            tooltip="Settings"
                            size="xs"
                            variant="ghost"
                            className="dataset-node__action"
                        />
                        <IconButton
                            icon="moreHorizontal"
                            onClick={handleContextMenu}
                            tooltip="More"
                            size="xs"
                            variant="ghost"
                            className="dataset-node__action"
                        />
                    </div>
                )}
            </div>

            {/* Children */}
            {isExpanded && (
                <div className="dataset-node__children">
                    {children}
                    {viewCount === 0 && (
                        <div className="dataset-node__empty">
                            <span>No views</span>
                            <LabeledButton
                                icon="add"
                                label="Create view"
                                onClick={handleCreateView}
                                size="xs"
                                variant="ghost"
                                className="dataset-node__empty-action"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Settings Modal */}
            <DatasetSettingsModal
                isOpen={showSettingsModal}
                dataset={dataset}
                views={views}
                onClose={() => setShowSettingsModal(false)}
                onCreateView={() => onCreateView?.(dataset.id)}
                onUnloadDataset={() => onUnload?.(dataset.id)}
            />
        </div>
    );
});

export default DatasetNode;