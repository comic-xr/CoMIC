/**
 * @file TagsDropdown.jsx
 * @description Categorized tag selector dropdown for the Files Tab.
 * Uses portal rendering to escape overflow containers.
 *
 * @example
 * const triggerRef = useRef(null);
 *
 * <button ref={triggerRef} onClick={() => setShowTags(!showTags)}>Tags</button>
 * <TagsDropdown
 *   isOpen={showTags}
 *   onClose={() => setShowTags(false)}
 *   triggerRef={triggerRef}
 *   tags={tags}
 *   tagsByCategory={tagsByCategory}
 *   selectedTags={filters.tagFilters}
 *   onToggleTag={toggleTagFilter}
 * />
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { TagCheckbox } from '@UI/react/components/atoms/TagCheckbox';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { useAdaptive } from '@UI/react/context';
import './TagsDropdown.scss';

/**
 * TagsDropdown - Categorized tag selector (portal-based)
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dropdown is open
 * @param {function} props.onClose - Close handler
 * @param {React.RefObject} props.triggerRef - Ref to trigger element for positioning
 * @param {Array} props.tags - All available tags
 * @param {Object} props.tagsByCategory - Tags grouped by category with counts
 * @param {string[]} props.selectedTags - Currently selected tag IDs
 * @param {function} props.onToggleTag - Toggle tag selection handler
 * @param {boolean} [props.allowCreation=false] - Allow creating new tags
 * @param {function} [props.onCreateTag] - Create tag handler ({ name, categoryId })
 * @param {string} [props.className] - Additional CSS classes
 */
export const TagsDropdown = memo(function TagsDropdown({
    isOpen,
    onClose,
    triggerRef,
    tags,
    tagsByCategory,
    selectedTags,
    onToggleTag,
    allowCreation = false,
    onCreateTag,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const searchInputRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagCategory, setNewTagCategory] = useState('custom');

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setShowCreateForm(false);
            setNewTagName('');
        }
    }, [isOpen]);

    // Filter categories and tags by search query
    const filteredCategories = Object.entries(tagsByCategory || {})
        .map(([catId, catData]) => ({
            ...catData,
            tags: (catData.tags || []).filter(tag =>
                tag.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        }))
        .filter(cat => cat.tags.length > 0);

    // Handle tag creation
    const handleCreate = useCallback(() => {
        if (newTagName.trim() && onCreateTag) {
            onCreateTag({
                name: newTagName.trim(),
                categoryId: newTagCategory,
            });
            setNewTagName('');
            setShowCreateForm(false);
        }
    }, [newTagName, newTagCategory, onCreateTag]);

    const classList = [
        'tags-dropdown',
        isVR && 'tags-dropdown--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <DropdownPortal
            open={isOpen}
            onClose={onClose}
            triggerRef={triggerRef}
            align="start"
            position="bottom"
            offset={4}
            className={classList}
        >
            <div className="tags-dropdown__container">
                {/* Search */}
                <div className="tags-dropdown__search">
                    <SearchInput
                        ref={searchInputRef}
                        className="tags-dropdown__search-input"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search tags..."
                        size="sm"
                    />
                </div>

                {/* Tag list by category */}
                <div className="tags-dropdown__content">
                    {filteredCategories.map(category => (
                        <div key={category.id} className="tags-dropdown__category">
                            <div
                                className="tags-dropdown__category-header"
                                style={{ color: category.color }}
                            >
                                {category.label}
                            </div>
                            {category.tags.map(tag => (
                                <TagCheckbox
                                    key={tag.id}
                                    tag={tag}
                                    category={category}
                                    checked={selectedTags.includes(tag.id)}
                                    count={tag.count}
                                    onChange={onToggleTag}
                                />
                            ))}
                        </div>
                    ))}

                    {/* Empty state */}
                    {filteredCategories.length === 0 && (
                        <div className="tags-dropdown__empty">
                            {searchQuery
                                ? `No tags match "${searchQuery}"`
                                : 'No tags available'
                            }
                        </div>
                    )}
                </div>

                {/* Create new tag */}
                {allowCreation && (
                    <div className="tags-dropdown__create">
                        {!showCreateForm ? (
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(true)}
                                className="tags-dropdown__create-button"
                            >
                                <Icon name="plus" size={12} />
                                <span>New Tag</span>
                            </button>
                        ) : (
                            <div className="tags-dropdown__create-form">
                                <input
                                    type="text"
                                    placeholder="Tag name..."
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    autoFocus
                                    className="tags-dropdown__create-input"
                                />
                                <select
                                    value={newTagCategory}
                                    onChange={(e) => setNewTagCategory(e.target.value)}
                                    className="tags-dropdown__create-select"
                                >
                                    {Object.values(tagsByCategory || {}).map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="tags-dropdown__create-actions">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="tags-dropdown__create-cancel"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreate}
                                        disabled={!newTagName.trim()}
                                        className="tags-dropdown__create-submit"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DropdownPortal>
    );
});

export default TagsDropdown;
