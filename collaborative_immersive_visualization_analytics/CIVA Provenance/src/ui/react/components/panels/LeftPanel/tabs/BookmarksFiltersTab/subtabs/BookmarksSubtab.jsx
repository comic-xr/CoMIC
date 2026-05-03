/**
 * @file BookmarksSubtab.jsx
 * @description Bookmarks subtab content with saved positions and states.
 *
 * Features:
 * - Three bookmark types: Position, State, Comparison
 * - Scope filtering: Personal, Shared, Template
 * - Search across bookmarks
 * - Quick-save (B key) support
 * - Folder organization
 *
 * @see Left_Panel_Design_Specification.docx - Section 9 Bookmarks
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { BookmarkCard } from '../components/BookmarkCard';
import { BookmarkEditor } from '../components/BookmarkEditor';
import { ScopedSection } from '../components/ScopedSection';
import { useBookmarksTab } from '../hooks/useBookmarksTab';

/**
 * BookmarksSubtab component.
 *
 * @param {Object} props
 * @param {string[]} props.activeScopes - Active scope filters
 * @param {string} props.searchQuery - Search query string
 * @param {Object} props.currentCameraState - Current camera state for capture
 * @param {string[]} props.activeFilterIds - Currently active filter IDs
 */
export const BookmarksSubtab = memo(function BookmarksSubtab({
    activeScopes,
    searchQuery,
    currentCameraState,
    activeFilterIds = [],
}) {
    const {
        // Data
        bookmarksByScope,
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
        editingBookmark,
        openEditEditor,
        closeEditor,

        // Actions
        handleNavigate,
        handleDelete,
        handleTogglePin,
        handleSave,
        getThumbnailUrl,
        refetch,
    } = useBookmarksTab({ activeScopes, searchQuery });

    // Loading state
    if (isLoading) {
        return (
            <div className="bookmarks-filters-tab__loading">
                <Icon name="loader" size={24} className="spin" />
                <span>Loading bookmarks...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bookmarks-filters-tab__error">
                <Icon name="alertCircle" size={24} />
                <span>Failed to load bookmarks</span>
                <LabeledButton label="Retry" onClick={refetch} size="sm" variant="ghost" />
            </div>
        );
    }

    // Empty state
    if (isEmpty) {
        return (
            <div className="bookmarks-filters-tab__empty">
                <span>No bookmarks found</span>
                {searchQuery && (
                    <span className="bookmarks-filters-tab__empty-hint">
                        Try a different search term
                    </span>
                )}
            </div>
        );
    }

    // Render bookmark card
    const renderBookmark = (bookmark) => (
        <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onNavigate={handleNavigate}
            onTogglePin={handleTogglePin}
            onDelete={handleDelete}
            onEdit={openEditEditor}
            onDuplicate={(b) => openEditEditor({ ...b, id: null, name: `${b.name} (copy)` })}
            getThumbnailUrl={getThumbnailUrl}
        />
    );

    return (
        <>
            <div className="bookmarks-filters-tab__content">
                {/* Project scope */}
                {activeScopes.includes('project') && (
                    <ScopedSection
                        scope="project"
                        items={bookmarksByScope.project}
                        expanded={expandedSections.project}
                        onToggle={() => toggleSection('project')}
                        renderItem={renderBookmark}
                    />
                )}

                {/* Room/Shared scope */}
                {activeScopes.includes('room') && (
                    <ScopedSection
                        scope="room"
                        items={bookmarksByScope.room}
                        expanded={expandedSections.room}
                        onToggle={() => toggleSection('room')}
                        renderItem={renderBookmark}
                    />
                )}

                {/* Personal scope */}
                {activeScopes.includes('personal') && (
                    <ScopedSection
                        scope="personal"
                        items={bookmarksByScope.personal}
                        expanded={expandedSections.personal}
                        onToggle={() => toggleSection('personal')}
                        renderItem={renderBookmark}
                    />
                )}
            </div>

            {/* Bookmark Editor Modal */}
            <BookmarkEditor
                isOpen={editorOpen}
                bookmark={editingBookmark}
                onSave={handleSave}
                onClose={closeEditor}
                currentCameraState={currentCameraState}
                activeFilterIds={activeFilterIds}
            />
        </>
    );
});

export default BookmarksSubtab;