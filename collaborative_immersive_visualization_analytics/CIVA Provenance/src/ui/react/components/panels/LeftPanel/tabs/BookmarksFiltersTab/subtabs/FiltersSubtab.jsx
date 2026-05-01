/**
 * @file FiltersSubtab.jsx
 * @description Filters subtab content with saved filter presets.
 *
 * Features:
 * - Saved filter presets reusable across views
 * - Scope: View, Dataset, Workspace
 * - Import/Export capability
 * - Batch apply with conflict resolution
 *
 * @see Left_Panel_Design_Specification.docx - Section 10 Filters
 */

import React, { memo, useCallback, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { FilterCard } from '../components/FilterCard';
import { FilterEditor } from '../components/FilterEditor';
import { ScopedSection } from '../components/ScopedSection';
import { useFiltersTab } from '../hooks/useFiltersTab';

/**
 * FiltersSubtab component.
 *
 * @param {Object} props
 * @param {string[]} props.activeScopes - Active scope filters
 * @param {string} props.searchQuery - Search query string
 * @param {Object} props.currentFilterConfig - Current filter configuration
 */
export const FiltersSubtab = memo(function FiltersSubtab({
    activeScopes,
    searchQuery,
    currentFilterConfig,
}) {
    const fileInputRef = useRef(null);

    const {
        // Data
        filtersByScope,
        isEmpty,

        // Loading states
        isLoading,
        error,
        isSaving,

        // Section states
        expandedSections,
        toggleSection,

        // Editor state
        editorOpen,
        editingFilter,
        openEditEditor,
        closeEditor,

        // Import/Export
        importModalOpen,
        setImportModalOpen,
        exportFilters,
        importFilters,

        // Actions
        handleApply,
        handleDelete,
        handleTogglePin,
        handleSave,
        refetch,
    } = useFiltersTab({ activeScopes, searchQuery });

    // Handle file import
    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.filters || !Array.isArray(importData.filters)) {
                throw new Error('Invalid filter export file');
            }

            await importFilters(importData);
        } catch (err) {
            console.error('Failed to import filters:', err);
            alert('Failed to import filters: ' + err.message);
        }

        // Reset input
        e.target.value = '';
    }, [importFilters]);

    // Handle export all
    const handleExportAll = useCallback(() => {
        const allFilterIds = [
            ...filtersByScope.project,
            ...filtersByScope.room,
            ...filtersByScope.personal,
        ].map(f => f.id);

        exportFilters(allFilterIds);
    }, [filtersByScope, exportFilters]);

    // Loading state
    if (isLoading) {
        return (
            <div className="bookmarks-filters-tab__loading">
                <Icon name="loader" size={24} className="spin" />
                <span>Loading filters...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bookmarks-filters-tab__error">
                <Icon name="alertCircle" size={24} />
                <span>Failed to load filters</span>
                <LabeledButton label="Retry" onClick={refetch} size="sm" variant="ghost" />
            </div>
        );
    }

    // Empty state
    if (isEmpty) {
        return (
            <div className="bookmarks-filters-tab__empty">
                <span>No saved filters found</span>
                {searchQuery && (
                    <span className="bookmarks-filters-tab__empty-hint">
                        Try a different search term
                    </span>
                )}
                <div className="bookmarks-filters-tab__empty-actions">
                    <LabeledButton
                        icon="upload"
                        label="Import Filters"
                        onClick={handleImportClick}
                        size="sm"
                        variant="ghost"
                    />
                </div>
            </div>
        );
    }

    // Render filter card
    const renderFilter = (filter) => (
        <FilterCard
            key={filter.id}
            filter={filter}
            onApply={handleApply}
            onTogglePin={handleTogglePin}
            onDelete={handleDelete}
            onEdit={openEditEditor}
            onDuplicate={(f) => openEditEditor({ ...f, id: null, name: `${f.name} (copy)` })}
            onExport={(ids) => exportFilters(ids)}
        />
    );

    return (
        <>
            {/* Import/Export toolbar */}
            <div className="bookmarks-filters-tab__toolbar">
                <LabeledButton
                    icon="upload"
                    label="Import"
                    onClick={handleImportClick}
                    tooltip="Import filters from file"
                    size="sm"
                    variant="ghost"
                />
                <LabeledButton
                    icon="download"
                    label="Export All"
                    onClick={handleExportAll}
                    tooltip="Export all filters"
                    size="sm"
                    variant="ghost"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>

            <div className="bookmarks-filters-tab__content">
                {/* Project scope */}
                {activeScopes.includes('project') && (
                    <ScopedSection
                        scope="project"
                        items={filtersByScope.project}
                        expanded={expandedSections.project}
                        onToggle={() => toggleSection('project')}
                        renderItem={renderFilter}
                    />
                )}

                {/* Room/Workspace scope */}
                {activeScopes.includes('room') && (
                    <ScopedSection
                        scope="room"
                        items={filtersByScope.room}
                        expanded={expandedSections.room}
                        onToggle={() => toggleSection('room')}
                        renderItem={renderFilter}
                    />
                )}

                {/* Personal scope */}
                {activeScopes.includes('personal') && (
                    <ScopedSection
                        scope="personal"
                        items={filtersByScope.personal}
                        expanded={expandedSections.personal}
                        onToggle={() => toggleSection('personal')}
                        renderItem={renderFilter}
                    />
                )}
            </div>

            {/* Filter Editor Modal */}
            <FilterEditor
                isOpen={editorOpen}
                filter={editingFilter}
                onSave={handleSave}
                onClose={closeEditor}
                currentFilterConfig={currentFilterConfig}
            />
        </>
    );
});

export default FiltersSubtab;