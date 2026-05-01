/**
 * @file StarredSection.jsx
 * @description Starred files section with resizable height and filter awareness.
 * Shows starred items with the ability to bypass active filters.
 *
 * @example
 * <StarredSection
 *   items={starredFiles}
 *   filters={globalFilters}
 *   expanded={starredExpanded}
 *   onToggle={() => setStarredExpanded(!starredExpanded)}
 *   height={starredHeight}
 *   onResizeStart={handleResizeStart}
 * />
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { Icon, ColorDot } from '@UI/react/components/atoms';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { FileItemList } from '../components/FileItem';
import { useAdaptive } from '@UI/react/context';
import './StarredSection.scss';

// Sort options for starred section
const STARRED_SORT_OPTIONS = [
    { id: 'recent', label: 'Recently Starred', icon: 'clock' },
    { id: 'name', label: 'Name', icon: 'arrowDown' },
    { id: 'modified', label: 'Modified', icon: 'calendar' },
];

/**
 * @typedef {Object} StarredSectionProps
 * @property {Array} items - All starred items (unfiltered)
 * @property {Object} filters - Current global filter state
 * @property {(items: Array) => Array} applyFilters - Filter function
 * @property {boolean} expanded - Whether section is expanded
 * @property {() => void} onToggle - Toggle expansion handler
 * @property {number} height - Section height when expanded
 * @property {(e: MouseEvent) => void} onResizeStart - Resize drag start handler
 * @property {string} [selectedFileId] - Currently selected file ID
 * @property {(fileId: string) => void} [onSelect] - File selection handler
 * @property {(fileId: string) => void} [onToggleStar] - Toggle star handler
 * @property {(file: Object) => void} [onDoubleClick] - File double-click handler
 * @property {(e: DragEvent, file: Object) => void} [onDragStart] - Drag start handler
 * @property {(e: MouseEvent, file: Object) => void} [onContextMenu] - Context menu handler
 * @property {(e: MouseEvent, file: Object) => void} [onMenuClick] - Menu button click handler
 * @property {string} [className] - Additional CSS classes
 */

// Local filter options for starred section
const FILTER_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'datasets', label: 'Datasets', icon: 'box', color: '#2dd4bf' },
    { id: 'files', label: 'Files', icon: 'fileText', color: '#3b82f6' },
];

/**
 * StarredSection - Resizable starred items section with filter bypass
 *
 * @param {StarredSectionProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
export const StarredSection = memo(function StarredSection({
    items = [],
    filters,
    applyFilters,
    expanded,
    onToggle,
    height = 140,
    onResizeStart,
    selectedFileId,
    onSelect,
    onToggleStar,
    onDoubleClick,
    onDragStart,
    onContextMenu,
    onMenuClick,
    // V7: Tag display props
    tags,
    getCategoryForTag,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const [localFilter, setLocalFilter] = useState('all');
    const [showAllBypassFilter, setShowAllBypassFilter] = useState(false);
    const [sortBy, setSortBy] = useState('recent');

    // Check if global filters are active
    const hasGlobalFilters = filters?.searchQuery?.trim() ||
        (filters?.typeFilters?.length > 0) ||
        (filters?.tagFilters?.length > 0);

    // Apply local filter to items
    const localFilteredItems = useMemo(() => {
        if (localFilter === 'all') return items;
        if (localFilter === 'datasets') {
            return items.filter(f =>
                f.type === 'nifti' || f.type === 'dicom' ||
                f.fileType === 'nifti' || f.fileType === 'dicom' ||
                f.fileType === 'vtp' || f.fileType === 'vti' || f.fileType === 'csv'
            );
        }
        // 'files' - documents and images
        return items.filter(f =>
            f.type === 'document' || f.type === 'image' ||
            f.fileType === 'md' || f.fileType === 'pdf' ||
            f.fileType === 'png' || f.fileType === 'jpg'
        );
    }, [items, localFilter]);

    // Apply global filters (unless bypassed)
    const filteredItems = useMemo(() => {
        if (showAllBypassFilter || !hasGlobalFilters || !applyFilters) {
            return localFilteredItems;
        }
        return applyFilters(localFilteredItems);
    }, [localFilteredItems, showAllBypassFilter, hasGlobalFilters, applyFilters]);

    // Sort the filtered items
    const displayedItems = useMemo(() => {
        const sorted = [...filteredItems];
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'modified':
                sorted.sort((a, b) => {
                    const dateA = a.modifiedAt ? new Date(a.modifiedAt) : new Date(0);
                    const dateB = b.modifiedAt ? new Date(b.modifiedAt) : new Date(0);
                    return dateB - dateA; // Most recent first
                });
                break;
            case 'recent':
            default:
                // Sort by starred timestamp (most recent first)
                sorted.sort((a, b) => {
                    const dateA = a.starredAt ? new Date(a.starredAt) : new Date(0);
                    const dateB = b.starredAt ? new Date(b.starredAt) : new Date(0);
                    return dateB - dateA;
                });
                break;
        }
        return sorted;
    }, [filteredItems, sortBy]);

    // Count hidden items due to global filters
    const hiddenCount = localFilteredItems.length - filteredItems.length;

    // Handle local filter toggle
    const handleLocalFilter = useCallback((filterId) => {
        setLocalFilter(filterId);
    }, []);

    // Handle sort change
    const handleSortChange = useCallback((newSortBy) => {
        setSortBy(newSortBy);
    }, []);

    // Toggle show all (bypass global filters)
    const handleShowAll = useCallback(() => {
        setShowAllBypassFilter(true);
    }, []);

    // Restore global filters
    const handleRestoreFilters = useCallback(() => {
        setShowAllBypassFilter(false);
    }, []);

    const isEmpty = items.length === 0;

    const classList = [
        'starred-section',
        expanded && 'starred-section--expanded',
        isEmpty && 'starred-section--empty',
        showAllBypassFilter && hasGlobalFilters && 'starred-section--bypass',
        isVR && 'starred-section--vr',
        className,
    ].filter(Boolean).join(' ');

    // Build filter options with counts
    const filterOptionsWithCounts = FILTER_OPTIONS.map(opt => ({
        ...opt,
        count: opt.id === 'all' ? items.length :
            opt.id === 'datasets' ? items.filter(f =>
                f.type === 'nifti' || f.type === 'dicom' ||
                f.fileType === 'nifti' || f.fileType === 'dicom' ||
                f.fileType === 'vtp' || f.fileType === 'vti' || f.fileType === 'csv'
            ).length :
            items.filter(f =>
                f.type === 'document' || f.type === 'image'
            ).length,
    }));

    return (
        <div
            className={classList}
            style={expanded && !isEmpty ? { height } : undefined}
        >
            {/* Header */}
            <div
                className="starred-section__header"
                onClick={!isEmpty ? onToggle : undefined}
                role="button"
                tabIndex={!isEmpty ? 0 : -1}
                aria-expanded={expanded}
                aria-disabled={isEmpty}
            >
                {!isEmpty && (
                    <span className="starred-section__chevron">
                        <Icon
                            name={expanded ? 'chevronDown' : 'chevronRight'}
                            size={10}
                        />
                    </span>
                )}
                <Icon name="star" size={12} className="starred-section__icon" />
                <span className="starred-section__label">Starred</span>
                <span className="starred-section__count">
                    {hasGlobalFilters && !showAllBypassFilter
                        ? `${filteredItems.length} of ${items.length}`
                        : items.length}
                </span>
                {/* Bypass indicator */}
                {showAllBypassFilter && hasGlobalFilters && (
                    <span className="starred-section__bypass-badge">
                        Showing all
                    </span>
                )}
                {/* Sort dropdown */}
                {expanded && !isEmpty && (
                    <div
                        className="starred-section__sort"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SortDropdown
                            value={sortBy}
                            onChange={handleSortChange}
                            options={STARRED_SORT_OPTIONS}
                        />
                    </div>
                )}
            </div>

            {/* Empty state hint */}
            {isEmpty && (
                <div className="starred-section__empty-hint">
                    <Icon name="star" size={12} />
                    <span>Star files for quick access</span>
                </div>
            )}

            {/* Content (when expanded and has items) */}
            {expanded && !isEmpty && (
                <>
                    {/* Local filter chips */}
                    <div className="starred-section__filters">
                        <ChipGroup
                            chips={filterOptionsWithCounts}
                            activeChips={[localFilter]}
                            onToggle={(id) => handleLocalFilter(id)}
                            size="sm"
                            allowEmpty={false}
                        />
                    </div>

                    {/* File list */}
                    <div className="starred-section__content">
                        {displayedItems.map(file => (
                            <FileItemList
                                key={file.id}
                                file={file}
                                isSelected={selectedFileId === file.id}
                                onSelect={() => onSelect?.(file.id)}
                                onDoubleClick={onDoubleClick}
                                onStar={onToggleStar}
                                onDragStart={onDragStart}
                                onContextMenu={onContextMenu}
                                onMenuClick={onMenuClick}
                                tags={tags}
                                getCategoryForTag={getCategoryForTag}
                            />
                        ))}
                    </div>

                    {/* Filter bypass link */}
                    {hiddenCount > 0 && !showAllBypassFilter && (
                        <button
                            type="button"
                            className="starred-section__show-all"
                            onClick={handleShowAll}
                        >
                            <span>{hiddenCount} items hidden by filters</span>
                            <span className="starred-section__show-all-link">
                                Show all
                                <Icon name="arrowUpRight" size={10} />
                            </span>
                        </button>
                    )}

                    {/* Restore filters link */}
                    {showAllBypassFilter && hasGlobalFilters && (
                        <button
                            type="button"
                            className="starred-section__restore-filters"
                            onClick={handleRestoreFilters}
                        >
                            <Icon name="rotateCcw" size={10} />
                            <span>Restore filters</span>
                        </button>
                    )}

                    {/* Resize handle */}
                    {onResizeStart && (
                        <div
                            className="starred-section__resize-handle"
                            onMouseDown={onResizeStart}
                        >
                            <Icon name="gripHorizontal" size={12} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

export default StarredSection;
