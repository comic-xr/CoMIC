/**
 * @file DatasetParent.jsx
 * @description Parent/folder node for a dataset in the tree view
 * 
 * CLEAN MIGRATION: Uses <Icon name={...} /> directly with semantic names
 * Structure matches DatasetsTab.scss styling
 */

import React, { useState, useCallback, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';

/**
 * Get display configuration - returns STRING icon names (not components!)
 */
function getDatasetTypeConfig(fileType) {
    const displayInfo = getFileTypeDisplayInfo(fileType);

    if (displayInfo) {
        return {
            icon: displayInfo.icon,  // Already semantic!
            color: displayInfo.color,
            label: displayInfo.displayName || fileType?.toUpperCase() || 'Data',
        };
    }

    return {
        icon: 'database',
        color: '#6B7280',
        label: fileType?.toUpperCase() || 'Data',
    };
}

/**
 * DatasetParent - Tree node representing a loaded dataset
 */
export function DatasetParent({
    dataset,
    isExpanded,
    onToggle,
    children,
    viewCount = 0,
    views = [],
    onCreateView,
    onUnloadDataset,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const cardRef = useRef(null);

    const typeConfig = getDatasetTypeConfig(dataset.fileType);
    const activeCount = views.filter(v => v.status === 'active').length;

    // Format metadata
    const sizeDisplay = dataset.fileSize ? formatFileSize(dataset.fileSize) : null;
    const loadedDisplay = dataset.loadedAt ? formatRelativeTime(dataset.loadedAt) : null;
    const handlerLabel = typeConfig.label || dataset.handlerType || 'Data';

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        setMenuOpen(!menuOpen);
    }, [menuOpen]);

    const handleCreateView = useCallback((e) => {
        e?.stopPropagation();
        onCreateView?.(dataset.id);
    }, [dataset.id, onCreateView]);

    const handleOpenSettings = useCallback((e) => {
        e?.stopPropagation();
        setShowSettingsModal(true);
        setMenuOpen(false);
    }, []);

    // Drag handlers
    const handleDragStart = useCallback((e) => {
        setIsDragging(true);
        e.dataTransfer.setData('application/cia-dataset', JSON.stringify({
            datasetId: dataset.id,
            fileType: dataset.fileType,
            name: dataset.name || dataset.filename,
        }));
        e.dataTransfer.effectAllowed = 'copy';
    }, [dataset]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            className={`dataset-parent ${isDragging ? 'dataset-parent--dragging' : ''} ${isHovered ? 'dataset-parent--hovered' : ''}`}
            ref={cardRef}
        >
            <div className="dataset-parent__card">
                <div className="dataset-parent__header">
                    {/* Main clickable content area */}
                    <div
                        className="dataset-parent__header-content"
                        onClick={onToggle}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => { setIsHovered(false); if (!menuOpen) setMenuOpen(false); }}
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Chevron */}
                        <span className={`dataset-parent__chevron ${isExpanded ? 'dataset-parent__chevron--expanded' : ''}`}>
                            <Icon name="chevronDown" size={12} />
                        </span>

                        {/* Type icon with colored background */}
                        <div
                            className="dataset-parent__type-icon"
                            style={{ '--type-color': typeConfig.color || '#6B7280' }}
                        >
                            <Icon name={typeConfig.icon} size={14} />
                        </div>

                        {/* Name and metadata */}
                        <div className="dataset-parent__info">
                            <span className="dataset-parent__info-name">
                                {dataset.name || dataset.filename || 'Untitled'}
                            </span>
                            <div className="dataset-parent__info-meta">
                                <span
                                    className="dataset-parent__handler-badge"
                                    style={{ '--type-color': typeConfig.color || '#6B7280' }}
                                >
                                    {handlerLabel}
                                </span>
                                {sizeDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <Icon name="hardDrive" size={8} />
                                        {sizeDisplay}
                                    </span>
                                )}
                                {loadedDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <Icon name="clock" size={8} />
                                        {loadedDisplay}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* View count badge */}
                        <div className={`dataset-parent__view-count ${activeCount > 0 ? 'dataset-parent__view-count--has-active' : ''}`}>
                            <span className="dataset-parent__view-count-number">{activeCount}</span>
                            {viewCount > 0 && viewCount !== activeCount && (
                                <span className="dataset-parent__view-count-total">/{viewCount}</span>
                            )}
                        </div>
                    </div>

                    {/* Vertical action buttons (right edge) */}
                    <div className="dataset-parent__actions">
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleCreateView}
                            title="Create view"
                        >
                            <Icon name="add" size={10} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleOpenSettings}
                            title="Settings"
                        >
                            <Icon name="settings" size={10} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleContextMenu}
                            title="More actions"
                        >
                            <Icon name="moreHorizontal" size={10} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Children (views) */}
            {isExpanded && (
                <div className="dataset-parent__children">
                    {children}
                    {viewCount === 0 && (
                        <div className="dataset-parent__empty">
                            <span>No views</span>
                            <button
                                className="dataset-parent__empty-action"
                                onClick={handleCreateView}
                            >
                                <Icon name="add" size={10} />
                                Create view
                            </button>
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
                onCreateView={onCreateView}
                onUnloadDataset={onUnloadDataset}
            />
        </div>
    );
}

export default DatasetParent;